<?php
declare(strict_types=1);

require_once __DIR__ . '/lib/bootstrap.php';
$config = tw23_load_config(__DIR__);

if (!headers_sent()) {
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store, private');
    header('CDN-Cache-Control: no-store');
    header('Cloudflare-CDN-Cache-Control: no-store');
}

function json_out(int $code, array $payload): never {
    http_response_code($code);
    echo json_encode($payload, JSON_UNESCAPED_SLASHES);
    exit;
}

function read_json_body(): array {
    $raw = file_get_contents('php://input');
    if ($raw === false || trim($raw) === '') return [];
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}

function is_https(): bool {
    if (!empty($_SERVER['HTTP_X_FORWARDED_PROTO'])) {
        return str_starts_with((string)$_SERVER['HTTP_X_FORWARDED_PROTO'], 'https');
    }
    return !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
}

function base_url_prefix(): string {
    $proto = is_https() ? 'https' : 'http';
    $host = $_SERVER['HTTP_X_FORWARDED_HOST'] ?? $_SERVER['HTTP_HOST'] ?? 'twisted23.com';
    $scriptDir = str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? ''));
    $basePath = ($scriptDir === '/' || $scriptDir === '.') ? '' : rtrim($scriptDir, '/');
    return "{$proto}://{$host}{$basePath}";
}

