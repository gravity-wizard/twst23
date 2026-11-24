<?php
declare(strict_types=1);

/**
 * Twisted23.com/ascenders/ — 38 Levels of Ascension Engine & Portable Acode9 Passport API
 *
 * - 38 Levels: 0..37 mapped 1:1 to Base-38 ('0'..'9', 'a'..'z', '|', '^')
 * - Time0 Epoch Ceiling: advances by +1 each exact Time0 UTC anniversary (March 18, 14:09:31Z)
 *     2026 -> Max Level 6 ('6')
 *     2027 -> Max Level 7 ('7')  [Opens 2027-03-18T14:09:31Z, preceded by March 8->18 Miracle Window]
 *     2057 -> Max Level 37 ('^') [Summit Peak]
 * - Hybrid Identity:
 *     Levels 0..3 : Zero-friction HMAC-SHA256 portable Acode9 Passport (ideal for Pi Browser p1b^f5n)
 *     Levels 4..7 : Bound to Twisted23 Parlour session (auth/guard.php tw23_sid) + reserved a8a triads
 */

require_once dirname(__DIR__) . '/auth/guard.php';

if (!headers_sent()) {
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
    header('CDN-Cache-Control: no-store');
    header('Cloudflare-CDN-Cache-Control: no-store');
}

const ASC_B38 = '0123456789abcdefghijklmnopqrstuvwxyz|^';
const ASC_T0UX = 1584540571; // 2020-03-18T14:09:31Z
const ASC_TRIAD_BASE = 54872; // 38^3
const ASC_MAX_TOTAL = 37;     // 0..37 = 38 total levels

function asc_json_out(int $status, array $payload): never {
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_SLASHES);
    exit;
}

function asc_body(): array {
    $raw = file_get_contents('php://input');
    if ($raw === false || trim($raw) === '') {
        return $_POST ?: [];
    }
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : ($_POST ?: []);
}

function asc_data_dir(): string {
    $override = getenv('TW23_ASCENDERS_DATA_DIR');
    $dir = ($override !== false && $override !== '') ? $override : (__DIR__ . '/data');
    if (!is_dir($dir)) {
        @mkdir($dir, 0750, true);
    }
    return $dir;
}

function asc_shared_secret(): string {
    $env = getenv('TWISTED23_ASCENDER_SECRET');
    if ($env !== false && strlen($env) >= 32) {
        return $env;
    }
    $keyFile = tw23_data_dir() . '/.ascender_secret.key';
    if (is_file($keyFile)) {
        $existing = trim((string)@file_get_contents($keyFile));
        if (strlen($existing) >= 32) {
            return $existing;
        }
    }
    $fresh = bin2hex(random_bytes(32));
    @file_put_contents($keyFile, $fresh . "\n", LOCK_EX);
    @chmod($keyFile, 0600);
    return $fresh;
}

function asc_b64url_enc(string $raw): string {
    return rtrim(strtr(base64_encode($raw), '+/', '-_'), '=');
}

function asc_b64url_dec(string $enc): string|false {
    $pad = strlen($enc) % 4;
    if ($pad > 0) {
        $enc .= str_repeat('=', 4 - $pad);
    }
    return base64_decode(strtr($enc, '-_', '+/'), true);
}

function asc_encode_b38(int $val): string {
    if ($val <= 0) return '0';
    $out = '';
    $n = $val;
    while ($n > 0) {
        $out = ASC_B38[$n % 38] . $out;
        $n = intdiv($n, 38);
    }
    return $out;
}

function asc_glyph(int $level): string {
    $clamped = max(0, min(ASC_MAX_TOTAL, $level));
    return ASC_B38[$clamped];
}

function asc_max_level_at(int $unixTs): int {
    if ($unixTs <= ASC_T0UX) {
        return 0;
    }
    $year = (int)gmdate('Y', $unixTs);
    $annivThisYear = gmmktime(14, 9, 31, 3, 18, $year);
    $elapsedYears = ($unixTs >= $annivThisYear) ? ($year - 2020) : ($year - 2021);
    return max(0, min(ASC_MAX_TOTAL, $elapsedYears));
}

