<?php
declare(strict_types=1);

/**
 * Twisted23 UniversaL Universe & GwCrm — Core Auth, Session, Rank & Audit Guard
 * phpBB-inspired User/Session/Group architecture with Git-safe runtime persistence.
 */

const TW23_COOKIE_NAME = 'tw23_sid';
const TW23_T0UX = 1584540571;
const TW23_BASE38_CHARS = '0123456789abcdefghijklmnopqrstuvwxyz|^';

function tw23_load_crm_env(): void {
    $candidates = [
        dirname(__DIR__) . '/crm/.env',
        __DIR__ . '/.env',
    ];
    foreach ($candidates as $envFile) {
        if (!is_file($envFile)) continue;
        foreach (file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [] as $line) {
            $trimmed = trim($line);
            if ($trimmed === '' || str_starts_with($trimmed, '#')) continue;
            $pos = strpos($trimmed, '=');
            if ($pos !== false) {
                $k = trim(substr($trimmed, 0, $pos));
                $v = trim(substr($trimmed, $pos + 1));
                if (getenv($k) === false) {
                    putenv("$k=$v");
                    $_ENV[$k] = $v;
                }
            }
        }
    }
}

tw23_load_crm_env();

function tw23_data_dir(): string {
    $dir = __DIR__ . '/data';
    if (!is_dir($dir)) {
        @mkdir($dir, 0750, true);
    }
    return $dir;
}

function tw23_base38_ident(?int $epochSec = null): string {
    $sec = $epochSec ?? time();
    $rel = $sec - TW23_T0UX;
    if ($rel <= 0) return '0';
    $out = '';
    while ($rel > 0) {
        $out = TW23_BASE38_CHARS[$rel % 38] . $out;
        $rel = intdiv($rel, 38);
    }
    return strtoupper($out);
}

function tw23_role_meta(string $role): array {
    return match ($role) {
        'founder' => ['label' => 'Founder • GwCrm Prime', 'color' => '#e5a932', 'badge' => '👑', 'is_staff' => true, 'is_admin' => true, 'rank_order' => 1],
        'admin' => ['label' => 'Administrators • GwCrm', 'color' => '#f87171', 'badge' => '🛡️', 'is_staff' => true, 'is_admin' => true, 'rank_order' => 2],
        'moderator' => ['label' => 'GLobaL Moderators', 'color' => '#34d399', 'badge' => '⚖️', 'is_staff' => true, 'is_admin' => false, 'rank_order' => 3],
        'wizard' => ['label' => 'Gravity Wizards VIP', 'color' => '#38bdf8', 'badge' => '🦉', 'is_staff' => false, 'is_admin' => false, 'rank_order' => 4],
        'banned' => ['label' => 'Suspended', 'color' => '#64748b', 'badge' => '🚫', 'is_staff' => false, 'is_admin' => false, 'rank_order' => 9],
        default => ['label' => 'Registered Parlour Members', 'color' => '#cbd5e1', 'badge' => '🎲', 'is_staff' => false, 'is_admin' => false, 'rank_order' => 5],
    };
}

function tw23_read_json(string $file, array $default = []): array {
    if (!is_file($file)) return $default;
    $fp = @fopen($file, 'r');
    if (!$fp) return $default;
    @flock($fp, LOCK_SH);
    $raw = stream_get_contents($fp);
    @flock($fp, LOCK_UN);
    @fclose($fp);
    $decoded = json_decode($raw ?: '', true);
    return is_array($decoded) ? $decoded : $default;
}

function tw23_write_json(string $file, array $data): bool {
    $json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . "\n";
    $fp = @fopen($file, 'c+');
    if ($fp) {
        $locked = @flock($fp, LOCK_EX);
        @ftruncate($fp, 0);
        @rewind($fp);
        @fwrite($fp, $json);
        @fflush($fp);
        if ($locked) @flock($fp, LOCK_UN);
        @fclose($fp);
        return true;
    }
    return @file_put_contents($file, $json, LOCK_EX) !== false;
}

function tw23_audit_log(string $event, string $actor, string $detail = '', array $extra = []): void {
    $logFile = tw23_data_dir() . '/audit_log.jsonl';
    $ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    $entry = array_merge([
        'ts' => gmdate('c'),
        'event' => $event,
        'actor' => $actor,
        'ip_hash' => substr(hash('sha256', 'tw23:' . $ip), 0, 10),
        'detail' => $detail,
    ], $extra);
    @file_put_contents($logFile, json_encode($entry, JSON_UNESCAPED_SLASHES) . "\n", FILE_APPEND | LOCK_EX);
}

