<?php
declare(strict_types=1);

error_reporting(E_ALL);
ini_set('display_errors', '0');

header('Content-Type: application/json; charset=utf-8');
header('X-Robots-Tag: noindex, nofollow, noarchive, nosnippet');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

require_once dirname(__DIR__) . '/auth/guard.php';

const NORMA4_COOKIE = 'tw23_norma4_sid';
const NORMA4_DEFAULT_SALT = 'tw23_norma4_aaid_v1';
const NORMA4_B38_ALNUM = '0123456789abcdefghijklmnopqrstuvwxyz';
const NORMA4_B38_LOWER = 'abcdefghijklmnopqrstuvwxyz';

function n4_data_dir(): string {
    $dir = __DIR__ . '/data';
    if (!is_dir($dir)) {
        @mkdir($dir, 0750, true);
    }
    return $dir;
}

function n4_json_body(): array {
    $raw = file_get_contents('php://input');
    $decoded = $raw ? json_decode($raw, true) : null;
    return is_array($decoded) ? $decoded : [];
}

function n4_fail(int $code, string $msg): never {
    http_response_code($code);
    echo json_encode(['ok' => false, 'error' => $msg]);
    exit;
}

function n4_read_json(string $file, array $default = []): array {
    if (!is_file($file)) return $default;
    $fp = @fopen($file, 'r');
    if (!$fp) return $default;
    @flock($fp, LOCK_SH);
    $raw = stream_get_contents($fp);
    @flock($fp, LOCK_UN);
    @fclose($fp);
    $d = json_decode($raw ?: '', true);
    return is_array($d) ? $d : $default;
}

function n4_write_json(string $file, array $data): bool {
    $fp = @fopen($file, 'c+');
    if (!$fp) return false;
    @flock($fp, LOCK_EX);
    @ftruncate($fp, 0);
    @rewind($fp);
    @fwrite($fp, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . "\n");
    @fflush($fp);
    @flock($fp, LOCK_UN);
    @fclose($fp);
    return true;
}

function n4_append_jsonl(string $file, array $row): void {
    @file_put_contents($file, json_encode($row, JSON_UNESCAPED_SLASHES) . "\n", FILE_APPEND | LOCK_EX);
}

function n4_client_ip_hash(): string {
    $ip = $_SERVER['HTTP_CF_CONNECTING_IP'] ?? $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    $first = trim(explode(',', (string)$ip)[0]);
    return substr(hash('sha256', 'tw23_n4_ip:' . $first), 0, 16);
}

function n4_canonical_aaid(string $raw): string {
    $trimmed = trim($raw);
    return str_replace('^', '-', $trimmed);
}

function n4_validate_aaid_syntax(string $aaid): bool {
    return (bool)preg_match('/^A[a-z][0-9a-z]{2}-[er][0-9a-z]{2}[a-z]$/', $aaid);
}

function n4_hash_aaid(string $aaid, string $salt = NORMA4_DEFAULT_SALT): string {
    return hash('sha256', $salt . ':' . n4_canonical_aaid($aaid));
}

function n4_generate_acode9(string $tailLead = 'r'): string {
    $leadChar = ($tailLead === 'e') ? 'e' : 'r';
    $clock = strtolower(tw23_base38_ident());
    $c0 = $clock[0] ?? '2';
    if ($c0 >= '1' && $c0 <= '9') {
        $leadLetter = chr(ord('a') + ((int)$c0 - 1));
    } elseif ($c0 === '0') {
        $leadLetter = 'z';
    } elseif ($c0 >= 'a' && $c0 <= 'z') {
        $leadLetter = $c0;
    } else {
        $leadLetter = 'a';
    }
    $c1 = (strlen($clock) >= 2 && strpos(NORMA4_B38_ALNUM, $clock[1]) !== false) ? $clock[1] : 'p';
    $clock2 = ((strpos(NORMA4_B38_ALNUM, $c0) !== false) ? $c0 : '2') . $c1;

    $blocked = ['anal','anus','arse','btch','cock','c0ck','cunt','damn','dick','d1ck','dyke','fag','fck','fuk','fuck','hell','jizz','kike','klan','nazi','nig','n1g','porn','p0rn','puss','rape','shit','sh1t','slut','spic','twat','wank','whor','xxx'];
    for ($attempt = 0; $attempt < 100; $attempt++) {
        $m1 = NORMA4_B38_ALNUM[random_int(0, 35)];
        $m2 = NORMA4_B38_ALNUM[random_int(0, 35)];
        $end = NORMA4_B38_LOWER[random_int(0, 25)];
        $tail4 = $leadChar . $m1 . $m2 . $end;
        $cand = 'A' . $leadLetter . $clock2 . '-' . $tail4;
        $lowerCore = strtolower(str_replace('-', '', $cand));
        $bad = false;
        foreach ($blocked as $b) {
            if (str_contains(strtolower($tail4), $b) || str_contains($lowerCore, $b)) {
                $bad = true;
                break;
            }
        }
        if (!$bad && n4_validate_aaid_syntax($cand)) {
            return $cand;
        }
    }
    return 'Ab2p-' . $leadChar . '7kx';
}