function asc_next_unlock_info(int $unixTs): ?array {
    $cur = asc_max_level_at($unixTs);
    if ($cur >= ASC_MAX_TOTAL) {
        return null;
    }
    $nextLevel = $cur + 1;
    $unlockYear = 2020 + $nextLevel;
    $unlockTs = gmmktime(14, 9, 31, 3, 18, $unlockYear);
    $miracleStart = gmmktime(0, 0, 0, 3, 8, $unlockYear);
    return [
        'nextLevel' => $nextLevel,
        'nextGlyph' => asc_glyph($nextLevel),
        'unlockUnix' => $unlockTs,
        'unlockIso' => gmdate('Y-m-d\TH:i:s\Z', $unlockTs),
        'secondsRemaining' => max(0, $unlockTs - $unixTs),
        'miracleWindowStartIso' => gmdate('Y-m-d\TH:i:s\Z', $miracleStart),
        'inMiracleWindow' => ($unixTs >= $miracleStart && $unixTs <= $unlockTs),
    ];
}

function asc_lead_letter(string $clockChar): string {
    if ($clockChar >= '1' && $clockChar <= '9') {
        return chr(97 + ((int)$clockChar) - 1);
    }
    if ($clockChar === '0') return 'z';
    if ($clockChar >= 'a' && $clockChar <= 'z') return $clockChar;
    if ($clockChar === '|' || $clockChar === '_') return 'x';
    return 'y';
}

function asc_is_clean_seq(string $s): bool {
    $joined = strtr(strtolower($s), ['|' => '', '^' => '', '-' => '', '_' => '0']);
    $leet = strtr($joined, ['0' => 'o', '1' => 'i', '3' => 'e', '4' => 'a', '5' => 's', '7' => 't', '8' => 'b', '9' => 'g']);
    $re = '/69|666|anal|anus|arse|bitch|btch|cock|c0ck|cunt|damn|dick|d1ck|dyke|fag|fck|fuk|fuck|hell|jizz|kike|klan|nazi|nig|n1g|porn|p0rn|puss|rape|shit|sh1t|slut|spic|twat|wank|whor|xxx/';
    return preg_match($re, $joined) !== 1 && preg_match($re, $leet) !== 1;
}

function asc_mint_acode9(int $unixTs, array $existingPassports = []): string {
    $elapsed = max(0, $unixTs - ASC_T0UX);
    $clock = str_pad(asc_encode_b38($elapsed), 2, '0', STR_PAD_LEFT);
    $clock2 = substr($clock, 0, 2);
    $lead = asc_lead_letter($clock2[0]);
    $letters = 'abcdefghijklmnopqrstuvwxyz';
    $alnum = '0123456789abcdefghijklmnopqrstuvwxyz';

    for ($i = 0; $i < 200; $i++) {
        $t0 = $letters[random_int(0, 25)];
        $t1 = $alnum[random_int(0, 35)];
        $t2 = $alnum[random_int(0, 35)];
        $t3 = $letters[random_int(0, 25)];
        $tail = $t0 . $t1 . $t2 . $t3;
        if (count(array_unique(str_split($tail))) === 1) continue;
        $cand = "A{$lead}{$clock2}^{$tail}";
        if (asc_is_clean_seq($cand) && !isset($existingPassports[$cand])) {
            return $cand;
        }
    }
    return "A{$lead}{$clock2}^p1bf";
}

function asc_is_valid_acode9(string $code): bool {
    if (strlen($code) !== 9 || $code[0] !== 'A' || ($code[4] !== '^' && $code[4] !== '-')) {
        return false;
    }
    $c2 = substr($code, 2, 2);
    if (strpos(ASC_B38, $c2[0]) === false || strpos(ASC_B38, $c2[1]) === false) {
        return false;
    }
    if ($code[1] !== asc_lead_letter($c2[0])) {
        return false;
    }
    $tail = substr($code, 5, 4);
    if (preg_match('/^[a-z][0-9a-z]{2}[a-z]$/', $tail) !== 1) {
        return false;
    }
    return asc_is_clean_seq($code);
}

function asc_is_a8a(string $t): bool {
    return preg_match('/^[a-z][1-57-9][a-z]$/', $t) === 1 && asc_is_clean_seq($t);
}