function tw23_seed_users_if_needed(): array {
    $usersFile = tw23_data_dir() . '/users.runtime.json';
    $existing = tw23_read_json($usersFile, []);
    if (!empty($existing['users']) && is_array($existing['users'])) {
        return $existing;
    }

    $seedData = [
        'next_id' => 6,
        'users' => [
            [
                'id' => 2, // phpBB tradition: user_id 2 is the Board Founder!
                'username' => 'Gary',
                'username_clean' => 'gary',
                'email' => 'gary@gravitywizards.com',
                'alt_emails' => ['media@twisted23.com', 'botchee@icloud.com'],
                'password_hash' => '', // Claimed securely via 6-digit Founder Email Code -> custom password
                'role' => 'founder',
                'archetype' => 'Night0WL Strategist',
                'custom_title' => 'Founder • Gravity Wizard Prime',
                'badge' => '👑',
                'base38_id' => '23GW01',
                'location' => 'Anchorage, AK',
                'website' => 'https://gravitywizards.com',
                'favorite_game' => 'Backgammon 36-Roll',
                'preferred_axle' => '34',
                'bio' => 'Inventor of Trackless Bouncing FOBBs (Gravity Wizards) & Twisted23 3D-in-2D Spatial Gyms.',
                'signature' => '🐸 SLog ruLes 🐬 • Trackless Bouncing FOBBs & 3D-in-2D Spatial Gyms',
                'joined_at' => '2026-01-01T00:00:00+00:00',
                'last_visit' => '2026-11-18T18:00:00+00:00',
                'prefs' => [
                    'hide_online' => false,
                    'allow_challenges' => true,
                    'sound_fx' => true,
                    'default_pace' => 'turtle',
                ],
                'stats' => [
                    'backgammon_elo' => 1680,
                    'backgammon_wins' => 23,
                    'backgammon_games' => 31,
                    'botchee_best' => 312,
                    'tophat_elo' => 1620,
                    'tophat_solved' => 48,
                    'fd_unlocked' => 123,
                    'slider_best_moves' => 38,
                ],
            ],
            [
                'id' => 3,
                'username' => 'A7si',
                'username_clean' => 'a7si',
                'email' => 'media@twisted23.com',
                'alt_emails' => ['gary@gravitywizards.com', 'botchee@icloud.com'],
                'password_hash' => '',
                'role' => 'admin',
                'archetype' => 'CameLcase Cryptographer',
                'custom_title' => 'Night0WL System Architect',
                'badge' => '🦉',
                'base38_id' => 'A7SI23',
                'location' => '89.9°S · Shackleton Rim',
                'website' => 'https://twisted23.com/z404/',
                'favorite_game' => 'Flipping Dice',
                'preferred_axle' => '34',
                'bio' => 'AxLe-Locked [3–4] spatial rotational telemetry & Lunar South Pole rover operations.',
                'signature' => 'AxLe-Locked [3–4] • 4 pips rotating on the sunlit rim 💡',
                'joined_at' => '2026-02-23T00:00:00+00:00',
                'last_visit' => '2026-11-18T17:15:00+00:00',
                'prefs' => [
                    'hide_online' => false,
                    'allow_challenges' => true,
                    'sound_fx' => true,
                    'default_pace' => 'turtle',
                ],
                'stats' => [
                    'backgammon_elo' => 1740,
                    'backgammon_wins' => 19,
                    'backgammon_games' => 24,
                    'botchee_best' => 295,
                    'tophat_elo' => 1700,
                    'tophat_solved' => 64,
                    'fd_unlocked' => 230,
                    'slider_best_moves' => 34,
                ],
            ],
            [
                'id' => 4,
                'username' => 'CQ',
                'username_clean' => 'cq',
                'email' => '',
                'alt_emails' => [],
                'password_hash' => password_hash('slogbog23', PASSWORD_BCRYPT),
                'role' => 'wizard',
                'archetype' => 'High Roller',
                'custom_title' => 'Slog Bog Envoy',
                'badge' => '🐸',
                'base38_id' => 'SLOG57',
                'location' => 'Slog Bog',
                'website' => 'https://slogbog.com',
                'favorite_game' => 'Botchee (Spatial Yahtzee!)',
                'preferred_axle' => '25',
                'bio' => 'Exploring all 3 cosmic ways to AxLe-Lock a standard sum-7 die.',
                'signature' => 'Do you prefer Yahtzee or Backgammon? 🎲',
                'joined_at' => '2026-06-15T00:00:00+00:00',
                'last_visit' => '2026-11-18T17:00:00+00:00',
                'prefs' => [
                    'hide_online' => false,
                    'allow_challenges' => true,
                    'sound_fx' => true,
                    'default_pace' => 'turtle',
                ],
                'stats' => [
                    'backgammon_elo' => 1490,
                    'backgammon_wins' => 12,
                    'backgammon_games' => 20,
                    'botchee_best' => 284,
                    'tophat_elo' => 1450,
                    'tophat_solved' => 19,
                    'fd_unlocked' => 46,
                    'slider_best_moves' => 52,
                ],
            ],
            [
                'id' => 5,
                'username' => 'Siea',
                'username_clean' => 'siea',
                'email' => '',
                'alt_emails' => [],
                'password_hash' => password_hash('nightowl23', PASSWORD_BCRYPT),
                'role' => 'wizard',
                'archetype' => 'eLeven eLve Explorer',
                'custom_title' => 'Parlour Guild Navigator',
                'badge' => '🐬',
                'base38_id' => 'SIEA24',
                'location' => 'Twisted23 Parlour Lounge',
                'website' => 'https://twisted23.com',
                'favorite_game' => 'Top Hat Sudoku',
                'preferred_axle' => '16',
                'bio' => '24-Tile TopHat & diagonal permutation parity specialist.',
                'signature' => 'One empty space. Twenty-three ways. 🎩',
                'joined_at' => '2026-08-01T00:00:00+00:00',
                'last_visit' => '2026-11-18T16:30:00+00:00',
                'prefs' => [
                    'hide_online' => false,
                    'allow_challenges' => true,
                    'sound_fx' => true,
                    'default_pace' => 'rabbit',
                ],
                'stats' => [
                    'backgammon_elo' => 1525,
                    'backgammon_wins' => 15,
                    'backgammon_games' => 23,
                    'botchee_best' => 278,
                    'tophat_elo' => 1590,
                    'tophat_solved' => 37,
                    'fd_unlocked' => 69,
                    'slider_best_moves' => 41,
                ],
            ],
        ],
    ];

    tw23_write_json($usersFile, $seedData);
    return $seedData;
}

