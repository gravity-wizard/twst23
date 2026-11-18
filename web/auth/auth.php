<?php
declare(strict_types=1);

error_reporting(E_ALL);
ini_set('display_errors', '0');

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

require_once __DIR__ . '/guard.php';

function tw23_json_body(): array {
    $raw = file_get_contents('php://input');
    if ($raw === false || trim($raw) === '') {
        return $_POST ?: [];
    }
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : ($_POST ?: []);
}

function tw23_respond(array $payload, int $status = 200): never {
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_SLASHES);
    exit;
}

function tw23_mask_email(string $email): string {
    $parts = explode('@', trim($email));
    if (count($parts) !== 2) return '***';
    $local = $parts[0];
    $domain = $parts[1];
    $vis = strlen($local) <= 2 ? substr($local, 0, 1) : substr($local, 0, 2);
    return $vis . str_repeat('*', max(2, min(5, strlen($local) - strlen($vis)))) . '@' . $domain;
}

function tw23_rate_check(string $bucket, int $maxAttempts, int $windowSec, bool $recordNow = false): bool {
    $file = tw23_data_dir() . '/rate_limits.runtime.json';
    $store = tw23_read_json($file, []);
    $now = time();
    $ipHash = substr(hash('sha256', 'tw23rl:' . ($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0')), 0, 14);
    $key = $bucket . ':' . $ipHash;

    // Prune stale keys
    foreach ($store as $k => $timestamps) {
        if (!is_array($timestamps)) {
            unset($store[$k]);
            continue;
        }
        $filtered = array_values(array_filter($timestamps, fn($ts) => ($now - (int)$ts) < 3600));
        if (empty($filtered)) {
            unset($store[$k]);
        } else {
            $store[$k] = $filtered;
        }
    }

    $recent = array_values(array_filter($store[$key] ?? [], fn($ts) => ($now - (int)$ts) < $windowSec));
    if (count($recent) >= $maxAttempts) {
        tw23_write_json($file, $store);
        return false;
    }
    if ($recordNow) {
        $recent[] = $now;
        $store[$key] = $recent;
        tw23_write_json($file, $store);
    }
    return true;
}

function tw23_rate_record(string $bucket): void {
    tw23_rate_check($bucket, 999999, 3600, true);
}

function &tw23_find_user_ref(array &$users, string $identity): ?array {
    $clean = strtolower(trim($identity));
    $nullRef = null;
    if ($clean === '') return $nullRef;

    foreach ($users as &$u) {
        if (($u['username_clean'] ?? strtolower((string)($u['username'] ?? ''))) === $clean) {
            return $u;
        }
        if (!empty($u['email']) && strtolower(trim((string)$u['email'])) === $clean) {
            return $u;
        }
        foreach (($u['alt_emails'] ?? []) as $alt) {
            if (strtolower(trim((string)$alt)) === $clean) {
                return $u;
            }
        }
    }
    return $nullRef;
}

function tw23_read_audit_logs(int $limit = 100): array {
    $logFile = tw23_data_dir() . '/audit_log.jsonl';
    if (!is_file($logFile)) return [];
    $lines = file($logFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [];
    $slice = array_slice($lines, -$limit);
    $entries = [];
    foreach (array_reverse($slice) as $line) {
        $decoded = json_decode($line, true);
        if (is_array($decoded)) {
            $entries[] = $decoded;
        }
    }
    return $entries;
}

$action = trim((string)($_GET['action'] ?? 'check_session'));
$method = strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET'));
$usersFile = tw23_data_dir() . '/users.runtime.json';

// ============================================================================
// 1. CHECK SESSION & WHO IS ONLINE
// ============================================================================
if ($action === 'check_session') {
    $touchPage = isset($_GET['page']) ? trim((string)$_GET['page']) : null;
    $ctx = tw23_current_session($touchPage);
    $online = tw23_who_is_online();
    if ($ctx) {
        tw23_respond([
            'status' => 'authenticated',
            'user' => tw23_sanitize_user($ctx['user'], true),
            'csrf_token' => $ctx['session']['csrf_token'] ?? '',
            'session_via' => $ctx['session']['auth_via'] ?? 'password',
            'online' => $online,
        ]);
    }
    tw23_respond([
        'status' => 'guest',
        'user' => null,
        'online' => $online,
    ]);
}

// ============================================================================
// 2. PASSWORD SIGN-IN
// ============================================================================
if ($action === 'login' && $method === 'POST') {
    if (!tw23_rate_check('login_fail', 10, 600)) {
        tw23_respond(['status' => 'error', 'message' => 'Too many failed login attempts. Please wait 10 minutes or use a 6-digit Email Code.'], 429);
    }

    $body = tw23_json_body();
    $identity = trim((string)($body['username'] ?? $body['identity'] ?? ''));
    $password = (string)($body['password'] ?? '');
    $remember = !array_key_exists('remember', $body) || !empty($body['remember']);
    $hideOnline = !empty($body['hide_online']);

    if ($identity === '') {
        tw23_respond(['status' => 'error', 'message' => 'Please enter your Call-Sign or email address.'], 400);
    }

    $uStore = tw23_seed_users_if_needed();
    $u = &tw23_find_user_ref($uStore['users'], $identity);
    if (!$u) {
        tw23_rate_record('login_fail');
        tw23_audit_log('LOGIN_FAIL', $identity, 'Unknown username/email');
        tw23_respond(['status' => 'error', 'message' => 'Invalid Call-Sign or passcode.'], 401);
    }

    if (($u['role'] ?? '') === 'banned') {
        tw23_audit_log('LOGIN_BLOCKED', $u['username'], 'Suspended account');
        tw23_respond(['status' => 'error', 'message' => 'This account is currently suspended.'], 403);
    }

    if (empty($u['password_hash'])) {
        tw23_respond([
            'status' => 'otp_required',
            'username' => $u['username'],
            'masked_email' => tw23_mask_email((string)($u['email'] ?? '')),
            'message' => "Account '{$u['username']}' has not set a passcode yet. Click '📧 Send 6-Digit Email Code' to sign in and set your permanent passcode!",
        ]);
    }

    if ($password === '' || !password_verify($password, (string)$u['password_hash'])) {
        tw23_rate_record('login_fail');
        tw23_audit_log('LOGIN_FAIL', $u['username'], 'Wrong password');
        tw23_respond(['status' => 'error', 'message' => 'Invalid Call-Sign or passcode.'], 401);
    }

    $u['last_visit'] = gmdate('c');
    tw23_write_json($usersFile, $uStore);
    $sess = tw23_create_session((int)$u['id'], $remember, $hideOnline, 'password');
    tw23_audit_log('LOGIN_OK', $u['username'], 'Password sign-in');

    tw23_respond([
        'status' => 'success',
        'user' => tw23_sanitize_user($u, true),
        'csrf_token' => $sess['csrf_token'],
    ]);
}

// ============================================================================
// 3. REQUEST 6-DIGIT EMAIL LOGIN / PASSWORD-RESET CODE (OTP)
// ============================================================================
if ($action === 'request_code' && $method === 'POST') {
    if (!tw23_rate_check('otp_send', 5, 600)) {
        tw23_respond(['status' => 'error', 'message' => 'Please wait a few minutes before requesting another login code.'], 429);
    }

    $body = tw23_json_body();
    $identity = trim((string)($body['identity'] ?? $body['username'] ?? ''));
    if ($identity === '') {
        tw23_respond(['status' => 'error', 'message' => 'Enter your Call-Sign (e.g. Gary or A7si) or registered email address.'], 400);
    }

    $uStore = tw23_seed_users_if_needed();
    $u = &tw23_find_user_ref($uStore['users'], $identity);
    if (!$u) {
        tw23_rate_record('otp_send');
        tw23_respond(['status' => 'error', 'message' => 'No account matched that Call-Sign or email address.'], 404);
    }
    if (($u['role'] ?? '') === 'banned') {
        tw23_respond(['status' => 'error', 'message' => 'This account is suspended.'], 403);
    }

    $recipients = array_values(array_unique(array_filter(array_merge(
        [!empty($u['email']) ? (string)$u['email'] : ''],
        is_array($u['alt_emails'] ?? null) ? $u['alt_emails'] : []
    ))));

    if (empty($recipients)) {
        tw23_respond([
            'status' => 'error',
            'message' => "Account '{$u['username']}' does not have an email address on file. Please sign in with your passcode.",
        ], 400);
    }

    $code = str_pad((string)random_int(0, 999999), 6, '0', STR_PAD_LEFT);
    $otpFile = tw23_data_dir() . '/otp_codes.runtime.json';
    $otpStore = tw23_read_json($otpFile, ['codes' => []]);
    $now = time();
    $codes = array_values(array_filter(
        $otpStore['codes'] ?? [],
        fn($row) => ($row['expires_at'] ?? 0) > $now && (int)($row['user_id'] ?? 0) !== (int)$u['id']
    ));

    $codes[] = [
        'user_id' => (int)$u['id'],
        'username' => $u['username'],
        'code_hash' => password_hash($code, PASSWORD_BCRYPT),
        'created_at' => $now,
        'expires_at' => $now + 900, // 15 minutes
        'attempts' => 0,
    ];
    tw23_write_json($otpFile, ['codes' => $codes]);
    tw23_rate_record('otp_send');

    $subject = "Twisted23 Login Code: {$code} ({$u['username']})";
    $mailText = "Greetings {$u['username']} [{$u['base38_id']}],\n\n"
              . "Your 6-digit Twisted23 UniversaL Universe & GwCrm verification code is:\n\n"
              . "    {$code}\n\n"
              . "This code is valid for 15 minutes.\n"
              . "Enter it in the Login / User ControL PaneL (https://twisted23.com/ucp/?mode=login) or GwCrm gate to sign in and optionally set or update your permanent passcode.\n\n"
              . "— Twisted23 Gatekeeper (media@twisted23.com)";

    $sentOk = tw23_send_mail($recipients, $subject, $mailText);
    $masked = tw23_mask_email($recipients[0]);
    tw23_audit_log('OTP_SENT', $u['username'], $sentOk ? "Dispatched 6-digit code to {$masked}" : "Failed dispatch to {$masked}");

    if (!$sentOk) {
        tw23_respond(['status' => 'error', 'message' => 'Mail relay could not dispatch verification code right now.'], 502);
    }

    tw23_respond([
        'status' => 'success',
        'username' => $u['username'],
        'masked_email' => $masked,
        'message' => "6-digit code sent to {$masked}! Valid for 15 minutes.",
    ]);
}

// ============================================================================
// 4. VERIFY 6-DIGIT EMAIL CODE & OPTIONAL PASSWORD SET/RESET
// ============================================================================
if ($action === 'verify_code' && $method === 'POST') {
    $body = tw23_json_body();
    $identity = trim((string)($body['identity'] ?? $body['username'] ?? ''));
    $code = preg_replace('/\D/', '', (string)($body['code'] ?? ''));
    $newPassword = (string)($body['new_password'] ?? '');
    $remember = !array_key_exists('remember', $body) || !empty($body['remember']);
    $hideOnline = !empty($body['hide_online']);

    if ($identity === '' || strlen($code) !== 6) {
        tw23_respond(['status' => 'error', 'message' => 'Enter your Call-Sign/email and the 6-digit verification code.'], 400);
    }

    $uStore = tw23_seed_users_if_needed();
    $u = &tw23_find_user_ref($uStore['users'], $identity);
    if (!$u) {
        tw23_respond(['status' => 'error', 'message' => 'Account not found.'], 404);
    }

    $otpFile = tw23_data_dir() . '/otp_codes.runtime.json';
    $otpStore = tw23_read_json($otpFile, ['codes' => []]);
    $codes = $otpStore['codes'] ?? [];
    $now = time();
    $matchedIdx = null;

    foreach ($codes as $idx => &$entry) {
        if ((int)($entry['user_id'] ?? 0) === (int)$u['id']) {
            if (($entry['expires_at'] ?? 0) <= $now) {
                unset($codes[$idx]);
                tw23_write_json($otpFile, ['codes' => array_values($codes)]);
                tw23_respond(['status' => 'error', 'message' => 'That code has expired. Request a fresh 6-digit code.'], 401);
            }
            if ((int)($entry['attempts'] ?? 0) >= 5) {
                unset($codes[$idx]);
                tw23_write_json($otpFile, ['codes' => array_values($codes)]);
                tw23_respond(['status' => 'error', 'message' => 'Too many invalid attempts. Request a fresh 6-digit code.'], 429);
            }
            if (!password_verify($code, (string)($entry['code_hash'] ?? ''))) {
                $entry['attempts'] = (int)($entry['attempts'] ?? 0) + 1;
                tw23_write_json($otpFile, ['codes' => array_values($codes)]);
                tw23_audit_log('OTP_FAIL', $u['username'], 'Invalid 6-digit code');
                tw23_respond(['status' => 'error', 'message' => 'Incorrect 6-digit code. Please double-check your inbox.'], 401);
            }
            $matchedIdx = $idx;
            break;
        }
    }
    unset($entry);

    if ($matchedIdx === null) {
        tw23_respond(['status' => 'error', 'message' => 'No active login code found. Click Send 6-Digit Code first.'], 400);
    }

    unset($codes[$matchedIdx]);
    tw23_write_json($otpFile, ['codes' => array_values($codes)]);

    $pwNote = '';
    if ($newPassword !== '') {
        if (strlen($newPassword) < 6) {
            tw23_respond(['status' => 'error', 'message' => 'New passcode must be at least 6 characters.'], 400);
        }
        $u['password_hash'] = password_hash($newPassword, PASSWORD_BCRYPT);
        $pwNote = ' + password updated';
    }

    $u['last_visit'] = gmdate('c');
    tw23_write_json($usersFile, $uStore);
    $sess = tw23_create_session((int)$u['id'], $remember, $hideOnline, 'otp');
    tw23_audit_log('LOGIN_OTP', $u['username'], '6-digit email OTP sign-in' . $pwNote);

    tw23_respond([
        'status' => 'success',
        'user' => tw23_sanitize_user($u, true),
        'csrf_token' => $sess['csrf_token'],
    ]);
}

// ============================================================================
// 5. MEMBER SELF-REGISTRATION
// ============================================================================
if ($action === 'register' && $method === 'POST') {
    if (!tw23_rate_check('register', 5, 3600)) {
        tw23_respond(['status' => 'error', 'message' => 'Registration rate limit reached from this network. Please try again shortly.'], 429);
    }

    $body = tw23_json_body();
    $username = trim((string)($body['username'] ?? ''));
    $password = (string)($body['password'] ?? '');
    $email = strtolower(trim((string)($body['email'] ?? '')));
    $archetype = substr(trim((string)($body['archetype'] ?? 'eLeven eLve Explorer')), 0, 40);
    $location = substr(trim((string)($body['location'] ?? '')), 0, 48);
    $preferredAxle = in_array($body['preferred_axle'] ?? '34', ['34', '25', '16'], true) ? $body['preferred_axle'] : '34';

    if (!preg_match('/^[A-Za-z0-9_\-]{3,24}$/', $username)) {
        tw23_respond(['status' => 'error', 'message' => 'Call-Sign must be 3–24 characters using letters, numbers, underscores, or hyphens.'], 400);
    }
    if (strlen($password) < 6) {
        tw23_respond(['status' => 'error', 'message' => 'Passcode must be at least 6 characters.'], 400);
    }
    if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        tw23_respond(['status' => 'error', 'message' => 'Please enter a valid email address (or leave optional email blank).'], 400);
    }

    $uStore = tw23_seed_users_if_needed();
    $clean = strtolower($username);
    $existingIds = [];
    foreach ($uStore['users'] as $existing) {
        $existingIds[$existing['base38_id'] ?? ''] = true;
        if (($existing['username_clean'] ?? strtolower($existing['username'])) === $clean) {
            tw23_respond(['status' => 'error', 'message' => "Call-Sign '{$username}' is already enrolled in the Parlour."], 409);
        }
        if ($email !== '') {
            if (strtolower((string)($existing['email'] ?? '')) === $email || in_array($email, array_map('strtolower', $existing['alt_emails'] ?? []), true)) {
                tw23_respond(['status' => 'error', 'message' => 'That email address is already linked to a Parlour account.'], 409);
            }
        }
    }

    $base38 = tw23_base38_ident();
    $attemptOffset = 0;
    while (isset($existingIds[$base38])) {
        $attemptOffset++;
        $base38 = tw23_base38_ident(time() + $attemptOffset);
    }

    $newId = (int)($uStore['next_id'] ?? (count($uStore['users']) + 2));
    $uStore['next_id'] = $newId + 1;
    $nowIso = gmdate('c');

    $newUser = [
        'id' => $newId,
        'username' => $username,
        'username_clean' => $clean,
        'email' => $email,
        'alt_emails' => [],
        'password_hash' => password_hash($password, PASSWORD_BCRYPT),
        'role' => 'member',
        'archetype' => $archetype ?: 'eLeven eLve Explorer',
        'custom_title' => 'Registered Parlour Member',
        'badge' => '🧝',
        'base38_id' => $base38,
        'location' => $location,
        'website' => '',
        'favorite_game' => 'Twisted 23 Slider',
        'preferred_axle' => $preferredAxle,
        'bio' => '',
        'signature' => '',
        'joined_at' => $nowIso,
        'last_visit' => $nowIso,
        'prefs' => [
            'hide_online' => false,
            'allow_challenges' => true,
            'sound_fx' => true,
            'default_pace' => 'turtle',
        ],
        'stats' => [
            'backgammon_elo' => 1200,
            'backgammon_wins' => 0,
            'backgammon_games' => 0,
            'botchee_best' => 0,
            'tophat_elo' => 1200,
            'tophat_solved' => 0,
            'fd_unlocked' => 1,
            'slider_best_moves' => 0,
        ],
    ];

    $uStore['users'][] = $newUser;
    tw23_write_json($usersFile, $uStore);
    tw23_rate_record('register');

    $sess = tw23_create_session($newId, true, false, 'register');
    tw23_audit_log('REGISTER', $username, "Enrolled Base-38 ID {$base38}");

    tw23_respond([
        'status' => 'success',
        'user' => tw23_sanitize_user($newUser, true),
        'csrf_token' => $sess['csrf_token'],
    ]);
}

// ============================================================================
// 6. LOGOUT
// ============================================================================
if ($action === 'logout') {
    $rawToken = tw23_get_cookie_token();
    if (strlen($rawToken) >= 32) {
        $tokenHash = hash('sha256', $rawToken);
        $sessionsFile = tw23_data_dir() . '/sessions.runtime.json';
        $store = tw23_read_json($sessionsFile, ['sessions' => []]);
        $filtered = array_values(array_filter(
            $store['sessions'] ?? [],
            fn($s) => !hash_equals((string)($s['token_hash'] ?? ''), $tokenHash)
        ));
        tw23_write_json($sessionsFile, ['sessions' => $filtered]);
    }
    tw23_clear_session_cookie();
    tw23_respond(['status' => 'success']);
}

// ============================================================================
// 7. PUBLIC MEMBERLIST & VIEW PROFILE (phpBB memberlist.php style)
// ============================================================================
if ($action === 'memberlist' && $method === 'GET') {
    $uStore = tw23_seed_users_if_needed();
    $online = tw23_who_is_online();
    $onlineById = [];
    foreach ($online['users'] as $ou) {
        $onlineById[(int)$ou['id']] = $ou['page'] ?? '/';
    }

    $members = [];
    $newestMember = null;
    foreach ($uStore['users'] as $u) {
        if (($u['role'] ?? '') === 'banned') continue;
        $san = tw23_sanitize_user($u, false);
        $san['is_online'] = isset($onlineById[$san['id']]);
        $san['current_page'] = $onlineById[$san['id']] ?? null;
        $members[] = $san;
        if (!$newestMember || strcmp((string)$u['joined_at'], (string)$newestMember['joined_at']) > 0) {
            $newestMember = ['id' => $san['id'], 'username' => $san['username'], 'base38_id' => $san['base38_id'], 'joined_at' => $san['joined_at'], 'color' => $san['group_color']];
        }
    }

    usort($members, function ($a, $b) {
        $ra = tw23_role_meta($a['role'])['rank_order'];
        $rb = tw23_role_meta($b['role'])['rank_order'];
        if ($ra !== $rb) return $ra <=> $rb;
        return $a['id'] <=> $b['id'];
    });

    tw23_respond([
        'status' => 'success',
        'members' => $members,
        'online' => $online,
        'board_stats' => [
            'total_members' => count($members),
            'newest_member' => $newestMember,
            'base38_now' => tw23_base38_ident(),
        ],
    ]);
}

if ($action === 'view_profile' && $method === 'GET') {
    $query = trim((string)($_GET['u'] ?? ''));
    if ($query === '') {
        tw23_respond(['status' => 'error', 'message' => 'Member parameter ?u= required.'], 400);
    }
    $uStore = tw23_seed_users_if_needed();
    $online = tw23_who_is_online();
    $onlineById = [];
    foreach ($online['users'] as $ou) {
        $onlineById[(int)$ou['id']] = $ou['page'] ?? '/';
    }

    $qLower = strtolower($query);
    foreach ($uStore['users'] as $u) {
        if (($u['role'] ?? '') === 'banned') continue;
        $match = ((string)($u['id'] ?? '') === $query)
              || (($u['username_clean'] ?? strtolower($u['username'])) === $qLower)
              || (strtolower((string)($u['base38_id'] ?? '')) === $qLower);
        if ($match) {
            $san = tw23_sanitize_user($u, false);
            $san['is_online'] = isset($onlineById[$san['id']]);
            $san['current_page'] = $onlineById[$san['id']] ?? null;
            tw23_respond(['status' => 'success', 'profile' => $san, 'online' => $online]);
        }
    }
    tw23_respond(['status' => 'error', 'message' => 'Parlour member not found.'], 404);
}

// ============================================================================
// 8. UCP AUTHENTICATED ACTIONS (Profile, Prefs, Account, Stats, Sessions)
// ============================================================================
if (in_array($action, ['update_profile', 'update_prefs', 'update_account', 'sync_stats', 'sessions', 'revoke_session'], true)) {
    $ctx = tw23_current_session('/ucp/');
    if (!$ctx) {
        tw23_respond(['status' => 'error', 'auth_required' => true, 'message' => 'Please sign in to access your User ControL PaneL.'], 401);
    }
    $uid = (int)$ctx['user']['id'];

    if ($action === 'sessions' && $method === 'GET') {
        $sessionsFile = tw23_data_dir() . '/sessions.runtime.json';
        $store = tw23_read_json($sessionsFile, ['sessions' => []]);
        $curSid = $ctx['session']['sid_id'] ?? '';
        $mine = [];
        foreach (($store['sessions'] ?? []) as $s) {
            if ((int)($s['user_id'] ?? 0) === $uid) {
                $mine[] = [
                    'sid_id' => $s['sid_id'] ?? '',
                    'created_at' => $s['created_at'] ?? 0,
                    'last_active' => $s['last_active'] ?? 0,
                    'expires_at' => $s['expires_at'] ?? 0,
                    'current_page' => $s['current_page'] ?? '/',
                    'ua' => $s['ua'] ?? 'Browser',
                    'auth_via' => $s['auth_via'] ?? 'password',
                    'remember' => !empty($s['remember']),
                    'is_current' => ($s['sid_id'] ?? '') === $curSid,
                ];
            }
        }
        usort($mine, fn($a, $b) => ($b['last_active'] ?? 0) <=> ($a['last_active'] ?? 0));
        tw23_respond(['status' => 'success', 'sessions' => $mine]);
    }

    if ($action === 'revoke_session' && $method === 'POST') {
        $body = tw23_json_body();
        $targetSid = trim((string)($body['sid_id'] ?? ''));
        $allOthers = !empty($body['all_others']);
        $curSid = $ctx['session']['sid_id'] ?? '';
        $sessionsFile = tw23_data_dir() . '/sessions.runtime.json';
        $store = tw23_read_json($sessionsFile, ['sessions' => []]);
        $kept = [];
        foreach (($store['sessions'] ?? []) as $s) {
            $sUid = (int)($s['user_id'] ?? 0);
            $sSid = (string)($s['sid_id'] ?? '');
            if ($sUid === $uid) {
                if ($allOthers && $sSid !== $curSid) continue;
                if ($targetSid !== '' && $sSid === $targetSid) continue;
            }
            $kept[] = $s;
        }
        tw23_write_json($sessionsFile, ['sessions' => $kept]);
        tw23_audit_log('SESSION_REVOKE', $ctx['user']['username'], $allOthers ? 'Revoked all other sessions' : "Revoked {$targetSid}");
        tw23_respond(['status' => 'success']);
    }

    $uStore = tw23_seed_users_if_needed();
    $userRef = null;
    foreach ($uStore['users'] as &$item) {
        if ((int)($item['id'] ?? 0) === $uid) {
            $userRef = &$item;
            break;
        }
    }
    unset($item);
    if (!$userRef) {
        tw23_respond(['status' => 'error', 'message' => 'User record missing.'], 404);
    }

    $body = tw23_json_body();
    $roleMeta = tw23_role_meta($userRef['role'] ?? 'member');

    if ($action === 'update_profile' && $method === 'POST') {
        $allowedBadges = ['👑', '🛡️', '🦉', '⚖️', '🧝', '🎲', '🐸', '🐬', '🎩', '🌀', '🥚', '🦀', '🌙', '🚀', '⚡'];
        if (isset($body['badge']) && in_array($body['badge'], $allowedBadges, true)) {
            $userRef['badge'] = $body['badge'];
        }
        if (isset($body['archetype'])) {
            $userRef['archetype'] = substr(trim(strip_tags((string)$body['archetype'])), 0, 40);
        }
        if (isset($body['custom_title'])) {
            $ct = substr(trim(strip_tags((string)$body['custom_title'])), 0, 48);
            if (!$roleMeta['is_staff'] && preg_match('/\b(founder|admin|administrator|moderator|staff)\b/i', $ct)) {
                tw23_respond(['status' => 'error', 'message' => 'Staff rank titles are reserved for Parlour Staff.'], 400);
            }
            if ($ct !== '') $userRef['custom_title'] = $ct;
        }
        if (isset($body['location'])) {
            $userRef['location'] = substr(trim(strip_tags((string)$body['location'])), 0, 48);
        }
        if (isset($body['website'])) {
            $w = trim((string)$body['website']);
            if ($w === '') {
                $userRef['website'] = '';
            } elseif (preg_match('#^https?://[^\s<>"]+$#i', $w) && strlen($w) <= 120) {
                $userRef['website'] = $w;
            } else {
                tw23_respond(['status' => 'error', 'message' => 'Website must start with https:// or http://'], 400);
            }
        }
        if (isset($body['favorite_game'])) {
            $userRef['favorite_game'] = substr(trim(strip_tags((string)$body['favorite_game'])), 0, 48);
        }
        if (isset($body['preferred_axle']) && in_array($body['preferred_axle'], ['34', '25', '16'], true)) {
            $userRef['preferred_axle'] = $body['preferred_axle'];
        }
        if (isset($body['bio'])) {
            $userRef['bio'] = substr(trim(strip_tags((string)$body['bio'])), 0, 300);
        }
        if (isset($body['signature'])) {
            $userRef['signature'] = substr(trim(strip_tags((string)$body['signature'])), 0, 220);
        }

        tw23_write_json($usersFile, $uStore);
        tw23_audit_log('PROFILE_EDIT', $userRef['username'], 'Updated UCP ProfiLe & signature');
        tw23_respond(['status' => 'success', 'user' => tw23_sanitize_user($userRef, true), 'message' => 'ProfiLe & Signature saved!']);
    }

    if ($action === 'update_prefs' && $method === 'POST') {
        $prefs = is_array($userRef['prefs'] ?? null) ? $userRef['prefs'] : [];
        if (array_key_exists('hide_online', $body)) $prefs['hide_online'] = !empty($body['hide_online']);
        if (array_key_exists('allow_challenges', $body)) $prefs['allow_challenges'] = !empty($body['allow_challenges']);
        if (array_key_exists('sound_fx', $body)) $prefs['sound_fx'] = !empty($body['sound_fx']);
        if (isset($body['default_pace']) && in_array($body['default_pace'], ['snail', 'turtle', 'rabbit'], true)) {
            $prefs['default_pace'] = $body['default_pace'];
        }
        $userRef['prefs'] = $prefs;
        tw23_write_json($usersFile, $uStore);

        // Sync current session hide_online flag immediately
        $sessionsFile = tw23_data_dir() . '/sessions.runtime.json';
        $sStore = tw23_read_json($sessionsFile, ['sessions' => []]);
        foreach ($sStore['sessions'] as &$s) {
            if (($s['sid_id'] ?? '') === ($ctx['session']['sid_id'] ?? '')) {
                $s['hide_online'] = !empty($prefs['hide_online']);
            }
        }
        unset($s);
        tw23_write_json($sessionsFile, $sStore);

        tw23_respond(['status' => 'success', 'user' => tw23_sanitize_user($userRef, true), 'message' => 'Board & Universe preferences updated!']);
    }

    if ($action === 'update_account' && $method === 'POST') {
        $currentPw = (string)($body['current_password'] ?? '');
        $newEmail = array_key_exists('email', $body) ? strtolower(trim((string)$body['email'])) : null;
        $newPw = (string)($body['new_password'] ?? '');

        $recentOtp = (($ctx['session']['auth_via'] ?? '') === 'otp')
                  && ((time() - (int)($ctx['session']['created_at'] ?? 0)) < 1800);
        $needsCurrentPw = !empty($userRef['password_hash']) && !$recentOtp;

        if ($needsCurrentPw && ($currentPw === '' || !password_verify($currentPw, (string)$userRef['password_hash']))) {
            tw23_respond(['status' => 'error', 'message' => 'Enter your current passcode (or sign in with a fresh 6-digit Email Code) to change account credentials.'], 401);
        }

        if ($newEmail !== null) {
            if ($newEmail !== '' && !filter_var($newEmail, FILTER_VALIDATE_EMAIL)) {
                tw23_respond(['status' => 'error', 'message' => 'Please enter a valid email address.'], 400);
            }
            if ($newEmail !== '') {
                foreach ($uStore['users'] as $other) {
                    if ((int)$other['id'] === $uid) continue;
                    if (strtolower((string)($other['email'] ?? '')) === $newEmail) {
                        tw23_respond(['status' => 'error', 'message' => 'That email address is already used by another account.'], 409);
                    }
                }
            }
            $userRef['email'] = $newEmail;
        }

        if ($newPw !== '') {
            if (strlen($newPw) < 6) {
                tw23_respond(['status' => 'error', 'message' => 'New passcode must be at least 6 characters.'], 400);
            }
            $userRef['password_hash'] = password_hash($newPw, PASSWORD_BCRYPT);
        }

        tw23_write_json($usersFile, $uStore);
        tw23_audit_log('ACCOUNT_EDIT', $userRef['username'], 'Updated email / passcode');
        tw23_respond(['status' => 'success', 'user' => tw23_sanitize_user($userRef, true), 'message' => 'Account security settings updated!']);
    }

    if ($action === 'sync_stats' && $method === 'POST') {
        $incoming = is_array($body['stats'] ?? null) ? $body['stats'] : $body;
        $cur = is_array($userRef['stats'] ?? null) ? $userRef['stats'] : [];

        foreach (['backgammon_wins', 'backgammon_games', 'botchee_best', 'tophat_solved', 'fd_unlocked'] as $maxField) {
            if (isset($incoming[$maxField])) {
                $val = max(0, min(999999, (int)$incoming[$maxField]));
                $cur[$maxField] = max((int)($cur[$maxField] ?? 0), $val);
            }
        }
        foreach (['backgammon_elo', 'tophat_elo'] as $eloField) {
            if (isset($incoming[$eloField])) {
                $val = (int)$incoming[$eloField];
                if ($val >= 800 && $val <= 2800 && $val !== 1200) {
                    $cur[$eloField] = max((int)($cur[$eloField] ?? 1200), $val);
                }
            }
        }
        if (isset($incoming['slider_best_moves'])) {
            $m = (int)$incoming['slider_best_moves'];
            if ($m > 0 && $m < 10000) {
                $existingM = (int)($cur['slider_best_moves'] ?? 0);
                $cur['slider_best_moves'] = ($existingM <= 0) ? $m : min($existingM, $m);
            }
        }

        $userRef['stats'] = $cur;
        tw23_write_json($usersFile, $uStore);
        tw23_respond(['status' => 'success', 'stats' => $cur, 'user' => tw23_sanitize_user($userRef, true)]);
    }
}

// ============================================================================
// 9. ADMINISTRATION CONTROL PANEL — ACP (phpBB adm/index.php style)
// ============================================================================
if (str_starts_with($action, 'acp_')) {
    $ctx = tw23_require_admin_json();
    $actor = $ctx['user'];
    $actorIsFounder = (($actor['role'] ?? '') === 'founder');

    if ($action === 'acp_overview' && $method === 'GET') {
        $uStore = tw23_seed_users_if_needed();
        $roleCounts = ['founder' => 0, 'admin' => 0, 'moderator' => 0, 'wizard' => 0, 'member' => 0, 'banned' => 0];
        $newest = null;
        foreach ($uStore['users'] as $u) {
            $r = $u['role'] ?? 'member';
            $roleCounts[$r] = ($roleCounts[$r] ?? 0) + 1;
            if ($r !== 'banned' && (!$newest || strcmp((string)$u['joined_at'], (string)$newest['joined_at']) > 0)) {
                $newest = ['id' => $u['id'], 'username' => $u['username'], 'base38_id' => $u['base38_id']];
            }
        }

        // Read GwCrm summary without mutating
        $crmDir = dirname(__DIR__) . '/crm/data';
        $crmSeed = tw23_read_json($crmDir . '/crm.json', ['contacts' => [], 'derbies' => [], 'triage' => []]);
        $crmRt = tw23_read_json($crmDir . '/crm.runtime.json', []);
        $contacts = !empty($crmRt['contacts']) ? $crmRt['contacts'] : ($crmSeed['contacts'] ?? []);
        $crmSummary = [
            'total_contacts' => count($contacts),
            'queued' => 0,
            'sent' => 0,
            'auto_ack' => 0,
            'human_replies' => 0,
            'bounced' => 0,
            'open_triage' => count(array_filter(($crmRt['triage'] ?? $crmSeed['triage'] ?? []), fn($t) => ($t['status'] ?? '') !== 'Resolved')),
            'derby_items' => count($crmRt['derbies'] ?? $crmSeed['derbies'] ?? []),
        ];
        foreach ($contacts as $c) {
            $st = (string)($c['stage'] ?? 'Queued');
            if ($st === 'Queued') $crmSummary['queued']++;
            elseif (str_starts_with($st, 'Sent')) $crmSummary['sent']++;
            elseif ($st === 'Auto-Acknowledged') $crmSummary['auto_ack']++;
            elseif ($st === 'Received Reply' || $st === 'Featured') $crmSummary['human_replies']++;
            elseif ($st === 'Bounced') $crmSummary['bounced']++;
        }

        // Backgammon rooms summary
        $bgRooms = glob(dirname(__DIR__) . '/backgammon/data/rooms/*.json') ?: [];
        $activeRooms24h = 0;
        $now = time();
        foreach ($bgRooms as $rf) {
            if (($now - (int)@filemtime($rf)) < 86400) $activeRooms24h++;
        }

        tw23_respond([
            'status' => 'success',
            'actor' => tw23_sanitize_user($actor, true),
            'online' => tw23_who_is_online(),
            'board' => [
                'total_users' => count($uStore['users']),
                'role_counts' => $roleCounts,
                'newest_member' => $newest,
                'base38_now' => tw23_base38_ident(),
            ],
            'gwcrm' => $crmSummary,
            'backgammon' => [
                'total_rooms' => count($bgRooms),
                'active_24h' => $activeRooms24h,
            ],
            'system' => [
                'php_version' => PHP_VERSION,
                'server_utc' => gmdate('Y-m-d H:i:s \U\T\C'),
                'auth_data_writable' => is_writable(tw23_data_dir()),
                'crm_data_writable' => is_dir($crmDir) && is_writable($crmDir),
            ],
            'recent_logs' => tw23_read_audit_logs(40),
        ]);
    }

    if ($action === 'acp_users' && $method === 'GET') {
        $uStore = tw23_seed_users_if_needed();
        $list = [];
        foreach ($uStore['users'] as $u) {
            $list[] = tw23_sanitize_user($u, true);
        }
        usort($list, fn($a, $b) => $a['id'] <=> $b['id']);
        tw23_respond(['status' => 'success', 'users' => $list]);
    }

    if ($action === 'acp_update_user' && $method === 'POST') {
        $body = tw23_json_body();
        $targetId = (int)($body['id'] ?? 0);
        $uStore = tw23_seed_users_if_needed();

        foreach ($uStore['users'] as &$u) {
            if ((int)$u['id'] !== $targetId) continue;

            if (($u['role'] ?? '') === 'founder' && !$actorIsFounder) {
                tw23_respond(['status' => 'error', 'message' => 'Only a Board Founder can edit a Founder account.'], 403);
            }

            if (isset($body['role'])) {
                $newRole = (string)$body['role'];
                if (!in_array($newRole, ['founder', 'admin', 'moderator', 'wizard', 'member', 'banned'], true)) {
                    tw23_respond(['status' => 'error', 'message' => 'Invalid group/role.'], 400);
                }
                if ($targetId === 2 && $newRole !== 'founder') {
                    tw23_respond(['status' => 'error', 'message' => 'Primary Founder account (#2 Gary) cannot be demoted or suspended.'], 403);
                }
                if ($newRole === 'founder' && !$actorIsFounder) {
                    tw23_respond(['status' => 'error', 'message' => 'Only a Founder can promote another user to Founder.'], 403);
                }
                $u['role'] = $newRole;
            }

            if (isset($body['custom_title'])) {
                $u['custom_title'] = substr(trim(strip_tags((string)$body['custom_title'])), 0, 56);
            }
            if (isset($body['badge']) && trim((string)$body['badge']) !== '') {
                $u['badge'] = substr(trim((string)$body['badge']), 0, 12);
            }
            if (isset($body['archetype'])) {
                $u['archetype'] = substr(trim(strip_tags((string)$body['archetype'])), 0, 40);
            }
            if (isset($body['email'])) {
                $em = strtolower(trim((string)$body['email']));
                if ($em !== '' && !filter_var($em, FILTER_VALIDATE_EMAIL)) {
                    tw23_respond(['status' => 'error', 'message' => 'Invalid email format.'], 400);
                }
                $u['email'] = $em;
            }
            if (!empty($body['new_password'])) {
                $npw = (string)$body['new_password'];
                if (strlen($npw) < 6) {
                    tw23_respond(['status' => 'error', 'message' => 'Passcode must be at least 6 characters.'], 400);
                }
                $u['password_hash'] = password_hash($npw, PASSWORD_BCRYPT);
            }

            tw23_write_json($usersFile, $uStore);
            tw23_audit_log('ACP_USER_EDIT', $actor['username'], "Edited user #{$targetId} ({$u['username']}) -> role={$u['role']}");
            tw23_respond(['status' => 'success', 'user' => tw23_sanitize_user($u, true), 'message' => "Updated {$u['username']}."]);
        }
        unset($u);
        tw23_respond(['status' => 'error', 'message' => 'Target user not found.'], 404);
    }

    if ($action === 'acp_create_user' && $method === 'POST') {
        $body = tw23_json_body();
        $username = trim((string)($body['username'] ?? ''));
        $email = strtolower(trim((string)($body['email'] ?? '')));
        $password = (string)($body['password'] ?? '');
        $role = (string)($body['role'] ?? 'member');
        $customTitle = substr(trim(strip_tags((string)($body['custom_title'] ?? ''))), 0, 56);
        $badge = trim((string)($body['badge'] ?? ''));

        if (!preg_match('/^[A-Za-z0-9_\-]{2,24}$/', $username)) {
            tw23_respond(['status' => 'error', 'message' => 'Call-Sign must be 2–24 letters, numbers, underscores, or hyphens.'], 400);
        }
        if (!in_array($role, ['founder', 'admin', 'moderator', 'wizard', 'member'], true)) {
            tw23_respond(['status' => 'error', 'message' => 'Invalid group/role.'], 400);
        }
        if ($role === 'founder' && !$actorIsFounder) {
            tw23_respond(['status' => 'error', 'message' => 'Only a Founder can create a Founder account.'], 403);
        }
        if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            tw23_respond(['status' => 'error', 'message' => 'Invalid email address.'], 400);
        }

        $uStore = tw23_seed_users_if_needed();
        $clean = strtolower($username);
        foreach ($uStore['users'] as $ex) {
            if (($ex['username_clean'] ?? strtolower($ex['username'])) === $clean) {
                tw23_respond(['status' => 'error', 'message' => "Call-Sign '{$username}' already exists."], 409);
            }
        }

        $newId = (int)($uStore['next_id'] ?? (count($uStore['users']) + 2));
        $uStore['next_id'] = $newId + 1;
        $meta = tw23_role_meta($role);
        $nowIso = gmdate('c');

        $created = [
            'id' => $newId,
            'username' => $username,
            'username_clean' => $clean,
            'email' => $email,
            'alt_emails' => [],
            'password_hash' => $password !== '' ? password_hash($password, PASSWORD_BCRYPT) : '',
            'role' => $role,
            'archetype' => 'Night0WL Strategist',
            'custom_title' => $customTitle ?: $meta['label'],
            'badge' => $badge ?: $meta['badge'],
            'base38_id' => tw23_base38_ident(time() + $newId),
            'location' => '',
            'website' => '',
            'favorite_game' => 'Backgammon 36-Roll',
            'preferred_axle' => '34',
            'bio' => '',
            'signature' => '',
            'joined_at' => $nowIso,
            'last_visit' => $nowIso,
            'prefs' => ['hide_online' => false, 'allow_challenges' => true, 'sound_fx' => true, 'default_pace' => 'turtle'],
            'stats' => ['backgammon_elo' => 1200, 'backgammon_wins' => 0, 'backgammon_games' => 0, 'botchee_best' => 0, 'tophat_elo' => 1200, 'tophat_solved' => 0, 'fd_unlocked' => 1, 'slider_best_moves' => 0],
        ];
        $uStore['users'][] = $created;
        tw23_write_json($usersFile, $uStore);
        tw23_audit_log('ACP_USER_CREATE', $actor['username'], "Created user #{$newId} {$username} [{$role}]");

        tw23_respond(['status' => 'success', 'user' => tw23_sanitize_user($created, true), 'message' => "Created {$username} ({$meta['label']})."]);
    }

    if ($action === 'acp_logs' && $method === 'GET') {
        tw23_respond(['status' => 'success', 'logs' => tw23_read_audit_logs(150)]);
    }
}

tw23_respond(['status' => 'error', 'message' => 'Unknown auth endpoint.'], 404);