function asc_decode_3peaks(string $code): ?int {
    $s = strtolower(trim($code));
    $sep = fn(string $c) => $c === '^' || $c === '-';
    $decMsd = function (string $m): ?int {
        $tot = 0;
        for ($i = 0; $i < 3; $i++) {
            $ch = $m[$i] === '_' ? '0' : ($m[$i] === '-' ? '^' : $m[$i]);
            $idx = strpos(ASC_B38, $ch);
            if ($idx === false) return null;
            $tot = $tot * 38 + $idx;
        }
        return $tot;
    };
    $decPeak = function (string $p): ?int {
        $tot = 0;
        for ($i = 0; $i < 3; $i++) {
            $ch = $p[$i] === '_' ? '|' : ($p[$i] === '-' ? '^' : $p[$i]);
            $idx = strpos(ASC_B38, $ch);
            if ($idx === false) return null;
            $tot = $tot * 38 + $idx;
        }
        return $tot;
    };

    if (strlen($s) === 7 && $sep($s[3])) {
        if (!asc_is_a8a(substr($s, 4, 3))) return null;
        $m = $decMsd(substr($s, 0, 3));
        $l = $decPeak(substr($s, 4, 3));
        return ($m !== null && $l !== null) ? (ASC_T0UX + $m * ASC_TRIAD_BASE + $l) : null;
    }
    if (strlen($s) === 15 && $sep($s[3]) && $sep($s[7]) && $sep($s[11])) {
        $p1 = substr($s, 4, 3);
        $p2 = substr($s, 8, 3);
        if (!asc_is_a8a($p1) || !asc_is_a8a($p2)) return null;
        $m = $decMsd(substr($s, 0, 3));
        $v1 = $decPeak($p1);
        $v2 = $decPeak($p2);
        $v3 = $decPeak(substr($s, 12, 3));
        if ($m === null || $v1 === null || $v2 === null || $v3 === null) return null;
        return ASC_T0UX + $m * ASC_TRIAD_BASE + (($v1 + $v2 + $v3 + $m) % ASC_TRIAD_BASE);
    }
    return null;
}

function asc_sign_passport(array $payload): string {
    $b64 = asc_b64url_enc((string)json_encode($payload, JSON_UNESCAPED_SLASHES));
    $sig = hash_hmac('sha256', $b64, asc_shared_secret());
    return $b64 . '.' . $sig;
}

function asc_verify_passport(?string $token): ?array {
    $raw = trim((string)$token);
    if ($raw === '' || !str_contains($raw, '.')) {
        return null;
    }
    [$b64, $sig] = explode('.', $raw, 2);
    $expected = hash_hmac('sha256', $b64, asc_shared_secret());
    if (!hash_equals($expected, strtolower($sig))) {
        return null;
    }
    $json = asc_b64url_dec($b64);
    if ($json === false) return null;
    $decoded = json_decode($json, true);
    return is_array($decoded) ? $decoded : null;
}