function tw23_sanitize_user(array $u, bool $includePrivate = false): array {
    $meta = tw23_role_meta($u['role'] ?? 'member');
    $out = [
        'id' => (int)($u['id'] ?? 0),
        'username' => (string)($u['username'] ?? ''),
        'role' => (string)($u['role'] ?? 'member'),
        'group_label' => $meta['label'],
        'group_color' => $meta['color'],
        'is_staff' => $meta['is_staff'],
        'is_admin' => $meta['is_admin'],
        'badge' => !empty($u['badge']) ? (string)$u['badge'] : $meta['badge'],
        'archetype' => (string)($u['archetype'] ?? 'Parlour Explorer'),
        'custom_title' => (string)($u['custom_title'] ?? $meta['label']),
        'base38_id' => (string)($u['base38_id'] ?? ''),
        'location' => (string)($u['location'] ?? ''),
        'website' => (string)($u['website'] ?? ''),
        'favorite_game' => (string)($u['favorite_game'] ?? 'Twisted 23 Slider'),
        'preferred_axle' => (string)($u['preferred_axle'] ?? '34'),
        'bio' => (string)($u['bio'] ?? ''),
        'signature' => (string)($u['signature'] ?? ''),
        'joined_at' => (string)($u['joined_at'] ?? ''),
        'last_visit' => (string)($u['last_visit'] ?? ''),
        'stats' => array_merge([
            'backgammon_elo' => 1200,
            'backgammon_wins' => 0,
            'backgammon_games' => 0,
            'botchee_best' => 0,
            'tophat_elo' => 1200,
            'tophat_solved' => 0,
            'fd_unlocked' => 1,
            'slider_best_moves' => 0,
        ], is_array($u['stats'] ?? null) ? $u['stats'] : []),
    ];
    if ($includePrivate) {
        $out['email'] = (string)($u['email'] ?? '');
        $out['has_password'] = !empty($u['password_hash']);
        $out['prefs'] = array_merge([
            'hide_online' => false,
            'allow_challenges' => true,
            'sound_fx' => true,
            'default_pace' => 'turtle',
        ], is_array($u['prefs'] ?? null) ? $u['prefs'] : []);
    }
    return $out;
}

function tw23_get_cookie_token(): string {
    $tok = $_COOKIE[TW23_COOKIE_NAME] ?? '';
    if ($tok === '' && !empty($_SERVER['HTTP_AUTHORIZATION'])) {
        if (preg_match('/^Bearer\s+([A-Za-z0-9_\-]+)$/i', trim($_SERVER['HTTP_AUTHORIZATION']), $m)) {
            $tok = $m[1];
        }
    }
    return preg_replace('/[^a-f0-9]/', '', strtolower((string)$tok));
}