function client_ip(): string {
    return (string)($_SERVER['HTTP_CF_CONNECTING_IP'] ?? $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1');
}

function default_state(): array {
    return [
        'imagesBySlug' => [],
        'dailyUploadsByUserDay' => [],
    ];
}

function with_store(array $config, callable $fn): mixed {
    $dir = rtrim($config['data_dir'], '/');
    if (!is_dir($dir)) mkdir($dir, 0755, true);
    $file = $dir . '/twisted23-store.json';
    $fp = fopen($file, 'c+');
    if (!$fp) throw new RuntimeException('Cannot open data store');
    flock($fp, LOCK_EX);
    try {
        $raw = stream_get_contents($fp);
        $state = $raw ? (json_decode($raw, true) ?: default_state()) : default_state();
        $state = array_merge(default_state(), $state);
        $mutate = false;
        $result = $fn($state, $mutate);
        if ($mutate) {
            ftruncate($fp, 0);
            rewind($fp);
            fwrite($fp, json_encode($state, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
            fflush($fp);
        }
        return $result;
    } finally {
        flock($fp, LOCK_UN);
        fclose($fp);
    }
}

function detect_image_format(string $bytes): ?array {
    if (strlen($bytes) < 12) return null;
    if (substr($bytes, 0, 4) === "\x89PNG") return ['ext' => 'png', 'mime' => 'image/png'];
    if (substr($bytes, 0, 3) === "\xff\xd8\xff") return ['ext' => 'jpg', 'mime' => 'image/jpeg'];
    if (substr($bytes, 0, 4) === 'RIFF' && substr($bytes, 8, 4) === 'WEBP') return ['ext' => 'webp', 'mime' => 'image/webp'];
    if (substr($bytes, 0, 3) === 'GIF') return ['ext' => 'gif', 'mime' => 'image/gif'];
    return null;
}

function sanitize_slug(string $raw): string {
    $s = strtolower(trim($raw));
    $s = str_replace(["'", "’"], '', $s);
    $s = preg_replace('/[^a-z0-9]+/', '-', $s) ?? '';
    return substr(trim($s, '-'), 0, 40);
}

function encode_compact_time(int $n): string {
    $alpha = '0123456789abcdefghijklmnopqrstuvwxyz|^';
    if ($n <= 0) return '0';
    $out = '';
    while ($n > 0) {
        $out = $alpha[$n % 38] . $out;
        $n = intdiv($n, 38);
    }
    return $out;
}

function decode_compact_time(string $s): ?int {
    $alpha = '0123456789abcdefghijklmnopqrstuvwxyz|^';
    $total = 0;
    $len = strlen($s);
    for ($i = 0; $i < $len; $i++) {
        $ch = $s[$i];
        if ($ch === '_') $ch = '0';
        elseif ($ch === '-') $ch = '^';
        $idx = strpos($alpha, $ch);
        if ($idx === false) return null;
        $total = $total * 38 + $idx;
    }
    return $total;
}

function is_clean_alnum_tag(string $s): bool {
    if ($s === '' || preg_match('/^[0-9a-z]+$/', $s) !== 1) return false;
    $leet = strtr($s, ['0' => 'o', '1' => 'i', '3' => 'e', '4' => 'a', '5' => 's', '7' => 't', '8' => 'b']);
    $blocked = ['666', 'anal', 'anus', 'arse', 'bitch', 'btch', 'cock', 'c0ck', 'cunt', 'damn', 'dick', 'd1ck', 'dyke', 'fag', 'fck', 'fuk', 'fuck', 'hell', 'jizz', 'kike', 'klan', 'nazi', 'nig', 'n1g', 'porn', 'p0rn', 'puss', 'rape', 'shit', 'sh1t', 'slut', 'spic', 'twat', 'wank', 'whor', 'xxx'];
    foreach ($blocked as $b) {
        if (str_contains($s, $b) || str_contains($leet, $b)) return false;
    }
    return true;
}

function is_clean_acode_sequence(string $rawCode): bool {
    $joined = strtr(strtolower($rawCode), ['|' => '', '^' => '', '-' => '', '_' => '0']);
    $lettersOnly = preg_replace('/[0-9]/', '', $joined) ?? '';
    $digitsOnly = preg_replace('/[a-z]/', '', $joined) ?? '';
    $leetI = strtr($joined, ['0' => 'o', '1' => 'i', '3' => 'e', '4' => 'a', '5' => 's', '7' => 't', '8' => 'b', '9' => 'g']);
    $leetL = strtr($joined, ['0' => 'o', '1' => 'l', '3' => 'e', '4' => 'a', '5' => 's', '7' => 't', '8' => 'b', '9' => 'g']);
    $re = '/69|666|anal|anus|arse|bitch|btch|cock|c0ck|cunt|damn|dick|d1ck|dyke|fag|fck|fuk|fuck|hell|jizz|kike|klan|nazi|nig|n1g|porn|p0rn|puss|rape|shit|sh1t|slut|spic|twat|wank|whor|xxx/';
    return preg_match($re, $joined) !== 1
        && preg_match($re, $lettersOnly) !== 1
        && preg_match('/69|666/', $digitsOnly) !== 1
        && preg_match($re, $leetI) !== 1
        && preg_match($re, $leetL) !== 1;
}

function format_msd_triad(int $msdVal): string {
    $raw = substr(str_pad(encode_compact_time($msdVal), 3, '0', STR_PAD_LEFT), -3);
    return strtr($raw, ['0' => '_', '|' => '_', '^' => '-']);
}

function a8a_from_index(int $idx): string {
    $digits = '12345789';
    $count = 5408; // 26 * 8 * 26
    $i = (($idx % $count) + $count) % $count;
    $c0 = chr(97 + intdiv($i, 208));
    $rem = $i % 208;
    $c1 = $digits[intdiv($rem, 26)];
    $c2 = chr(97 + ($rem % 26));
    return $c0 . $c1 . $c2;
}

function is_a8a_triad(string $s): bool {
    return preg_match('/^[a-z][1-57-9][a-z]$/', $s) === 1;
}

function mint_acode_time_slug(int $unixSeconds, array $existing): array {
    static $a8aTriads = null;
    static $a8aVals = null;
    static $a8aClean = null;
    static $neededToCleanA8a = null;
    if ($a8aTriads === null) {
        $a8aTriads = [];
        $a8aVals = [];
        $a8aClean = [];
        $neededToCleanA8a = [];
        for ($i = 0; $i < 5408; $i++) {
            $t = a8a_from_index($i);
            $val = decode_compact_time($t) ?? 0;
            $clean = is_clean_acode_sequence($t);
            $a8aTriads[$i] = $t;
            $a8aVals[$i] = $val;
            $a8aClean[$i] = $clean;
            if ($clean) {
                $neededToCleanA8a[$val] = $i;
            }
        }
    }

    $epoch = 1584540571;
    $triadBase = 54872; // 38^3
    $a8aCount = 5408;
    $baseSec = max($epoch, $unixSeconds);
    $sec = $baseSec;
    $msdSkips = 0;
    $lastMsdVal = -1;
    $msd = '';
    $msdClean = false;

    for ($step = 0; $step < 2000; ) {
        $elapsed = $sec - $epoch;
        $msdVal = intdiv($elapsed, $triadBase);
        $lsdVal = $elapsed % $triadBase;
        if ($msdVal !== $lastMsdVal) {
            $lastMsdVal = $msdVal;
            $msd = format_msd_triad($msdVal);
            $msdNorm = str_replace('_', '0', $msd);
            $msdClean = is_clean_acode_sequence($msdNorm);
        }

        if (!$msdClean) {
            if ($msdSkips >= 64) break;
            $msdSkips++;
            $sec = $epoch + ($msdVal + 1) * $triadBase;
            continue;
        }

        $ld0 = intdiv($lsdVal, 1444);
        if ($ld0 >= 10 && $ld0 <= 35) {
            $lrem = $lsdVal - $ld0 * 1444;
            $ld1 = intdiv($lrem, 38);
            if (($ld1 >= 1 && $ld1 <= 5) || ($ld1 >= 7 && $ld1 <= 9)) {
                $ld2 = $lrem - $ld1 * 38;
                if ($ld2 >= 10 && $ld2 <= 35) {
                    $directLsd = encode_compact_time($lsdVal);
                    $canonical = "{$msd}^{$directLsd}";
                    $slug = "{$msd}-{$directLsd}";
                    if (is_clean_acode_sequence($canonical) && !isset($existing[$slug]) && !isset($existing[$canonical])) {
                        return ['slug' => $slug, 'canonical' => $canonical];
                    }
                }
            }
        }

        $diff = ($lsdVal - $msdVal + $triadBase) % $triadBase;
        $c1 = intdiv($diff % 1444, 38);
        if ($c1 >= 3 && $c1 <= 29) {
            $e1 = ($elapsed ^ 0x9e3779b9) * 2654435761;
            $e2 = ($elapsed ^ 0x85ebca6b) * 3266489917;
            $baseDiff = $lsdVal - $msdVal;

            for ($attempt = 0; $attempt < 5000; $attempt++) {
                $attempt1 = $attempt + 1;
                $h1 = ($e1 ^ ($attempt1 * 2246822519)) & 0x7fffffff;
                $h2 = ($e2 ^ ($attempt1 * 668265263)) & 0x7fffffff;
                $idx1 = $h1 % $a8aCount;
                $idx2 = $h2 % $a8aCount;

                $needed = ($baseDiff - $a8aVals[$idx1] - $a8aVals[$idx2]) % $triadBase;
                if ($needed < 0) $needed += $triadBase;

                $idx3 = $neededToCleanA8a[$needed] ?? -1;
                if ($idx3 < 0) continue;
                if (!$a8aClean[$idx1] || !$a8aClean[$idx2]) continue;

                $t1 = $a8aTriads[$idx1];
                $t2 = $a8aTriads[$idx2];
                $t3 = $a8aTriads[$idx3];
                $canonical = "{$msd}^{$t1}^{$t2}^{$t3}";
                if (!is_clean_acode_sequence($canonical)) continue;
                $slug = "{$msd}-{$t1}-{$t2}-{$t3}";
                if (!isset($existing[$slug]) && !isset($existing[$canonical])) {
                    return ['slug' => $slug, 'canonical' => $canonical];
                }
            }
        }

        $step++;
        $sec++;
    }

    throw new RuntimeException('Unable to mint unique acode time slug.');
}

function encode_peak_triad_canonical(int $val): string {
    $m = (($val % 54872) + 54872) % 54872;
    return substr(str_pad(encode_compact_time($m), 3, '0', STR_PAD_LEFT), -3);
}

function encode_peak_triad_urlsafe(int $val): string {
    return strtr(encode_peak_triad_canonical($val), ['|' => '_', '^' => '-']);
}

function decode_peak_triad(string $triad): ?int {
    $alpha = '0123456789abcdefghijklmnopqrstuvwxyz|^';
    $s = strtolower($triad);
    if (strlen($s) !== 3) return null;
    $total = 0;
    for ($i = 0; $i < 3; $i++) {
        $ch = $s[$i];
        if ($ch === '_') $ch = '|';
        elseif ($ch === '-') $ch = '^';
        $idx = strpos($alpha, $ch);
        if ($idx === false) return null;
        $total = $total * 38 + $idx;
    }
    return $total;
}

function parse_wish_window(string $raw, array $config): array {
    $maxBytes = (int)($config['max_image_bytes'] ?? (575 * 1024));
    $nonConfMax = min($maxBytes, (int)($config['nonconforming_max_bytes'] ?? (385 * 1024)));
    $nonConfCost = max(1, (int)($config['nonconforming_quota_cost'] ?? 2));
    $trimmed = trim($raw);
    if ($trimmed === '') {
        return [
            'kind' => 'blank',
            'conforming' => true,
            'triads' => [],
            'canonicalWish' => '',
            'quotaCost' => 1,
            'maxBytes' => $maxBytes,
        ];
    }

    $aliases = [
        'pi1browser' => 'p1b',
        'pibrowser' => 'p1b',
        'full5screen' => 'f5n',
        'fullscreen' => 'f5n',
    ];
    $tokens = preg_split('/[\s^\/-]+/', strtolower($trimmed), -1, PREG_SPLIT_NO_EMPTY) ?: [];
    if (count($tokens) >= 1 && count($tokens) <= 6) {
        $mapped = array_map(fn(string $t) => $aliases[$t] ?? $t, $tokens);
        $allValid = true;
        foreach ($mapped as $t) {
            if (!is_a8a_triad($t) || !is_clean_acode_sequence($t)) {
                $allValid = false;
                break;
            }
        }
        if ($allValid) {
            $canonicalWish = implode('^', $mapped);
            if (is_clean_acode_sequence($canonicalWish)) {
                $peaks = count($mapped) === 1 ? 3 : count($mapped) + 1;
                return [
                    'kind' => 'conforming',
                    'conforming' => true,
                    'triads' => $mapped,
                    'peaks' => $peaks,
                    'slugLength' => 3 + 4 * $peaks,
                    'canonicalWish' => $canonicalWish,
                    'quotaCost' => 1,
                    'maxBytes' => $maxBytes,
                ];
            }
        }
    }

    return [
        'kind' => 'nonconforming',
        'conforming' => false,
        'triads' => [],
        'peaks' => 0,
        'slugLength' => 0,
        'canonicalWish' => '',
        'quotaCost' => $nonConfCost,
        'maxBytes' => $nonConfMax,
    ];
}

function mint_conforming_3peaks_slug(array $wishTriads, int $unixSeconds, array $existing): array {
    $aliases = [
        'pi1browser' => 'p1b',
        'pibrowser' => 'p1b',
        'full5screen' => 'f5n',
        'fullscreen' => 'f5n',
    ];
    $cleanWish = array_values(array_map(fn($t) => $aliases[strtolower((string)$t)] ?? strtolower((string)$t), $wishTriads));
    $epoch = 1584540571;
    $triadBase = 54872;
    $a8aCount = 5408;
    $baseSec = max($epoch, $unixSeconds);
    $sec = $baseSec;
    $msdSkips = 0;
    $lastMsdVal = -1;
    $msd = '';
    $msdClean = false;

    $t1 = $cleanWish[0];
    $wishSum = 0;
    foreach ($cleanWish as $wt) {
        $wishSum += decode_peak_triad($wt) ?? 0;
    }

    for ($step = 0; $step < 2000; ) {
        $elapsed = $sec - $epoch;
        $msdVal = intdiv($elapsed, $triadBase);
        $lsdVal = $elapsed % $triadBase;
        if ($msdVal !== $lastMsdVal) {
            $lastMsdVal = $msdVal;
            $msd = format_msd_triad($msdVal);
            $msdClean = is_clean_acode_sequence(str_replace('_', '0', $msd));
        }

        if (!$msdClean) {
            if ($msdSkips >= 64) break;
            $msdSkips++;
            $sec = $epoch + ($msdVal + 1) * $triadBase;
            continue;
        }

        if (count($cleanWish) >= 2) {
            $peaks = count($cleanWish) + 1;
            $needed = (($lsdVal - $msdVal - $wishSum) % $triadBase + $triadBase) % $triadBase;
            $snCanon = encode_peak_triad_canonical($needed);
            $snSlug = is_a8a_triad($snCanon) ? $snCanon : encode_peak_triad_urlsafe($needed);
            $canonBody = implode('^', $cleanWish);
            $slugBody = implode('-', $cleanWish);
            $canonical = "{$msd}^{$canonBody}^{$snCanon}";
            $slug = "{$msd}-{$slugBody}-{$snSlug}";
            if (is_clean_acode_sequence($canonical) && is_clean_acode_sequence($slug) && !isset($existing[$slug]) && !isset($existing[$canonical])) {
                return ['slug' => $slug, 'canonical' => $canonical, 'peaks' => $peaks, 'unixSeconds' => $sec];
            }
        } else {
            $rem = (($lsdVal - $msdVal - $wishSum) % $triadBase + $triadBase) % $triadBase;
            $seed = (($elapsed ^ 0x9e3779b9) * 2654435761) & 0x7fffffff;
            for ($attempt = 0; $attempt < 600; $attempt++) {
                $idx2 = (($seed + ($attempt + 1) * 2246822519) & 0x7fffffff) % $a8aCount;
                $t2 = a8a_from_index($idx2);
                if (!is_clean_acode_sequence($t2)) continue;
                $v2 = decode_peak_triad($t2) ?? 0;
                $needed = ($rem - $v2 + $triadBase) % $triadBase;
                $cand3 = encode_peak_triad_canonical($needed);
                if (!is_a8a_triad($cand3) || !is_clean_acode_sequence($cand3)) continue;
                $canonical = "{$msd}^{$t1}^{$t2}^{$cand3}";
                $slug = "{$msd}-{$t1}-{$t2}-{$cand3}";
                if (is_clean_acode_sequence($canonical) && is_clean_acode_sequence($slug) && !isset($existing[$slug]) && !isset($existing[$canonical])) {
                    return ['slug' => $slug, 'canonical' => $canonical, 'peaks' => 3, 'unixSeconds' => $sec];
                }
            }
            for ($attempt = 0; $attempt < 200; $attempt++) {
                $idx2 = (($seed + ($attempt + 1) * 668265263) & 0x7fffffff) % $a8aCount;
                $t2 = a8a_from_index($idx2);
                if (!is_clean_acode_sequence($t2)) continue;
                $v2 = decode_peak_triad($t2) ?? 0;
                $needed = ($rem - $v2 + $triadBase) % $triadBase;
                $s3Canon = encode_peak_triad_canonical($needed);
                $s3Slug = encode_peak_triad_urlsafe($needed);
                $canonical = "{$msd}^{$t1}^{$t2}^{$s3Canon}";
                $slug = "{$msd}-{$t1}-{$t2}-{$s3Slug}";
                if (is_clean_acode_sequence($canonical) && is_clean_acode_sequence($slug) && !isset($existing[$slug]) && !isset($existing[$canonical])) {
                    return ['slug' => $slug, 'canonical' => $canonical, 'peaks' => 3, 'unixSeconds' => $sec];
                }
            }
        }

        $step++;
        $sec++;
    }

    throw new RuntimeException('Unable to mint unique conforming N-peaks slug.');
}

function decode_acode_timestamp(string $code): ?int {
    $s = strtolower(trim($code));
    $epoch = 1584540571;
    $triadBase = 54872;
    $isSep = fn(string $c) => $c === '^' || $c === '-';

    if (strlen($s) === 7 && $isSep($s[3])) {
        $msd = substr($s, 0, 3);
        $p1 = substr($s, 4, 3);
        if (!is_a8a_triad($p1)) return null;
        $msdVal = decode_compact_time($msd);
        $lsdVal = decode_peak_triad($p1);
        if ($msdVal === null || $lsdVal === null) return null;
        return $epoch + $msdVal * $triadBase + $lsdVal;
    }

    $len = strlen($s);
    if ($len >= 15 && ($len - 3) % 4 === 0) {
        $peaks = intdiv($len - 3, 4);
        if ($peaks >= 3 && $peaks <= 7) {
            for ($i = 0; $i < $peaks; $i++) {
                if (!$isSep($s[3 + 4 * $i])) return null;
            }
            $msdVal = decode_compact_time(substr($s, 0, 3));
            if ($msdVal === null) return null;
            $sum = $msdVal;
            for ($i = 0; $i < $peaks; $i++) {
                $triad = substr($s, 4 + 4 * $i, 3);
                if ($i < $peaks - 1 && !is_a8a_triad($triad)) return null;
                $v = decode_peak_triad($triad);
                if ($v === null) return null;
                $sum += $v;
            }
            $lsdVal = $sum % $triadBase;
            return $epoch + $msdVal * $triadBase + $lsdVal;
        }
    }

    return null;
}

function pick_unique_slug(string $customName, array $existing, array $config = [], ?int $now = null): array {
    $ts = $now ?? time();
    $wish = parse_wish_window($customName, $config);
    if ($wish['kind'] === 'blank') {
        return mint_acode_time_slug($ts, $existing);
    }
    if ($wish['kind'] === 'conforming') {
        return mint_conforming_3peaks_slug($wish['triads'], $ts, $existing);
    }
    $prefix = sanitize_slug($customName);
    if ($prefix === '' || !is_clean_acode_sequence($prefix)) {
        return mint_acode_time_slug($ts, $existing);
    }
    $epoch = 1584540571;
    $agyOffset = 10 * 38 * 38 + 16 * 38 + 34; // decode("agy")
    $baseSec = max($epoch, $ts);
    for ($bump = 0; $bump < 90; $bump++) {
        $elapsed = ($baseSec + $bump) - $epoch;
        $anchor = encode_compact_time($elapsed + $agyOffset);
        if (!is_clean_alnum_tag($anchor) || !is_clean_acode_sequence($anchor)) continue;
        $cand = "{$prefix}-{$anchor}-agy";
        if (!is_clean_acode_sequence($cand)) continue;
        if (!isset($existing[$cand])) return ['slug' => $cand, 'canonical' => null];
    }
    return mint_acode_time_slug($baseSec, $existing);
}

function build_snippets(string $root, array $rec): array {
    $direct = "{$root}/i/" . rawurlencode($rec['storedFilename']);
    $viewer = "{$root}/?img=" . rawurlencode($rec['slug']);
    $alt = str_replace(['"', '<', '>'], '', ($rec['title'] ?? $rec['slug']));
    return [
        'directUrl' => $direct,
        'viewerUrl' => $viewer,
        'html' => "<img src=\"{$direct}\" alt=\"{$alt}\" />",
        'htmlLinked' => "<a href=\"{$viewer}\"><img src=\"{$direct}\" alt=\"{$alt}\" /></a>",
        'bbcode' => "[img]{$direct}[/img]",
        'bbcodeLinked' => "[url={$viewer}][img]{$direct}[/img][/url]",
        'markdown' => "![{$alt}]({$direct})",
        'markdownLinked' => "[![{$alt}]({$direct})]({$viewer})",
        'bytes' => $rec['bytes'],
    ];
}

function resolve_ascender_passport_perks(array $config): array {
    $baseMax = (int)$config['max_image_bytes'];
    $baseQuota = (int)(getenv('TWISTED23_IP_DAILY_QUOTA') ?: 60);
    $rawHeader = trim((string)($_SERVER['HTTP_X_ASCENDER_PASSPORT'] ?? ''));
    if ($rawHeader === '' || !str_contains($rawHeader, '.')) {
        return ['rank' => 0, 'maxBytes' => $baseMax, 'dailyQuota' => $baseQuota, 'acode9' => null];
    }

    [$b64, $sig] = explode('.', $rawHeader, 2);
    $candidates = [
        dirname(__DIR__, 2) . '/auth/data/.ascender_secret.key',
        dirname(__DIR__) . '/auth/data/.ascender_secret.key',
    ];
    $secret = '';
    foreach ($candidates as $sf) {
        if (is_file($sf)) {
            $s = trim((string)@file_get_contents($sf));
            if ($s !== '') {
                $secret = $s;
                break;
            }
        }
    }
    if ($secret === '') {
        $secret = (string)($config['auth_secret'] ?? '');
    }
    if ($secret === '') {
        return ['rank' => 0, 'maxBytes' => $baseMax, 'dailyQuota' => $baseQuota, 'acode9' => null];
    }

    $expected = hash_hmac('sha256', $b64, $secret);
    if (!hash_equals($expected, strtolower($sig))) {
        return ['rank' => 0, 'maxBytes' => $baseMax, 'dailyQuota' => $baseQuota, 'acode9' => null];
    }

    $json = base64_decode(strtr($b64, '-_', '+/'), true);
    $payload = $json ? json_decode($json, true) : null;
    if (!is_array($payload)) {
        return ['rank' => 0, 'maxBytes' => $baseMax, 'dailyQuota' => $baseQuota, 'acode9' => null];
    }

    $rank = max(0, min(37, (int)($payload['rank'] ?? 0)));
    $maxBytes = $baseMax;
    $quota = $baseQuota;
    if ($rank >= 5) {
        $maxBytes = max($baseMax, 1024 * 1024);
        $quota = max($baseQuota, 180);
    } elseif ($rank >= 3) {
        $maxBytes = max($baseMax, 750 * 1024);
        $quota = max($baseQuota, 120);
    } elseif ($rank >= 2) {
        $quota = max($baseQuota, 80);
    }

    return [
        'rank' => $rank,
        'maxBytes' => $maxBytes,
        'dailyQuota' => $quota,
        'acode9' => isset($payload['acode9']) ? (string)$payload['acode9'] : null,
    ];
}

if (defined('TW23_API_LIB_ONLY') && TW23_API_LIB_ONLY === true) {
    return;
}

$route = trim((string)($_GET['route'] ?? ''), '/');
if ($route === '' && isset($_SERVER['REQUEST_URI'])) {
    $p = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?: '';
    if (($pos = strpos($p, '/api/')) !== false) {
        $route = trim(substr($p, $pos + 5), '/');
    }
}
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$perks = resolve_ascender_passport_perks($config);
$config['max_image_bytes'] = $perks['maxBytes'];

if ($route === 'health') {
    $maxAll = (int)$config['max_image_bytes'];
    $nonConfMax = min($maxAll, (int)($config['nonconforming_max_bytes'] ?? (385 * 1024)));
    json_out(200, [
        'ok' => true,
        'brand' => 'Twisted23',
        'runtime' => 'hostinger-php',
        'maxImageBytes' => $maxAll,
        'nonConformingMaxImageBytes' => $nonConfMax,
        'dailyIpQuota' => (int)$perks['dailyQuota'],
        'ascenderRank' => (int)$perks['rank'],
    ]);
}

if ($route === 'images/upload' && $method === 'POST') {
    $ctype = strtolower((string)($_SERVER['CONTENT_TYPE'] ?? ''));
    $bytes = '';
    $customName = '';

    if (isset($_FILES['file']) && is_uploaded_file($_FILES['file']['tmp_name'])) {
        $bytes = (string)file_get_contents($_FILES['file']['tmp_name']);
        $customName = (string)($_POST['customName'] ?? $_POST['subject'] ?? '');
    } elseif (str_starts_with($ctype, 'application/octet-stream')) {
        $bytes = (string)file_get_contents('php://input');
        $customName = rawurldecode((string)($_SERVER['HTTP_X_CUSTOM_NAME'] ?? ''));
    } else {
        $b = read_json_body();
        $rawData = (string)($b['dataBase64'] ?? $b['dataUrl'] ?? '');
        if ($rawData === '') json_out(400, ['ok' => false, 'error' => 'Choose an image file to upload.']);
        $b64 = str_contains($rawData, ',') ? explode(',', $rawData, 2)[1] : $rawData;
        $decoded = base64_decode($b64, true);
        if ($decoded === false) json_out(400, ['ok' => false, 'error' => 'Invalid image data.']);
        $bytes = $decoded;
        $customName = (string)($b['customName'] ?? $b['subject'] ?? '');
    }

    if ($bytes === '') json_out(400, ['ok' => false, 'error' => 'Empty image payload.']);
    $fmt = detect_image_format($bytes);
    if (!$fmt) json_out(400, ['ok' => false, 'error' => 'Only PNG, JPEG, WebP, and GIF images are supported.']);

    $wish = parse_wish_window($customName, $config);
    $maxBytes = (int)$config['max_image_bytes'];
    if (strlen($bytes) > $maxBytes) {
        json_out(413, ['ok' => false, 'error' => 'Image exceeds ' . round($maxBytes / 1024) . ' KB limit.']);
    }
    if (!$wish['conforming'] && strlen($bytes) > $wish['maxBytes']) {
        json_out(413, [
            'ok' => false,
            'error' => 'Non-conforming wish tags cap at ' . round($wish['maxBytes'] / 1024) . ' KB. Enter conforming a8a tags like p1b^f5n or leave blank for ' . round($maxBytes / 1024) . ' KB.',
        ]);
    }

    $dailyQuota = (int)$perks['dailyQuota'];
    $ipHash = substr(hash('sha256', client_ip()), 0, 12);
    $dayKey = 'ip:' . $ipHash . ':' . gmdate('Y-m-d');
    $rootUrl = base_url_prefix();

    $res = with_store($config, function (array &$state, bool &$mutate) use ($config, $customName, $wish, $bytes, $fmt, $dailyQuota, $dayKey, $rootUrl): array {
        $used = (int)($state['dailyUploadsByUserDay'][$dayKey] ?? 0);
        $cost = (int)$wish['quotaCost'];
        if ($used + $cost > $dailyQuota) {
            $errMsg = (!$wish['conforming'] && $used + 1 <= $dailyQuota)
                ? "Non-conforming wish tags require {$cost} quota units ({$used}/{$dailyQuota} used). Enter conforming a8a tags like p1b^f5n or leave blank to use your remaining 1x slot."
                : 'Daily upload limit reached. Try again tomorrow.';
            return ['status' => 429, 'body' => ['ok' => false, 'error' => $errMsg]];
        }

        $minted = pick_unique_slug($customName, $state['imagesBySlug'], $config);
        $slug = $minted['slug'];
        $storedName = "{$slug}.{$fmt['ext']}";
        $uploadsDir = rtrim($config['data_dir'], '/') . '/uploads';
        if (!is_dir($uploadsDir)) mkdir($uploadsDir, 0755, true);
        file_put_contents($uploadsDir . '/' . $storedName, $bytes);

        $title = substr(trim($customName), 0, 64) ?: ($minted['canonical'] ?? $slug);
        $rec = [
            'slug' => $slug,
            'canonical' => $minted['canonical'] ?? null,
            'wishMode' => $wish['kind'],
            'conforming' => $wish['conforming'],
            'quotaCost' => $cost,
            'storedFilename' => $storedName,
            'ext' => $fmt['ext'],
            'mime' => $fmt['mime'],
            'bytes' => strlen($bytes),
            'etag' => '"' . substr(hash('sha256', $bytes), 0, 16) . '"',
            'title' => $title,
            'createdAtIso' => gmdate('c'),
        ];
        $rec['snippets'] = build_snippets($rootUrl, $rec);
        $state['imagesBySlug'][$slug] = $rec;
        $state['dailyUploadsByUserDay'][$dayKey] = $used + $cost;
        $mutate = true;

        return [
            'status' => 200,
            'body' => [
                'ok' => true,
                'image' => $rec,
                'hosting' => [
                    'maxImageBytes' => (int)$wish['maxBytes'],
                    'dailyQuota' => $dailyQuota,
                    'dailyUsed' => $used + $cost,
                    'dailyRemaining' => max(0, $dailyQuota - ($used + $cost)),
                    'quotaCost' => $cost,
                ],
            ],
        ];
    });
    json_out($res['status'], $res['body']);
}

if (str_starts_with($route, 'images/')) {
    $rawLookup = strtolower(trim(rawurldecode(substr($route, 7))));
    $slug = preg_replace('/[^0-9a-z_-]/', '', strtr($rawLookup, ['|' => '_', '^' => '-'])) ?? '';
    $rec = with_store($config, fn(array $state) => $state['imagesBySlug'][$slug] ?? null);
    if (!$rec) json_out(404, ['ok' => false, 'error' => 'Image not found']);
    $rec['snippets'] = build_snippets(base_url_prefix(), $rec);
    json_out(200, ['ok' => true, 'image' => $rec]);
}

json_out(404, ['ok' => false, 'error' => "Unknown API route: {$route}"]);