function asc_level_catalog(int $ceiling): array {
    $defined = [
        0 => [
            'title' => 'Threshold Guest',
            'trial' => 'Arrive at Twisted23.com/ascenders/',
            'perks' => 'Live Time0 clock · 575 KB blank/conforming 3-peaks · 385 KB / 2x non-conforming',
        ],
        1 => [
            'title' => 'SI-in-WiseLy Seeker',
            'trial' => 'Solve the two-part WiseLy riddle (is backwards -> SI; iiiis backwards -> siiii)',
            'perks' => 'Signed Portable Acode9 Passport · Ascension Notes starter presets',
        ],
        2 => [
            'title' => 'MUNSC Scribe',
            'trial' => 'Verify an Acode9 identifier + MUNSC case-sensitive cue (e.g. NormA, sbaMLc1)',
            'perks' => '80/day Wish-Window quota · Custom MUNSC rules & AXIF/1.0 provenance export',
        ],
        3 => [
            'title' => 'Three-Peaks Navigator',
            'trial' => 'Verify a 15-char conforming 3-peaks code (such as p1b^f5n for pi1browser full5screen)',
            'perks' => '750 KB conforming image cap · 120/day quota · Pi Browser (p1b^f5n) Full-Screen HUD',
        ],
        4 => [
            'title' => 'A3odex Keeper',
            'trial' => 'Bind Acode9 Passport to Twisted23 Parlour (/ucp/) + submit 4-tier FUNs/FUNCs/SxUNCs/SvnUNCs starter set',
            'perks' => 'Site-wide [A^4] Parlour & UCP badge · 1 reserved personal a8a triad',
        ],
        5 => [
            'title' => 'Spatial & Live-Text Adept',
            'trial' => 'Record a Twisted23 Spatial Gym feat (Botchee, FD, Backgammon, TopHat) or OCR -> AXIF note',
            'perks' => '1 MB conforming image cap · 180/day quota · Personalized aURL shortlink minting',
        ],
        6 => [
            'title' => 'Bridge Builder (2026 Cap)',
            'trial' => 'Compose a civil phpBBog / Plenty Talk Story [quote] packet or hold a verified AAid trial pass',
            'perks' => '2026 Pinnacle [A^6] badge · SLogBog & Life Data Savers Ambassador · 2 reserved a8a triads',
        ],
        7 => [
            'title' => 'Seventh-Year Steward (2027 Cap)',
            'trial' => 'Opens March 18, 2027 (Time0 Year 7): Co-steward a GPADA Free-Kit / Charity Derby, Pi pool, or Founder seal',
            'perks' => '2027 Pinnacle [A^7] Steward seal · Priority ecosystem aURLs · 2028 Horizon council seat',
        ],
    ];

    $levels = [];
    for ($lvl = 0; $lvl <= ASC_MAX_TOTAL; $lvl++) {
        $glyph = asc_glyph($lvl);
        $unlockYear = 2020 + $lvl;
        if ($lvl <= 7 && isset($defined[$lvl])) {
            $levels[] = [
                'level' => $lvl,
                'glyph' => $glyph,
                'unlockYear' => $unlockYear,
                'unlockedByEpoch' => ($lvl <= $ceiling),
                'shrouded' => false,
                'title' => $defined[$lvl]['title'],
                'trial' => $defined[$lvl]['trial'],
                'perks' => $defined[$lvl]['perks'],
            ];
        } else {
            $levels[] = [
                'level' => $lvl,
                'glyph' => $glyph,
                'unlockYear' => $unlockYear,
                'unlockedByEpoch' => ($lvl <= $ceiling),
                'shrouded' => true,
                'title' => $lvl === 36 ? 'Ascension Line Horizon (|)' : ($lvl === 37 ? 'Summit Peak (^)' : "Sealed Horizon {$glyph}"),
                'trial' => "Sealed until Time0 Anniversary {$unlockYear}",
                'perks' => 'Veiled beyond the 2027 Level 7 horizon',
            ];
        }
    }
    return $levels;
}

function asc_read_store(): array {
    $file = asc_data_dir() . '/ascenders.runtime.json';
    return tw23_read_json($file, ['passports' => [], 'reservedTriads' => []]);
}

function asc_write_store(array $store): void {
    $file = asc_data_dir() . '/ascenders.runtime.json';
    tw23_write_json($file, $store);
}

function asc_sync_parlour_user(int $userId, int $rank, string $acode9): void {
    $usersFile = tw23_data_dir() . '/users.runtime.json';
    $data = tw23_seed_users_if_needed();
    $changed = false;
    foreach ($data['users'] as &$u) {
        if ((int)($u['id'] ?? 0) === $userId) {
            $prev = (int)($u['ascender_level'] ?? 0);
            if ($rank >= $prev || empty($u['acode9_passport'])) {
                $u['ascender_level'] = max($prev, $rank);
                $u['ascender_glyph'] = asc_glyph($u['ascender_level']);
                $u['acode9_passport'] = $acode9;
                $changed = true;
            }
            break;
        }
    }
    unset($u);
    if ($changed) {
        tw23_write_json($usersFile, $data);
    }
}

if (defined('TW23_ASCENDERS_LIB_ONLY') && TW23_ASCENDERS_LIB_ONLY === true) {
    return;
}

$now = time();
$ceiling = asc_max_level_at($now);
$action = trim((string)($_GET['action'] ?? 'status'));
$method = strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET'));
$body = ($method === 'POST') ? asc_body() : [];

$headerToken = $_SERVER['HTTP_X_ASCENDER_PASSPORT'] ?? ($body['passport'] ?? ($_GET['passport'] ?? ''));
$passport = asc_verify_passport(is_string($headerToken) ? $headerToken : '');
$sessionCtx = tw23_current_session('/ascenders/');