function n4_set_session_cookie(string $sid, int $ttl): void {
    $isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (($_SERVER['SERVER_PORT'] ?? '') === '443');
    setcookie(NORMA4_COOKIE, $sid, [
        'expires' => time() + $ttl,
        'path' => '/',
        'secure' => $isHttps,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
}

function n4_create_session(array $meta): array {
    $dir = n4_data_dir();
    $sessionsFile = $dir . '/sessions.json';
    $sessions = n4_read_json($sessionsFile, []);
    $now = time();
    foreach ($sessions as $k => $v) {
        if (($v['expires_at'] ?? 0) < $now) {
            unset($sessions[$k]);
        }
    }
    $sid = bin2hex(random_bytes(24));
    $ttl = 86400 * 7;
    $record = array_merge($meta, [
        'created_at' => gmdate('c'),
        'expires_at' => $now + $ttl,
    ]);
    $sessions[$sid] = $record;
    n4_write_json($sessionsFile, $sessions);
    n4_set_session_cookie($sid, $ttl);
    return [$sid, $record];
}

function n4_current_session(): ?array {
    $sid = trim((string)($_COOKIE[NORMA4_COOKIE] ?? ''));
    if ($sid === '') return null;
    $sessions = n4_read_json(n4_data_dir() . '/sessions.json', []);
    $sess = $sessions[$sid] ?? null;
    if (!is_array($sess) || ($sess['expires_at'] ?? 0) < time() || empty($sess['nda_accepted'])) {
        return null;
    }
    return $sess;
}

function n4_lookup_aaid(string $rawAaid): ?array {
    $canon = n4_canonical_aaid($rawAaid);
    if (!n4_validate_aaid_syntax($canon)) {
        return null;
    }
    $dir = n4_data_dir();
    $editorialDb = n4_read_json($dir . '/aaids_editorial.json', ['salt' => NORMA4_DEFAULT_SALT, 'editorial' => []]);
    $salt = (string)($editorialDb['salt'] ?? NORMA4_DEFAULT_SALT);
    $hash = n4_hash_aaid($canon, $salt);

    foreach (($editorialDb['editorial'] ?? []) as $entry) {
        if (!empty($entry['active']) && hash_equals((string)($entry['hash'] ?? ''), $hash)) {
            return $entry;
        }
    }

    $runtimeDb = n4_read_json($dir . '/aaids_runtime.json', ['aaids' => []]);
    foreach (($runtimeDb['aaids'] ?? []) as $entry) {
        if (!empty($entry['active']) && hash_equals((string)($entry['hash'] ?? ''), $hash)) {
            return $entry;
        }
    }
    return null;
}

function n4_unwrap_key(array $entry, string $canonAaid): ?string {
    $wk = $entry['wrapped_key'] ?? null;
    if (!is_array($wk) || empty($wk['iv']) || empty($wk['tag']) || empty($wk['ct'])) {
        return null;
    }
    $iv = base64_decode((string)$wk['iv'], true);
    $tag = base64_decode((string)$wk['tag'], true);
    $ct = base64_decode((string)$wk['ct'], true);
    if ($iv === false || $tag === false || $ct === false) {
        return null;
    }
    $wrapKey = hash('sha256', 'tw23_n4_wrap_v1:' . n4_canonical_aaid($canonAaid), true);
    $plain = openssl_decrypt($ct, 'aes-256-gcm', $wrapKey, OPENSSL_RAW_DATA, $iv, $tag);
    return ($plain !== false && strlen($plain) === 32) ? $plain : null;
}

function n4_wrap_key(string $masterKey, string $canonAaid): array {
    $wrapKey = hash('sha256', 'tw23_n4_wrap_v1:' . n4_canonical_aaid($canonAaid), true);
    $iv = random_bytes(12);
    $tag = '';
    $ct = openssl_encrypt($masterKey, 'aes-256-gcm', $wrapKey, OPENSSL_RAW_DATA, $iv, $tag);
    return [
        'iv' => base64_encode($iv),
        'tag' => base64_encode($tag),
        'ct' => base64_encode($ct),
    ];
}

function n4_cached_master_key(?string $setKey = null): ?string {
    $vaultFile = n4_data_dir() . '/.vault.key';
    if ($setKey !== null && strlen($setKey) === 32) {
        @file_put_contents($vaultFile, base64_encode($setKey) . "\n", LOCK_EX);
        @chmod($vaultFile, 0600);
        return $setKey;
    }
    if (!is_file($vaultFile)) return null;
    $raw = trim((string)@file_get_contents($vaultFile));
    if ($raw === '') return null;
    $dec = base64_decode($raw, true);
    return ($dec !== false && strlen($dec) === 32) ? $dec : null;
}

function n4_read_encrypted_trial(?string $masterKey): ?array {
    if ($masterKey === null || strlen($masterKey) !== 32) return null;
    $enc = n4_read_json(n4_data_dir() . '/editorial_trial.enc', []);
    if (empty($enc['iv']) || empty($enc['tag']) || empty($enc['ct'])) return null;
    $iv = base64_decode((string)$enc['iv'], true);
    $tag = base64_decode((string)$enc['tag'], true);
    $ct = base64_decode((string)$enc['ct'], true);
    if ($iv === false || $tag === false || $ct === false) return null;
    $plain = openssl_decrypt($ct, 'aes-256-gcm', $masterKey, OPENSSL_RAW_DATA, $iv, $tag);
    if ($plain === false) return null;
    $data = json_decode($plain, true);
    return is_array($data) ? $data : null;
}

function n4_log_telemetry(string $event, array $meta = [], ?array $sess = null): void {
    n4_append_jsonl(n4_data_dir() . '/telemetry.jsonl', [
        'ts' => gmdate('c'),
        'event' => substr(preg_replace('/[^a-zA-Z0-9_\-:.]/', '', $event), 0, 64),
        'tier' => $sess['tier'] ?? ($meta['tier'] ?? 'anon'),
        'aaid_hint' => $sess['prefix_hint'] ?? ($meta['aaid_hint'] ?? ''),
        'ip_hash' => n4_client_ip_hash(),
        'ua' => substr((string)($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 120),
        'meta' => $meta,
    ]);
}

function n4_notify_editorial_event(string $subject, string $text): void {
    $token = trim((string)(getenv('HOSTINGER_MAIL_TOKEN') ?: ''));
    $mailboxId = trim((string)(getenv('HOSTINGER_MAILBOX_ID') ?: 'AC4474ceb28197b9db960e1111ee79'));
    if ($token === '' || $mailboxId === '') return;

    $ch = curl_init("https://api.mail.hostinger.com/api/v1/mailboxes/{$mailboxId}/send");
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_USERAGENT => 'Mozilla/5.0 (Twisted23-Norma4-Monitor)',
        CURLOPT_HTTPHEADER => [
            'Authorization: Bearer ' . $token,
            'Content-Type: application/json',
        ],
        CURLOPT_POSTFIELDS => json_encode([
            'to' => ['botchee@icloud.com'],
            'displayName' => 'Twisted23 Norma4 Telemetry',
            'subject' => $subject,
            'text' => $text,
        ]),
        CURLOPT_TIMEOUT => 4,
    ]);
    @curl_exec($ch);
    @curl_close($ch);
}

$action = trim((string)($_GET['action'] ?? ''));
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($action === 'session' && $method === 'GET') {
    $sess = n4_current_session();
    if (!$sess) {
        echo json_encode(['ok' => true, 'unlocked' => false]);
        exit;
    }
    $trial = n4_read_encrypted_trial(n4_cached_master_key());
    if (!$trial) {
        echo json_encode(['ok' => true, 'unlocked' => false]);
        exit;
    }
    echo json_encode([
        'ok' => true,
        'unlocked' => true,
        'tier' => $sess['tier'] ?? 'reader',
        'label' => $sess['label'] ?? 'Editorial Reviewer',
        'prefix_hint' => $sess['prefix_hint'] ?? '',
        'nda_accepted_at' => $sess['nda_accepted_at'] ?? $sess['created_at'] ?? '',
        'trial' => $trial,
    ]);
    exit;
}

if ($action === 'unlock' && $method === 'POST') {
    $body = n4_json_body();
    $aaid = n4_canonical_aaid((string)($body['aaid'] ?? ''));
    $ndaAccepted = !empty($body['nda_accepted']);
    $reviewerNote = substr(trim((string)($body['reviewer_note'] ?? '')), 0, 120);

    if (!$ndaAccepted) {
        n4_log_telemetry('unlock_denied_no_nda', ['aaid_hint' => substr($aaid, 0, 6)]);
        n4_fail(400, 'Please check the Pre-Publication Confidentiality & NDA box before unlocking.');
    }

    $match = n4_lookup_aaid($aaid);
    if (!$match) {
        n4_log_telemetry('unlock_denied_invalid_aaid', ['aaid_hint' => substr($aaid, 0, 6)]);
        n4_fail(401, 'Invalid or inactive AAid password. Use your pre-issued e-tier AAid or complete the quick Pre-Trial Survey to generate a Reader AAid.');
    }

    $masterKey = n4_unwrap_key($match, $aaid);
    if ($masterKey !== null) {
        n4_cached_master_key($masterKey);
    } else {
        $masterKey = n4_cached_master_key();
    }

    $trial = n4_read_encrypted_trial($masterKey);
    if (!$trial) {
        n4_log_telemetry('unlock_vault_unavailable', ['aaid_hint' => substr($aaid, 0, 6)]);
        n4_fail(503, 'Encrypted editorial vault could not be decrypted yet. If using a Reader AAid, wait for initial Editorial unlock.');
    }

    $ndaAt = gmdate('c');
    $tier = (string)($match['tier'] ?? 'reader');
    $label = (string)($match['label'] ?? 'Reviewer');
    $hint = (string)($match['prefix_hint'] ?? (substr($aaid, 0, 6) . '...'));

    [$sid, $sess] = n4_create_session([
        'tier' => $tier,
        'label' => $label,
        'prefix_hint' => $hint,
        'nda_accepted' => true,
        'nda_accepted_at' => $ndaAt,
    ]);

    n4_append_jsonl(n4_data_dir() . '/nda_log.jsonl', [
        'ts' => $ndaAt,
        'method' => 'aaid_password',
        'tier' => $tier,
        'label' => $label,
        'prefix_hint' => $hint,
        'reviewer_note' => $reviewerNote,
        'ip_hash' => n4_client_ip_hash(),
    ]);
    n4_log_telemetry('unlock_success', ['method' => 'aaid_password', 'label' => $label], $sess);

    if ($tier === 'editorial') {
        n4_notify_editorial_event(
            "[Norma4] Editorial AAid Unlocked: {$label}",
            "Editorial reviewer unlocked /norma4/ at {$ndaAt}\nAAid Hint: {$hint}\nLabel: {$label}\nReviewer Initials/Note: {$reviewerNote}"
        );
    }

    echo json_encode([
        'ok' => true,
        'unlocked' => true,
        'tier' => $tier,
        'label' => $label,
        'prefix_hint' => $hint,
        'nda_accepted_at' => $ndaAt,
        'trial' => $trial,
    ]);
    exit;
}

if ($action === 'survey_unlock' && $method === 'POST') {
    $body = n4_json_body();
    $ndaAccepted = !empty($body['nda_accepted']);
    $preSurvey = is_array($body['pre_survey'] ?? null) ? $body['pre_survey'] : [];
    $freq = substr(trim((string)($preSurvey['frequency'] ?? '')), 0, 60);
    $trick = substr(trim((string)($preSurvey['trick_tried'] ?? '')), 0, 60);
    $role = substr(trim((string)($preSurvey['role'] ?? '')), 0, 60);

    if (!$ndaAccepted) {
        n4_log_telemetry('survey_unlock_denied_no_nda');
        n4_fail(400, 'Please accept the Pre-Publication Confidentiality & NDA terms to receive your Reader AAid.');
    }
    if ($freq === '' || $trick === '' || $role === '') {
        n4_fail(400, 'Please answer all 3 quick survey questions to mint your Reader AAid.');
    }

    $trial = n4_read_encrypted_trial(n4_cached_master_key());
    if (!$trial) {
        n4_fail(503, 'Editorial vault is awaiting initial Editorial unlock before Reader self-enrollment opens.');
    }

    $minted = n4_generate_acode9('r');
    $hash = n4_hash_aaid($minted);
    $hint = substr($minted, 0, 6) . '...';
    $ndaAt = gmdate('c');

    $runtimePath = n4_data_dir() . '/aaids_runtime.json';
    $runtimeDb = n4_read_json($runtimePath, ['aaids' => []]);
    $runtimeDb['aaids'][] = [
        'hash' => $hash,
        'prefix_hint' => $hint,
        'label' => "Pre-Survey Reader ({$role})",
        'tier' => 'reader',
        'created_at' => $ndaAt,
        'active' => true,
    ];
    n4_write_json($runtimePath, $runtimeDb);

    [$sid, $sess] = n4_create_session([
        'tier' => 'reader',
        'label' => "Reader ({$role})",
        'prefix_hint' => $hint,
        'nda_accepted' => true,
        'nda_accepted_at' => $ndaAt,
    ]);

    n4_append_jsonl(n4_data_dir() . '/nda_log.jsonl', [
        'ts' => $ndaAt,
        'method' => 'pre_trial_survey',
        'tier' => 'reader',
        'prefix_hint' => $hint,
        'role' => $role,
        'ip_hash' => n4_client_ip_hash(),
    ]);
    n4_append_jsonl(n4_data_dir() . '/surveys.jsonl', [
        'ts' => $ndaAt,
        'stage' => 'pre_trial',
        'tier' => 'reader',
        'prefix_hint' => $hint,
        'answers' => ['frequency' => $freq, 'trick_tried' => $trick, 'role' => $role],
    ]);
    n4_log_telemetry('pre_survey_complete', ['role' => $role], $sess);

    echo json_encode([
        'ok' => true,
        'unlocked' => true,
        'minted_aaid' => $minted,
        'tier' => 'reader',
        'label' => "Reader ({$role})",
        'prefix_hint' => $hint,
        'nda_accepted_at' => $ndaAt,
        'trial' => $trial,
    ]);
    exit;
}

if ($action === 'logout' && $method === 'POST') {
    $sid = trim((string)($_COOKIE[NORMA4_COOKIE] ?? ''));
    if ($sid !== '') {
        $sessionsFile = n4_data_dir() . '/sessions.json';
        $sessions = n4_read_json($sessionsFile, []);
        unset($sessions[$sid]);
        n4_write_json($sessionsFile, $sessions);
    }
    n4_set_session_cookie('', -3600);
    echo json_encode(['ok' => true, 'unlocked' => false]);
    exit;
}

if ($action === 'post_survey' && $method === 'POST') {
    $sess = n4_current_session();
    if (!$sess) {
        n4_fail(401, 'Session locked. Please unlock with your AAid + NDA first.');
    }
    $body = n4_json_body();
    $hookScore = substr(trim((string)($body['hook_score'] ?? $body['would_use'] ?? '')), 0, 80);
    $formatFit = substr(trim((string)($body['format_fit'] ?? '')), 0, 80);
    $nextStep = substr(trim((string)($body['next_step'] ?? $body['favorite_hook'] ?? '')), 0, 80);
    $note = substr(trim((string)($body['note'] ?? '')), 0, 600);

    if ($hookScore === '' || $formatFit === '' || $nextStep === '') {
        n4_fail(400, 'Please pick all 3 quick options before submitting feedback.');
    }

    $entry = [
        'ts' => gmdate('c'),
        'stage' => 'post_trial',
        'tier' => $sess['tier'] ?? 'reader',
        'label' => $sess['label'] ?? '',
        'prefix_hint' => $sess['prefix_hint'] ?? '',
        'answers' => [
            'hook_score' => $hookScore,
            'format_fit' => $formatFit,
            'next_step' => $nextStep,
            'note' => $note,
        ],
    ];
    n4_append_jsonl(n4_data_dir() . '/surveys.jsonl', $entry);
    n4_log_telemetry('post_survey_submit', ['format_fit' => $formatFit, 'next_step' => $nextStep], $sess);

    if (($sess['tier'] ?? '') === 'editorial') {
        n4_notify_editorial_event(
            "[Norma4] Editorial Survey Feedback: {$sess['label']}",
            "Reviewer: {$sess['label']} ({$sess['prefix_hint']})\nHook / Lightbulb: {$hookScore}\nFormat Fit: {$formatFit}\nNext Step: {$nextStep}\nNote: {$note}"
        );
    }
    echo json_encode(['ok' => true, 'saved' => true]);
    exit;
}

if ($action === 'telemetry' && $method === 'POST') {
    $sess = n4_current_session();
    $body = n4_json_body();
    $event = trim((string)($body['event'] ?? 'ping'));
    $meta = is_array($body['meta'] ?? null) ? $body['meta'] : [];
    // Truncate strings in meta to avoid oversized logs
    $cleanMeta = [];
    foreach (array_slice($meta, 0, 10, true) as $k => $v) {
        $cleanKey = substr(preg_replace('/[^a-zA-Z0-9_\-]/', '', (string)$k), 0, 40);
        if ($cleanKey === '') continue;
        $cleanMeta[$cleanKey] = is_scalar($v) ? substr((string)$v, 0, 500) : '[obj]';
    }
    n4_log_telemetry($event, $cleanMeta, $sess);
    echo json_encode(['ok' => true]);
    exit;
}

// Staff-Only Admin Endpoints (Protected via Twisted23 Founder / Admin Session)
if ($action === 'mint_editorial_aaid' && $method === 'POST') {
    $authCtx = tw23_require_admin_json();
    $body = n4_json_body();
    $label = substr(trim((string)($body['label'] ?? 'Invited Editorial Reviewer')), 0, 120);
    $masterAaid = n4_canonical_aaid((string)($body['master_aaid'] ?? ''));
    $aaid = n4_generate_acode9('e');

    $edFile = n4_data_dir() . '/aaids_editorial.json';
    $edDb = n4_read_json($edFile, ['salt' => NORMA4_DEFAULT_SALT, 'editorial' => []]);
    $salt = (string)($edDb['salt'] ?? NORMA4_DEFAULT_SALT);

    $masterKey = n4_cached_master_key();
    if ($masterKey === null && $masterAaid !== '') {
        $mMatch = n4_lookup_aaid($masterAaid);
        if ($mMatch) {
            $masterKey = n4_unwrap_key($mMatch, $masterAaid);
        }
    }

    $entry = [
        'hash' => n4_hash_aaid($aaid, $salt),
        'prefix_hint' => substr($aaid, 0, 6) . '...',
        'label' => $label,
        'tier' => 'editorial',
        'minted_by' => $authCtx['user']['username'] ?? 'Admin',
        'created_at' => gmdate('c'),
        'active' => true,
    ];
    if ($masterKey !== null) {
        $entry['wrapped_key'] = n4_wrap_key($masterKey, $aaid);
    }

    $edDb['editorial'][] = $entry;
    n4_write_json($edFile, $edDb);
    echo json_encode([
        'ok' => true,
        'aaid' => $aaid,
        'label' => $label,
        'prefix_hint' => substr($aaid, 0, 6) . '...',
        'has_wrapped_key' => isset($entry['wrapped_key']),
    ]);
    exit;
}

if ($action === 'admin_telemetry' && $method === 'GET') {
    tw23_require_admin_json();
    $dir = n4_data_dir();
    $readJsonl = function (string $f, int $limit = 100): array {
        if (!is_file($f)) return [];
        $lines = file($f, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [];
        $tail = array_slice($lines, -$limit);
        return array_values(array_filter(array_map(fn($l) => json_decode($l, true), $tail)));
    };
    echo json_encode([
        'ok' => true,
        'telemetry_recent' => $readJsonl($dir . '/telemetry.jsonl', 100),
        'surveys_recent' => $readJsonl($dir . '/surveys.jsonl', 100),
        'nda_recent' => $readJsonl($dir . '/nda_log.jsonl', 100),
    ]);
    exit;
}

n4_fail(404, 'Unknown endpoint');