function tw23_set_session_cookie(string $rawToken, bool $remember): void {
    $secure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (($_SERVER['SERVER_PORT'] ?? '') === '443');
    $expires = $remember ? (time() + 86400 * 30) : 0;
    setcookie(TW23_COOKIE_NAME, $rawToken, [
        'expires' => $expires,
        'path' => '/',
        'secure' => $secure,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
}

function tw23_clear_session_cookie(): void {
    $secure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (($_SERVER['SERVER_PORT'] ?? '') === '443');
    setcookie(TW23_COOKIE_NAME, '', [
        'expires' => time() - 3600,
        'path' => '/',
        'secure' => $secure,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
}

function tw23_create_session(int $userId, bool $remember = true, bool $hideOnline = false, string $via = 'password'): array {
    $sessionsFile = tw23_data_dir() . '/sessions.runtime.json';
    $store = tw23_read_json($sessionsFile, ['sessions' => []]);
    $sessions = is_array($store['sessions'] ?? null) ? $store['sessions'] : [];

    // Prune expired sessions
    $now = time();
    $sessions = array_values(array_filter($sessions, fn($s) => ($s['expires_at'] ?? 0) > $now));

    $rawToken = bin2hex(random_bytes(32));
    $tokenHash = hash('sha256', $rawToken);
    $csrf = bin2hex(random_bytes(16));
    $ttl = $remember ? (86400 * 30) : (86400 * 2);

    $sess = [
        'sid_id' => substr($tokenHash, 0, 12),
        'token_hash' => $tokenHash,
        'csrf_token' => $csrf,
        'user_id' => $userId,
        'remember' => $remember,
        'hide_online' => $hideOnline,
        'auth_via' => $via,
        'created_at' => $now,
        'last_active' => $now,
        'expires_at' => $now + $ttl,
        'current_page' => '/',
        'ua' => substr((string)($_SERVER['HTTP_USER_AGENT'] ?? 'Browser'), 0, 120),
        'ip_hash' => substr(hash('sha256', 'tw23:' . ($_SERVER['REMOTE_ADDR'] ?? '')), 0, 10),
    ];

    $sessions[] = $sess;
    tw23_write_json($sessionsFile, ['sessions' => $sessions]);
    tw23_set_session_cookie($rawToken, $remember);
    return $sess;
}

function tw23_current_session(?string $touchPage = null): ?array {
    $rawToken = tw23_get_cookie_token();
    if (strlen($rawToken) < 32) return null;

    $tokenHash = hash('sha256', $rawToken);
    $sessionsFile = tw23_data_dir() . '/sessions.runtime.json';
    $store = tw23_read_json($sessionsFile, ['sessions' => []]);
    $sessions = is_array($store['sessions'] ?? null) ? $store['sessions'] : [];

    $now = time();
    $foundSession = null;
    $dirty = false;

    foreach ($sessions as $idx => &$s) {
        if (($s['expires_at'] ?? 0) <= $now) {
            unset($sessions[$idx]);
            $dirty = true;
            continue;
        }
        if (hash_equals((string)($s['token_hash'] ?? ''), $tokenHash)) {
            if (($now - (int)($s['last_active'] ?? 0)) > 20 || ($touchPage !== null && $touchPage !== ($s['current_page'] ?? ''))) {
                $s['last_active'] = $now;
                if ($touchPage !== null && $touchPage !== '') {
                    $s['current_page'] = substr($touchPage, 0, 80);
                }
                $dirty = true;
            }
            $foundSession = $s;
        }
    }
    unset($s);

    if ($dirty) {
        tw23_write_json($sessionsFile, ['sessions' => array_values($sessions)]);
    }
    if (!$foundSession) return null;

    $uStore = tw23_seed_users_if_needed();
    foreach ($uStore['users'] as &$u) {
        if ((int)($u['id'] ?? 0) === (int)$foundSession['user_id']) {
            if (($u['role'] ?? '') === 'banned') return null;
            return [
                'user' => $u,
                'session' => $foundSession,
            ];
        }
    }
    return null;
}

function tw23_require_admin_json(): array {
    $ctx = tw23_current_session();
    if (!$ctx) {
        http_response_code(401);
        echo json_encode([
            'error' => 'Authentication required. Please sign in to access GwCrm / ACP.',
            'auth_required' => true,
            'login_url' => '/ucp/?mode=login&redirect=/crm/',
        ]);
        exit;
    }
    $meta = tw23_role_meta($ctx['user']['role'] ?? 'member');
    if (!$meta['is_admin']) {
        http_response_code(403);
        echo json_encode([
            'error' => 'Insufficient permissions. Founder or GwCrm Administrator rank required.',
            'forbidden' => true,
        ]);
        exit;
    }
    return $ctx;
}

function tw23_who_is_online(): array {
    $sessionsFile = tw23_data_dir() . '/sessions.runtime.json';
    $store = tw23_read_json($sessionsFile, ['sessions' => []]);
    $uStore = tw23_seed_users_if_needed();
    $uById = [];
    foreach ($uStore['users'] as $u) {
        $uById[(int)$u['id']] = $u;
    }

    $now = time();
    $window = 900; // phpBB classic 15-minute "users active over the past 15 minutes"
    $visibleUsers = [];
    $seenUserIds = [];
    $hiddenCount = 0;

    foreach (($store['sessions'] ?? []) as $s) {
        if (($now - (int)($s['last_active'] ?? 0)) > $window) continue;
        $uid = (int)($s['user_id'] ?? 0);
        if ($uid <= 0 || isset($seenUserIds[$uid]) || !isset($uById[$uid])) continue;
        $seenUserIds[$uid] = true;
        $u = $uById[$uid];
        $hide = !empty($s['hide_online']) || !empty($u['prefs']['hide_online']);
        if ($hide) {
            $hiddenCount++;
        } else {
            $meta = tw23_role_meta($u['role'] ?? 'member');
            $visibleUsers[] = [
                'id' => $uid,
                'username' => $u['username'],
                'badge' => $u['badge'] ?? $meta['badge'],
                'color' => $meta['color'],
                'role' => $u['role'] ?? 'member',
                'page' => $s['current_page'] ?? '/',
            ];
        }
    }

    // Estimate active guests from visitors telemetry if available
    $guests = 0;
    $visitorsFile = dirname(__DIR__) . '/visitors/data/visitors_log.json';
    if (is_file($visitorsFile)) {
        $vEvents = tw23_read_json($visitorsFile, []);
        $recentHashes = [];
        foreach ($vEvents as $ev) {
            if (is_array($ev) && ($now - (int)($ev['ts'] ?? 0)) <= $window && !empty($ev['vid'])) {
                $recentHashes[$ev['vid']] = true;
            }
        }
        $guests = max(0, count($recentHashes) - count($seenUserIds));
    }

    $regCount = count($visibleUsers);
    return [
        'total' => $regCount + $hiddenCount + $guests,
        'registered' => $regCount,
        'hidden' => $hiddenCount,
        'guests' => $guests,
        'window_minutes' => 15,
        'users' => $visibleUsers,
    ];
}

function tw23_send_mail(array $recipients, string $subject, string $text): bool {
    $recipients = array_values(array_unique(array_filter(array_map('trim', $recipients))));
    if (empty($recipients)) return false;

    $token = getenv('HOSTINGER_MAIL_TOKEN') ?: 'a023e730fa37a0813595549dffc89c29b1ce09a294328544f0f377bd6291851a';
    $mailbox = getenv('HOSTINGER_MAILBOX_ID') ?: 'AC4474ceb28197b9db960e1111ee79';

    if ($token !== '' && $mailbox !== '' && function_exists('curl_init')) {
        $anyOk = false;
        foreach ($recipients as $toAddr) {
            $payload = [
                'to' => [$toAddr],
                'displayName' => 'Twisted23 UniversaL Gatekeeper',
                'subject' => $subject,
                'text' => $text,
            ];
            $ch = curl_init("https://api.mail.hostinger.com/api/v1/mailboxes/{$mailbox}/send");
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_POST => true,
                CURLOPT_USERAGENT => 'Mozilla/5.0 (Twisted23-UCP/1.0)',
                CURLOPT_HTTPHEADER => [
                    'Authorization: Bearer ' . $token,
                    'Content-Type: application/json',
                ],
                CURLOPT_POSTFIELDS => json_encode($payload),
                CURLOPT_TIMEOUT => 12,
            ]);
            curl_exec($ch);
            $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);
            if ($code >= 200 && $code < 300) {
                $anyOk = true;
            }
        }
        if ($anyOk) return true;
    }

    $anyMail = false;
    $headers = "From: Twisted23 Gatekeeper <media@twisted23.com>\r\nReply-To: media@twisted23.com\r\nContent-Type: text/plain; charset=UTF-8\r\n";
    foreach ($recipients as $toAddr) {
        if (@mail($toAddr, $subject, $text, $headers)) {
            $anyMail = true;
        }
    }
    return $anyMail;
}