if ($action === 'status') {
    $elapsed = max(0, $now - ASC_T0UX);
    asc_json_out(200, [
        'ok' => true,
        'nowUnix' => $now,
        'nowIso' => gmdate('Y-m-d\TH:i:s\Z', $now),
        'jesusClock' => asc_encode_b38($elapsed),
        'epochCeiling' => $ceiling,
        'epochGlyph' => asc_glyph($ceiling),
        'maxLevel2027' => 7,
        'totalLevels' => 38,
        'nextUnlock' => asc_next_unlock_info($now),
        'passport' => $passport,
        'parlourUser' => $sessionCtx ? tw23_sanitize_user($sessionCtx['user'], false) : null,
        'levels' => asc_level_catalog($ceiling),
    ]);
}

if ($action === 'mint_passport' && $method === 'POST') {
    $store = asc_read_store();
    if ($passport && !empty($passport['acode9'])) {
        $token = asc_sign_passport($passport);
        asc_json_out(200, ['ok' => true, 'passport' => $passport, 'token' => $token]);
    }
    $acode9 = asc_mint_acode9($now, $store['passports'] ?? []);
    $fresh = [
        'acode9' => $acode9,
        'rank' => 0,
        'glyph' => '0',
        'deeds' => [],
        'reservedTriads' => [],
        'userId' => $sessionCtx ? (int)$sessionCtx['user']['id'] : null,
        'username' => $sessionCtx ? (string)$sessionCtx['user']['username'] : null,
        'issuedAtIso' => gmdate('Y-m-d\TH:i:s\Z', $now),
    ];
    $store['passports'][$acode9] = $fresh;
    asc_write_store($store);
    $token = asc_sign_passport($fresh);
    asc_json_out(200, ['ok' => true, 'passport' => $fresh, 'token' => $token]);
}

if ($action === 'verify_deed' && $method === 'POST') {
    $targetLevel = (int)($body['level'] ?? 0);
    if ($targetLevel < 1 || $targetLevel > ASC_MAX_TOTAL) {
        asc_json_out(400, ['ok' => false, 'error' => 'Target level must be between 1 and 37.']);
    }

    // Strict Time0 Epoch Ceiling Gate (Max Level 6 in 2026, Max Level 7 in 2027)
    if ($targetLevel > $ceiling) {
        $unlockYear = 2020 + $targetLevel;
        $unlockTs = gmmktime(14, 9, 31, 3, 18, $unlockYear);
        asc_json_out(403, [
            'ok' => false,
            'epochSealed' => true,
            'currentCeiling' => $ceiling,
            'targetLevel' => $targetLevel,
            'unlockIso' => gmdate('Y-m-d\TH:i:s\Z', $unlockTs),
            'error' => "LeveL {$targetLevel} ('" . asc_glyph($targetLevel) . "') is sealed by Time0 until " . gmdate('Y-m-d H:i:s', $unlockTs) . " UTC (active ceiling: LeveL {$ceiling}).",
        ]);
    }

    $store = asc_read_store();
    if (!$passport || empty($passport['acode9'])) {
        $acode9 = asc_mint_acode9($now, $store['passports'] ?? []);
        $passport = [
            'acode9' => $acode9,
            'rank' => 0,
            'glyph' => '0',
            'deeds' => [],
            'reservedTriads' => [],
            'userId' => $sessionCtx ? (int)$sessionCtx['user']['id'] : null,
            'username' => $sessionCtx ? (string)$sessionCtx['user']['username'] : null,
            'issuedAtIso' => gmdate('Y-m-d\TH:i:s\Z', $now),
        ];
    }

    $curRank = (int)($passport['rank'] ?? 0);
    if ($targetLevel > $curRank + 1) {
        asc_json_out(400, [
            'ok' => false,
            'error' => "Complete LeveL " . ($curRank + 1) . " first before attempting LeveL {$targetLevel}.",
        ]);
    }

    // Deed-specific verification
    if ($targetLevel === 1) {
        $p1 = strtolower(trim((string)($body['part1'] ?? '')));
        $p2 = strtolower(trim((string)($body['part2'] ?? '')));
        if ($p1 !== 'si' || $p2 !== 'siiii') {
            asc_json_out(400, [
                'ok' => false,
                'error' => 'Check both riddle answers: "is" backwards inside WiseLy (-> si) and "iiiis" backwards (-> siiii).',
            ]);
        }
        $passport['deeds']['L1'] = ['riddle' => 'SI-in-WiseLy', 'at' => gmdate('c', $now)];
    } elseif ($targetLevel === 2) {
        $candAcode = trim((string)($body['acode9Sample'] ?? $passport['acode9']));
        $munsc = trim((string)($body['munscCue'] ?? ''));
        $validMunsc = preg_match('/^[A-Za-z0-9]{4,7}$/', $munsc) === 1
            && ($munsc !== strtolower($munsc) || preg_match('/[0-9]/', $munsc) === 1);
        if (!asc_is_valid_acode9($candAcode) || !$validMunsc) {
            asc_json_out(400, [
                'ok' => false,
                'error' => 'Provide a valid 9-char Acode9 (e.g. Ab2p^a40z) and a 4-to-7 char case/digit MUNSC cue (e.g. NormA, sbaMLc1, WiseLy).',
            ]);
        }
        $passport['deeds']['L2'] = ['acode9' => $candAcode, 'munsc' => $munsc, 'at' => gmdate('c', $now)];
    } elseif ($targetLevel === 3) {
        $slug3p = trim((string)($body['threePeaksSlug'] ?? ''));
        $decodedTs = asc_decode_3peaks($slug3p);
        if ($decodedTs === null || strlen($slug3p) !== 15) {
            asc_json_out(400, [
                'ok' => false,
                'error' => 'Provide a valid 15-character 3-peaks code (such as 2p7-p1b-f5n-xb6 minted via Wish-Window p1b^f5n).',
            ]);
        }
        $passport['deeds']['L3'] = ['slug' => $slug3p, 'decodedUnix' => $decodedTs, 'at' => gmdate('c', $now)];
    } elseif ($targetLevel === 4) {
        if (!$sessionCtx) {
            asc_json_out(401, [
                'ok' => false,
                'requiresParlourLogin' => true,
                'error' => 'LeveLs 4..7 bind to your Twisted23 Parlour profile. Sign in at /ucp/ first, then claim LeveL 4.',
            ]);
        }
        $funs = trim((string)($body['funs4'] ?? ''));
        $funcs = trim((string)($body['funcs5'] ?? ''));
        $sxuncs = trim((string)($body['sxuncs6'] ?? ''));
        $svnuncs = trim((string)($body['svnuncs7'] ?? ''));
        if (
            preg_match('/^[A-Za-z0-9]{4}$/', $funs) !== 1 ||
            preg_match('/^[A-Za-z0-9]{5}$/', $funcs) !== 1 ||
            preg_match('/^[A-Za-z0-9]{6}$/', $sxuncs) !== 1 ||
            preg_match('/^[A-Za-z0-9]{7}$/', $svnuncs) !== 1
        ) {
            asc_json_out(400, [
                'ok' => false,
                'error' => 'Enter one code for each exact length tier: FUNs (4c), FUNCs (5c), SxUNCs (6c), and SvnUNCs (7c).',
            ]);
        }
        $desiredTriad = strtolower(trim((string)($body['reservedTriad'] ?? '')));
        if ($desiredTriad !== '') {
            if (!asc_is_a8a($desiredTriad)) {
                asc_json_out(400, ['ok' => false, 'error' => 'Reserved triad must match [a-z][1-57-9][a-z] and pass clean screening.']);
            }
            $owner = $store['reservedTriads'][$desiredTriad] ?? null;
            if ($owner !== null && $owner !== $passport['acode9']) {
                asc_json_out(409, ['ok' => false, 'error' => "Triad '{$desiredTriad}' is already reserved by another Ascender."]);
            }
            $store['reservedTriads'][$desiredTriad] = $passport['acode9'];
            if (!in_array($desiredTriad, $passport['reservedTriads'] ?? [], true)) {
                $passport['reservedTriads'][] = $desiredTriad;
            }
        }
        $passport['userId'] = (int)$sessionCtx['user']['id'];
        $passport['username'] = (string)$sessionCtx['user']['username'];
        $passport['deeds']['L4'] = ['tiers' => [$funs, $funcs, $sxuncs, $svnuncs], 'at' => gmdate('c', $now)];
    } elseif ($targetLevel === 5) {
        if (!$sessionCtx) {
            asc_json_out(401, ['ok' => false, 'requiresParlourLogin' => true, 'error' => 'Sign in to your Parlour profile (/ucp/) for LeveL 5.']);
        }
        $stats = $sessionCtx['user']['stats'] ?? [];
        $hasSpatialFeat = ((int)($stats['botchee_best'] ?? 0) > 0)
            || ((int)($stats['backgammon_games'] ?? 0) > 0)
            || ((int)($stats['tophat_solved'] ?? 0) > 0)
            || ((int)($stats['fd_unlocked'] ?? 1) > 1)
            || ((int)($stats['slider_best_moves'] ?? 0) > 0);
        $axifDigest = trim((string)($body['axifNote'] ?? ''));
        if (!$hasSpatialFeat && strlen($axifDigest) < 16) {
            asc_json_out(400, [
                'ok' => false,
                'error' => 'Record a Spatial Gym score on Twisted23 or paste an AXIF / Live Text++ note excerpt (16+ chars).',
            ]);
        }
        $passport['deeds']['L5'] = ['spatialFeat' => $hasSpatialFeat, 'at' => gmdate('c', $now)];
    } elseif ($targetLevel === 6) {
        if (!$sessionCtx) {
            asc_json_out(401, ['ok' => false, 'requiresParlourLogin' => true, 'error' => 'Sign in to your Parlour profile (/ucp/) for LeveL 6.']);
        }
        $bbcode = trim((string)($body['phpbbPacket'] ?? ''));
        $isStaffOrWizard = in_array(($sessionCtx['user']['role'] ?? ''), ['founder', 'admin', 'moderator', 'wizard'], true);
        if (!$isStaffOrWizard && (!str_contains($bbcode, '[quote') || strlen($bbcode) < 30)) {
            asc_json_out(400, [
                'ok' => false,
                'error' => 'Submit a civil phpBBog / Plenty Talk Story [quote=...] packet (30+ chars) to unlock LeveL 6.',
            ]);
        }
        $secondTriad = strtolower(trim((string)($body['reservedTriad2'] ?? '')));
        if ($secondTriad !== '' && asc_is_a8a($secondTriad)) {
            $owner = $store['reservedTriads'][$secondTriad] ?? null;
            if ($owner === null || $owner === $passport['acode9']) {
                $store['reservedTriads'][$secondTriad] = $passport['acode9'];
                if (!in_array($secondTriad, $passport['reservedTriads'] ?? [], true)) {
                    $passport['reservedTriads'][] = $secondTriad;
                }
            }
        }
        $passport['deeds']['L6'] = ['bridge' => 'phpBBog-TalkStory', 'at' => gmdate('c', $now)];
    } elseif ($targetLevel === 7) {
        if (!$sessionCtx) {
            asc_json_out(401, ['ok' => false, 'requiresParlourLogin' => true, 'error' => 'Sign in to your Parlour profile (/ucp/) for LeveL 7.']);
        }
        $pledge = trim((string)($body['stewardPledge'] ?? ''));
        if (strlen($pledge) < 20) {
            asc_json_out(400, [
                'ok' => false,
                'error' => 'Describe your 2027 GPADA Free-Kit / Charity Derby or Pi community stewardship mission (20+ chars).',
            ]);
        }
        $passport['deeds']['L7'] = ['stewardPledge' => substr($pledge, 0, 240), 'at' => gmdate('c', $now)];
    }

    $passport['rank'] = max($curRank, $targetLevel);
    $passport['glyph'] = asc_glyph($passport['rank']);
    $store['passports'][$passport['acode9']] = $passport;
    asc_write_store($store);

    if (!empty($passport['userId'])) {
        asc_sync_parlour_user((int)$passport['userId'], (int)$passport['rank'], (string)$passport['acode9']);
    }

    $token = asc_sign_passport($passport);
    asc_json_out(200, [
        'ok' => true,
        'passport' => $passport,
        'token' => $token,
        'unlockedLevel' => $passport['rank'],
        'unlockedGlyph' => $passport['glyph'],
    ]);
}

asc_json_out(404, ['ok' => false, 'error' => "Unknown ascenders action: {$action}"]);
