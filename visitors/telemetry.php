<?php
declare(strict_types=1);

/**
 * Twisted23, sLogbog & gravity-wizards — Unified Real-Time Multi-Realm Visitor Telemetry
 * - Color-differentiated realms:
 *     * twisted23       -> #f59e0b (Parlour Amber Gold)
 *     * slogbog         -> #10b981 (sLogbog Frog Emerald)
 *     * gravity-wizards -> #38bdf8 (Gravity Wizards Sky Cyan)
 * - Supports JSON POST/GET, cross-domain CORS widget pings, 1x1 GIF beacons (?action=beacon&site=...),
 *   embedded forum asset referrers (?action=asset&file=...), and 60s cached live phpBB/storefront pulse.
 * - Privacy-first: never stores raw IP addresses (daily salted SHA-256 hashes only).
 */

$ORIGIN = trim((string)($_SERVER['HTTP_ORIGIN'] ?? ''));
if ($ORIGIN !== '' && preg_match('#^https?://([a-z0-9\-]+\.)*(twisted23\.com|slogbog\.com|slogfrog\.com|gravitywizards\.com|gpada\.org)(:\d+)?$#i', $ORIGIN)) {
    header('Access-Control-Allow-Origin: ' . $ORIGIN);
    header('Vary: Origin');
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
}

if (strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET')) === 'OPTIONS') {
    http_response_code(204);
    exit;
}

header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

function site_catalog(): array {
    return [
        'twisted23' => [
            'id' => 'twisted23',
            'label' => 'Twisted23',
            'color' => '#f59e0b',
            'badge' => '🎩',
            'url' => 'https://www.twisted23.com/',
        ],
        'slogbog' => [
            'id' => 'slogbog',
            'label' => 'sLogbog',
            'color' => '#10b981',
            'badge' => '🐸',
            'url' => 'https://slogbog.com/',
        ],
        'gravity-wizards' => [
            'id' => 'gravity-wizards',
            'label' => 'gravity-wizards',
            'color' => '#38bdf8',
            'badge' => '🦉',
            'url' => 'https://gravitywizards.com/',
        ],
    ];
}

function detect_site(string $explicitSite, string $host, string $referer, string $origin): string {
    $raw = strtolower(trim($explicitSite));
    if (in_array($raw, ['slogbog', 'slogfrog', 'slogbog.com'], true)) return 'slogbog';
    if (in_array($raw, ['gravity-wizards', 'gravitywizards', 'gravity_wizards', 'gravitywizards.com', 'gpada'], true)) return 'gravity-wizards';
    if (in_array($raw, ['twisted23', 'twst23', 'twisted23.com'], true)) return 'twisted23';

    foreach ([$host, $origin, $referer] as $candidate) {
        $c = strtolower(trim($candidate));
        if ($c === '') continue;
        if (str_contains($c, 'slogbog.') || str_contains($c, 'slogfrog.')) {
            return 'slogbog';
        }
        if (str_contains($c, 'gravitywizards.') || str_contains($c, 'gravity-wizards.') || str_contains($c, 'gpada.')) {
            return 'gravity-wizards';
        }
    }
    return 'twisted23';
}

function compute_earth_obliquity(float $unixSec): array {
    $jd = ($unixSec / 86400.0) + 2440587.5;
    $T = ($jd - 2451545.0) / 36525.0;
    $eps0Arcsec = 84381.406
        - 46.836769 * $T
        - 0.0001831 * ($T ** 2)
        + 0.00200340 * ($T ** 3)
        - 5.76e-7 * ($T ** 4)
        - 4.34e-8 * ($T ** 5);
    $omegaDeg = 125.04452 - 1934.136261 * $T;
    $lSunDeg = 280.4665 + 36000.7698 * $T;
    $dEpsArcsec = 9.205 * cos(deg2rad($omegaDeg)) + 0.573 * cos(deg2rad(2.0 * $lSunDeg));
    $meanDeg = $eps0Arcsec / 3600.0;
    $trueDeg = ($eps0Arcsec + $dEpsArcsec) / 3600.0;
    return [
        'meanDeg' => round($meanDeg, 7),
        'trueDeg' => round($trueDeg, 7),
        'nutationArcsec' => round($dEpsArcsec, 3),
    ];
}

$NOW = time();
$EARTH_OBLIQUITY = compute_earth_obliquity(microtime(true));
$EARTH_TILT_DEG = $EARTH_OBLIQUITY['trueDeg'];
$ACTIVE_WINDOW = 300;   // 5 minutes = active session
$WINDOW_24H = 86400;    // 24 hours = recent telemetry window
$SITES = site_catalog();

function resolve_data_dir(): string {
    $localDir = __DIR__ . '/data';
    if (!is_dir($localDir)) {
        @mkdir($localDir, 0755, true);
    }
    if (is_dir($localDir) && is_writable($localDir)) {
        $ht = $localDir . '/.htaccess';
        if (!file_exists($ht)) {
            @file_put_contents($ht, "Require all denied\nDeny from all\n");
        }
        return $localDir;
    }
    $tmpDir = rtrim(sys_get_temp_dir(), '/') . '/twst23_visitors';
    if (!is_dir($tmpDir)) {
        @mkdir($tmpDir, 0755, true);
    }
    return $tmpDir;
}

function get_client_ip(): string {
    $candidates = [
        $_SERVER['HTTP_CF_CONNECTING_IP'] ?? '',
        $_SERVER['HTTP_X_REAL_IP'] ?? '',
        $_SERVER['HTTP_X_FORWARDED_FOR'] ?? '',
        $_SERVER['REMOTE_ADDR'] ?? '',
    ];
    foreach ($candidates as $raw) {
        if (!$raw) continue;
        $parts = explode(',', $raw);
        foreach ($parts as $part) {
            $ip = trim($part);
            if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
                return $ip;
            }
        }
    }
    $fallback = trim((string)($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0'));
    return filter_var($fallback, FILTER_VALIDATE_IP) ? $fallback : '0.0.0.0';
}

function country_code_to_flag(string $code): string {
    $code = strtoupper(trim($code));
    if (strlen($code) !== 2 || !ctype_alpha($code)) {
        return "\u{1F310}";
    }
    $offset = 0x1F1E6 - ord('A');
    $first = mb_chr($offset + ord($code[0]), 'UTF-8');
    $second = mb_chr($offset + ord($code[1]), 'UTF-8');
    return ($first && $second) ? ($first . $second) : "\u{1F310}";
}

function map_table_name(string $path, string $site): string {
    $p = strtolower(trim($path));
    if ($site === 'slogbog') {
        if (str_contains($p, 'viewtopic')) return 'sLogbog Topic Thread';
        if (str_contains($p, 'viewforum')) return 'sLogbog Board';
        if (str_contains($p, 'memberlist')) return 'sLogbog MemberList';
        if (str_contains($p, 'axle')) return 'sLogbog AxLe Thread';
        return 'sLogbog Forum';
    }
    if ($site === 'gravity-wizards') {
        if (str_contains($p, 'fd-too0') || str_contains($p, 'flippingdice')) return 'GW • FD_too0 Lab';
        if (str_contains($p, 'derb') || str_contains($p, 'gpada')) return 'GW • GPADA Air Derby';
        if (str_contains($p, 'classic')) return 'GW • Classic Workshop';
        return 'gravity-wizards Hub';
    }
    if ($p === '' || $p === '/' || $p === '/index.html') return 'Parlour Lounge';
    if (strpos($p, '/play') === 0) return 'Play Parlour';
    if (strpos($p, '/botchee/humpty') === 0) return 'Humpty Dumpty Sudoku';
    if (strpos($p, '/botchee') === 0) return 'Botchee Table';
    if (strpos($p, '/backgammon') === 0) return 'Backgammon 3D';
    if (strpos($p, '/slider') === 0) return 'Twisted 23 Slider';
    if (strpos($p, '/tophat') === 0) return 'FGN TopHatPuzzle';
    if (strpos($p, '/hangman') === 0) return 'CameLcase Hangman';
    if (strpos($p, '/extreme') === 0) return 'eXtreme 24-Cie';
    if (strpos($p, '/flippingdice') === 0) return 'Flipping Dice';
    if (strpos($p, '/visitors') === 0) return 'Visitors Globe';
    if (strpos($p, '/ucp') === 0) return 'User ControL PaneL';
    if (strpos($p, '/z404') === 0 || strpos($p, '/404') === 0) return 'z404 Moon Buggy';
    if (strpos($p, '/about') === 0) return 'About Parlour';
    if (strpos($p, '/contact') === 0) return 'Contact';
    if (strpos($p, '/terms') === 0) return 'Terms';
    return 'Twisted23 Page';
}

function geolocate_ip(string $ip, string $dataDir, int $now): array {
    $default = [
        'city' => 'Unknown City',
        'country' => 'Unknown',
        'countryCode' => 'XX',
        'flag' => "\u{1F310}",
        'lat' => null,
        'lon' => null,
    ];

    $hdrCountryCode = strtoupper(trim((string)($_SERVER['HTTP_CF_IPCOUNTRY'] ?? $_SERVER['GEOIP_COUNTRY_CODE'] ?? '')));
    $hdrCity = trim((string)($_SERVER['HTTP_CF_IPCITY'] ?? $_SERVER['GEOIP_CITY'] ?? ''));
    $hdrCountry = trim((string)($_SERVER['GEOIP_COUNTRY_NAME'] ?? ''));
    $hdrLat = $_SERVER['HTTP_CF_IPLATITUDE'] ?? $_SERVER['GEOIP_LATITUDE'] ?? null;
    $hdrLon = $_SERVER['HTTP_CF_IPLONGITUDE'] ?? $_SERVER['GEOIP_LONGITUDE'] ?? null;

    if ($hdrCountryCode && $hdrCountryCode !== 'XX' && is_numeric($hdrLat) && is_numeric($hdrLon)) {
        return [
            'city' => $hdrCity ?: $hdrCountryCode,
            'country' => $hdrCountry ?: $hdrCountryCode,
            'countryCode' => $hdrCountryCode,
            'flag' => country_code_to_flag($hdrCountryCode),
            'lat' => round((float)$hdrLat, 4),
            'lon' => round((float)$hdrLon, 4),
        ];
    }

    if (!filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
        return $default;
    }

    $geoCacheFile = $dataDir . '/geo_cache.json';
    $ipKey = substr(hash('sha256', 'geo|' . $ip), 0, 20);
    $cache = [];
    if (file_exists($geoCacheFile)) {
        $rawCache = @file_get_contents($geoCacheFile);
        $decoded = $rawCache ? json_decode($rawCache, true) : null;
        if (is_array($decoded)) $cache = $decoded;
    }

    if (isset($cache[$ipKey]) && is_array($cache[$ipKey])) {
        $entry = $cache[$ipKey];
        if (($now - (int)($entry['cachedAt'] ?? 0)) < 604800) {
            unset($entry['cachedAt']);
            return $entry;
        }
    }

    $geo = $default;
    $url = 'https://ipwho.is/' . rawurlencode($ip);
    $respBody = null;
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 2,
            CURLOPT_CONNECTTIMEOUT => 1,
            CURLOPT_USERAGENT => 'Twisted23-Visitors/2.0',
        ]);
        $respBody = curl_exec($ch);
        curl_close($ch);
    } else {
        $ctx = stream_context_create(['http' => ['timeout' => 2, 'header' => "User-Agent: Twisted23-Visitors/2.0\r\n"]]);
        $respBody = @file_get_contents($url, false, $ctx);
    }

    if (is_string($respBody) && $respBody !== '') {
        $j = json_decode($respBody, true);
        if (is_array($j) && !empty($j['success'])) {
            $cc = strtoupper((string)($j['country_code'] ?? 'XX'));
            $geo = [
                'city' => trim((string)($j['city'] ?? '')) ?: ($j['country'] ?? 'Unknown City'),
                'country' => trim((string)($j['country'] ?? '')) ?: $cc,
                'countryCode' => $cc,
                'flag' => country_code_to_flag($cc),
                'lat' => isset($j['latitude']) && is_numeric($j['latitude']) ? round((float)$j['latitude'], 4) : null,
                'lon' => isset($j['longitude']) && is_numeric($j['longitude']) ? round((float)$j['longitude'], 4) : null,
            ];
        }
    }

    if ($geo['countryCode'] === 'XX' && $hdrCountryCode && $hdrCountryCode !== 'XX') {
        $geo['countryCode'] = $hdrCountryCode;
        $geo['country'] = $hdrCountry ?: $hdrCountryCode;
        $geo['city'] = $hdrCity ?: $hdrCountryCode;
        $geo['flag'] = country_code_to_flag($hdrCountryCode);
    }

    $cache[$ipKey] = array_merge($geo, ['cachedAt' => $now]);
    if (count($cache) > 1000) {
        $cache = array_slice($cache, -1000, null, true);
    }
    @file_put_contents($geoCacheFile, json_encode($cache), LOCK_EX);

    return $geo;
}

/**
 * Poll live public phpBB "Who is online" from slogbog.com & storefront status from gravitywizards.com
 * Cached 60s on disk so telemetry responses remain instant.
 */
function fetch_federated_realms(string $dataDir, int $now): array {
    $cacheFile = $dataDir . '/federated_realms.json';
    if (is_file($cacheFile)) {
        $raw = @file_get_contents($cacheFile);
        $cached = $raw ? json_decode($raw, true) : null;
        if (is_array($cached) && ($now - (int)($cached['fetchedAt'] ?? 0)) < 60) {
            return $cached;
        }
    }

    $slog = [
        'reachable' => false,
        'online5m' => 0,
        'registered' => 0,
        'hidden' => 0,
        'guests' => 0,
        'totalPosts' => 0,
        'totalMembers' => 0,
        'newestMember' => '',
        'hubCity' => 'Provo (sLogbog Forum)',
        'hubCountry' => 'United States',
        'hubFlag' => "\u{1F1FA}\u{1F1F8}",
        'hubLat' => 40.2338,
        'hubLon' => -111.6585,
    ];

    $gw = [
        'reachable' => false,
        'onlineStatus' => 'Offline',
        'hubCity' => 'Anchorage & Palmer (GW Hub)',
        'hubCountry' => 'United States',
        'hubFlag' => "\u{1F1FA}\u{1F1F8}",
        'hubLat' => 61.2181,
        'hubLon' => -149.9003,
    ];

    if (function_exists('curl_init')) {
        // 1. Live SlogBog phpBB3 Who Is Online
        $ch1 = curl_init('https://slogbog.com/');
        curl_setopt_array($ch1, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_TIMEOUT => 3,
            CURLOPT_CONNECTTIMEOUT => 2,
            CURLOPT_USERAGENT => 'Twisted23-Universe-Globe/2.0',
        ]);
        $slogHtml = curl_exec($ch1);
        $slogCode = (int)curl_getinfo($ch1, CURLINFO_HTTP_CODE);
        curl_close($ch1);

        if (is_string($slogHtml) && $slogCode >= 200 && $slogCode < 400) {
            $slog['reachable'] = true;
            if (preg_match('/In total there (?:are|is)\s*<strong>(\d+)<\/strong>\s*users? online\s*::\s*(\d+)\s*registered,\s*(\d+)\s*hidden and\s*(\d+)\s*guests/i', $slogHtml, $m)) {
                $slog['online5m'] = (int)$m[1];
                $slog['registered'] = (int)$m[2];
                $slog['hidden'] = (int)$m[3];
                $slog['guests'] = (int)$m[4];
            }
            if (preg_match('/Total posts\s*<strong>(\d+)<\/strong>/i', $slogHtml, $pm)) {
                $slog['totalPosts'] = (int)$pm[1];
            }
            if (preg_match('/Total members\s*<strong>(\d+)<\/strong>/i', $slogHtml, $mm)) {
                $slog['totalMembers'] = (int)$mm[1];
            }
            if (preg_match('/Our newest member\s*<strong><a[^>]*>([^<]+)<\/a>/i', $slogHtml, $nm)) {
                $slog['newestMember'] = trim(html_entity_decode($nm[1], ENT_QUOTES | ENT_HTML5, 'UTF-8'));
            }
        }

        // 2. Live Gravity Wizards Storefront / WebMCP Pulse
        $ch2 = curl_init('https://gravitywizards.com/webmcp.json');
        curl_setopt_array($ch2, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_TIMEOUT => 3,
            CURLOPT_CONNECTTIMEOUT => 2,
            CURLOPT_USERAGENT => 'Twisted23-Universe-Globe/2.0',
        ]);
        $gwBody = curl_exec($ch2);
        $gwCode = (int)curl_getinfo($ch2, CURLINFO_HTTP_CODE);
        curl_close($ch2);

        if (is_string($gwBody) && $gwCode >= 200 && $gwCode < 400) {
            $gw['reachable'] = true;
            $gw['onlineStatus'] = 'FOBB & FD_too0 Storefront Live';
        }
    }

    $result = [
        'fetchedAt' => $now,
        'slogbog' => $slog,
        'gravityWizards' => $gw,
    ];
    @file_put_contents($cacheFile, json_encode($result), LOCK_EX);
    return $result;
}

$dataDir = resolve_data_dir();
$logFile = $dataDir . '/visitors_log.json';
$method = strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET'));
$action = strtolower(trim((string)($_GET['action'] ?? '')));
$ip = get_client_ip();
$ua = substr((string)($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 200);
$referer = substr((string)($_SERVER['HTTP_REFERER'] ?? ''), 0, 240);
$daySalt = gmdate('Y-m-d', $NOW);
$visitorHash = substr(hash('sha256', $ip . '|twst23|' . $daySalt), 0, 16);
$sessionHash = substr(hash('sha256', $ip . '|' . $ua . '|' . $daySalt), 0, 16);

$rawBody = ($method === 'POST') ? (file_get_contents('php://input') ?: '') : '';
$bodyJson = ($rawBody !== '') ? json_decode($rawBody, true) : null;

$explicitSite = is_array($bodyJson) && isset($bodyJson['site'])
    ? (string)$bodyJson['site']
    : (string)($_GET['site'] ?? '');
$bodyHost = is_array($bodyJson) && isset($bodyJson['host'])
    ? (string)$bodyJson['host']
    : (string)($_GET['host'] ?? '');
$bodyRef = is_array($bodyJson) && isset($bodyJson['referrer'])
    ? (string)$bodyJson['referrer']
    : $referer;

$detectedSite = detect_site($explicitSite, $bodyHost, $bodyRef, $ORIGIN);

// Open and lock visitor log
$fp = @fopen($logFile, 'c+');
$events = [];
if ($fp) {
    flock($fp, LOCK_EX);
    $raw = stream_get_contents($fp);
    $decoded = $raw ? json_decode($raw, true) : null;
    if (is_array($decoded)) {
        $events = $decoded;
    }

    // Prune older than 24 hours
    $events = array_values(array_filter($events, static function ($ev) use ($NOW, $WINDOW_24H) {
        return is_array($ev) && (($NOW - (int)($ev['ts'] ?? 0)) <= $WINDOW_24H);
    }));

    $shouldRecord = ($method === 'POST') || in_array($action, ['ping', 'beacon', 'asset'], true);
    if ($shouldRecord && !preg_match('/bot|crawl|spider|slurp|headless|Twisted23-Universe-Globe/i', $ua)) {
        if ($action === 'asset') {
            $assetName = basename((string)($_GET['file'] ?? 'asset'));
            $reqPath = '/assets/' . preg_replace('/[^a-zA-Z0-9_\-\.]/', '', $assetName);
            if ($referer !== '') {
                $refPath = parse_url($referer, PHP_URL_PATH) ?: '';
                $refQuery = parse_url($referer, PHP_URL_QUERY) ?: '';
                if ($refPath !== '') {
                    $reqPath = substr($refPath . ($refQuery ? '?' . $refQuery : ''), 0, 80);
                }
            }
        } else {
            $reqPath = is_array($bodyJson) && isset($bodyJson['path'])
                ? (string)$bodyJson['path']
                : (string)($_GET['path'] ?? '/');
            $reqPath = '/' . ltrim(substr(preg_replace('/[^a-zA-Z0-9_\/\-\.\?\=&]/', '', $reqPath), 0, 80), '/');
        }

        $table = map_table_name($reqPath, $detectedSite);
        $geo = geolocate_ip($ip, $dataDir, $NOW);

        // Deduplicate rapid reloads from same session+site+path within 20s
        $updatedExisting = false;
        for ($i = count($events) - 1; $i >= 0; $i--) {
            $evSite = (string)($events[$i]['site'] ?? 'twisted23');
            if (($events[$i]['sessionHash'] ?? '') === $sessionHash && $evSite === $detectedSite && ($events[$i]['path'] ?? '') === $reqPath && ($NOW - (int)($events[$i]['ts'] ?? 0)) < 20) {
                $events[$i]['ts'] = $NOW;
                $updatedExisting = true;
                break;
            }
        }
        if (!$updatedExisting) {
            $events[] = [
                'ts' => $NOW,
                'site' => $detectedSite,
                'visitorHash' => $visitorHash,
                'sessionHash' => $sessionHash,
                'path' => $reqPath,
                'table' => $table,
                'city' => $geo['city'],
                'country' => $geo['country'],
                'countryCode' => $geo['countryCode'],
                'flag' => $geo['flag'],
                'lat' => $geo['lat'],
                'lon' => $geo['lon'],
            ];
            if (count($events) > 3000) {
                $events = array_slice($events, -3000);
            }
        }

        ftruncate($fp, 0);
        rewind($fp);
        fwrite($fp, json_encode($events));
        fflush($fp);
    }

    flock($fp, LOCK_UN);
    fclose($fp);
}

// Serve 1x1 transparent GIF when used as an <img> / BBCode [img] cross-domain beacon
if ($action === 'beacon') {
    header('Content-Type: image/gif');
    echo base64_decode('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7');
    exit;
}

// Serve actual /assets/* image when embedded on external forums (e.g. slogbog.com)
if ($action === 'asset') {
    $file = basename((string)($_GET['file'] ?? ''));
    $assetPath = dirname(__DIR__) . '/assets/' . $file;
    if ($file !== '' && is_file($assetPath)) {
        $ext = strtolower(pathinfo($assetPath, PATHINFO_EXTENSION));
        $mime = match ($ext) {
            'gif' => 'image/gif',
            'png' => 'image/png',
            'svg' => 'image/svg+xml',
            'webp' => 'image/webp',
            default => 'application/octet-stream',
        };
        header('Content-Type: ' . $mime);
        header('Content-Length: ' . filesize($assetPath));
        readfile($assetPath);
        exit;
    }
    http_response_code(404);
    exit;
}

header('Content-Type: application/json; charset=utf-8');

$federated = fetch_federated_realms($dataDir, $NOW);

// Aggregate real telemetry metrics overall & per realm
$activeSessionsMap = [];
$unique24hMap = [];
$countriesMap = [];
$locationsMap = [];
$recentArrivals = [];

$realmCounts = [
    'twisted23' => ['active5m' => [], 'unique24h' => [], 'hits24h' => 0],
    'slogbog' => ['active5m' => [], 'unique24h' => [], 'hits24h' => 0],
    'gravity-wizards' => ['active5m' => [], 'unique24h' => [], 'hits24h' => 0],
];

for ($i = count($events) - 1; $i >= 0; $i--) {
    $ev = $events[$i];
    $age = max(0, $NOW - (int)$ev['ts']);
    $vHash = (string)($ev['visitorHash'] ?? '');
    $sHash = (string)($ev['sessionHash'] ?? '');
    $evSite = (string)($ev['site'] ?? 'twisted23');
    if (!isset($SITES[$evSite])) {
        // Check legacy Flipping Dice path to credit shared GW / Twisted23 traffic cleanly if needed
        $evSite = 'twisted23';
    }
    $siteMeta = $SITES[$evSite];

    $realmCounts[$evSite]['hits24h']++;
    if ($vHash !== '') {
        $unique24hMap[$vHash] = true;
        $realmCounts[$evSite]['unique24h'][$vHash] = true;
    }
    if ($age <= $ACTIVE_WINDOW && $sHash !== '') {
        $activeSessionsMap[$evSite . ':' . $sHash] = true;
        $realmCounts[$evSite]['active5m'][$sHash] = true;
    }

    $cc = (string)($ev['countryCode'] ?? 'XX');
    if ($cc !== '' && $cc !== 'XX') {
        $countriesMap[$cc] = true;
    }

    if (isset($ev['lat'], $ev['lon']) && is_numeric($ev['lat']) && is_numeric($ev['lon'])) {
        $locKey = round((float)$ev['lat'], 2) . ',' . round((float)$ev['lon'], 2);
        if (!isset($locationsMap[$locKey])) {
            $locationsMap[$locKey] = [
                'city' => $ev['city'],
                'country' => $ev['country'],
                'countryCode' => $cc,
                'flag' => $ev['flag'],
                'lat' => (float)$ev['lat'],
                'lon' => (float)$ev['lon'],
                'count' => 1,
                'site' => $evSite,
                'siteLabel' => $siteMeta['label'],
                'siteColor' => $siteMeta['color'],
                'siteBadge' => $siteMeta['badge'],
                'sites' => [$evSite => 1],
                'activeSites' => ($age <= $ACTIVE_WINDOW) ? [$evSite] : [],
                'lastTable' => $ev['table'],
                'lastTs' => (int)$ev['ts'],
                'isActive' => ($age <= $ACTIVE_WINDOW),
                'isHub' => false,
            ];
        } else {
            $locationsMap[$locKey]['count']++;
            $locationsMap[$locKey]['sites'][$evSite] = ($locationsMap[$locKey]['sites'][$evSite] ?? 0) + 1;
            if ($age <= $ACTIVE_WINDOW) {
                $locationsMap[$locKey]['isActive'] = true;
                if (!in_array($evSite, $locationsMap[$locKey]['activeSites'], true)) {
                    $locationsMap[$locKey]['activeSites'][] = $evSite;
                }
            }
        }
    }

    if (count($recentArrivals) < 28) {
        $recentArrivals[] = [
            'site' => $evSite,
            'siteLabel' => $siteMeta['label'],
            'siteColor' => $siteMeta['color'],
            'siteBadge' => $siteMeta['badge'],
            'city' => $ev['city'],
            'country' => $ev['country'],
            'countryCode' => $cc,
            'flag' => $ev['flag'],
            'lat' => $ev['lat'],
            'lon' => $ev['lon'],
            'table' => $ev['table'],
            'path' => $ev['path'],
            'ts' => (int)$ev['ts'],
            'secondsAgo' => $age,
            'isYou' => ($vHash === $visitorHash),
        ];
    }
}

// Surface live federated sLogbog Forum Hub & gravity-wizards Anchorage/Palmer Hub nodes on the globe
$slogLive = $federated['slogbog'] ?? [];
$slogOnline5m = max(count($realmCounts['slogbog']['active5m']), (int)($slogLive['online5m'] ?? 0));
if (!empty($slogLive['reachable']) && $slogOnline5m > 0) {
    $slogHubKey = round((float)$slogLive['hubLat'], 2) . ',' . round((float)$slogLive['hubLon'], 2);
    if (!isset($locationsMap[$slogHubKey])) {
        $locationsMap[$slogHubKey] = [
            'city' => "sLogbog Forum ({$slogOnline5m} online)",
            'country' => $slogLive['hubCountry'],
            'countryCode' => 'US',
            'flag' => $slogLive['hubFlag'],
            'lat' => (float)$slogLive['hubLat'],
            'lon' => (float)$slogLive['hubLon'],
            'count' => $slogOnline5m,
            'site' => 'slogbog',
            'siteLabel' => 'sLogbog',
            'siteColor' => $SITES['slogbog']['color'],
            'siteBadge' => $SITES['slogbog']['badge'],
            'sites' => ['slogbog' => $slogOnline5m],
            'activeSites' => ['slogbog'],
            'lastTable' => 'phpBB Who Is Online',
            'lastTs' => $NOW,
            'isActive' => true,
            'isHub' => true,
        ];
    } else {
        $locationsMap[$slogHubKey]['sites']['slogbog'] = max($locationsMap[$slogHubKey]['sites']['slogbog'] ?? 0, $slogOnline5m);
        if (!in_array('slogbog', $locationsMap[$slogHubKey]['activeSites'], true)) {
            $locationsMap[$slogHubKey]['activeSites'][] = 'slogbog';
        }
        $locationsMap[$slogHubKey]['isActive'] = true;
    }
}

$gwLive = $federated['gravityWizards'] ?? [];
$gwBeaconActive = count($realmCounts['gravity-wizards']['active5m']);
if (!empty($gwLive['reachable'])) {
    $gwHubKey = round((float)$gwLive['hubLat'], 2) . ',' . round((float)$gwLive['hubLon'], 2);
    if (!isset($locationsMap[$gwHubKey])) {
        $locationsMap[$gwHubKey] = [
            'city' => 'Anchorage • gravity-wizards',
            'country' => $gwLive['hubCountry'],
            'countryCode' => 'US',
            'flag' => $gwLive['hubFlag'],
            'lat' => (float)$gwLive['hubLat'],
            'lon' => (float)$gwLive['hubLon'],
            'count' => max(1, $gwBeaconActive),
            'site' => 'gravity-wizards',
            'siteLabel' => 'gravity-wizards',
            'siteColor' => $SITES['gravity-wizards']['color'],
            'siteBadge' => $SITES['gravity-wizards']['badge'],
            'sites' => ['gravity-wizards' => max(1, $gwBeaconActive)],
            'activeSites' => $gwBeaconActive > 0 ? ['gravity-wizards'] : [],
            'lastTable' => $gwLive['onlineStatus'],
            'lastTs' => $NOW,
            'isActive' => true,
            'isHub' => true,
        ];
    } else {
        $locationsMap[$gwHubKey]['sites']['gravity-wizards'] = ($locationsMap[$gwHubKey]['sites']['gravity-wizards'] ?? 0) + 1;
    }
}

$realmsSummary = [
    'twisted23' => array_merge($SITES['twisted23'], [
        'active5m' => count($realmCounts['twisted23']['active5m']),
        'unique24h' => count($realmCounts['twisted23']['unique24h']),
        'hits24h' => $realmCounts['twisted23']['hits24h'],
        'statusNote' => 'Live Parlour Telemetry',
    ]),
    'slogbog' => array_merge($SITES['slogbog'], [
        'active5m' => $slogOnline5m,
        'beaconActive5m' => count($realmCounts['slogbog']['active5m']),
        'unique24h' => count($realmCounts['slogbog']['unique24h']),
        'hits24h' => $realmCounts['slogbog']['hits24h'],
        'forumRegistered' => (int)($slogLive['registered'] ?? 0),
        'forumGuests' => (int)($slogLive['guests'] ?? 0),
        'totalPosts' => (int)($slogLive['totalPosts'] ?? 0),
        'totalMembers' => (int)($slogLive['totalMembers'] ?? 0),
        'newestMember' => (string)($slogLive['newestMember'] ?? ''),
        'reachable' => !empty($slogLive['reachable']),
        'statusNote' => !empty($slogLive['reachable'])
            ? "{$slogOnline5m} online ({$slogLive['registered']} reg, {$slogLive['guests']} guests)"
            : 'Beacon Stand-By',
    ]),
    'gravity-wizards' => array_merge($SITES['gravity-wizards'], [
        'active5m' => $gwBeaconActive,
        'unique24h' => count($realmCounts['gravity-wizards']['unique24h']),
        'hits24h' => $realmCounts['gravity-wizards']['hits24h'],
        'reachable' => !empty($gwLive['reachable']),
        'statusNote' => !empty($gwLive['reachable'])
            ? ($gwBeaconActive > 0 ? "{$gwBeaconActive} active • Hub Live" : 'Anchorage/Palmer Hub Live')
            : 'Beacon Stand-By',
    ]),
];

$combinedActive = count($realmCounts['twisted23']['active5m']) + $slogOnline5m + max($gwBeaconActive, !empty($gwLive['reachable']) ? 1 : 0);

echo json_encode([
    'ok' => true,
    'source' => 'live_multi_realm_telemetry',
    'serverTime' => $NOW,
    'earthTiltDeg' => $EARTH_TILT_DEG,
    'earthMeanTiltDeg' => $EARTH_OBLIQUITY['meanDeg'],
    'earthNutationArcsec' => $EARTH_OBLIQUITY['nutationArcsec'],
    'earthCycleRangeDeg' => '22.1-24.5',
    'activeSessions' => count($activeSessionsMap),
    'combinedUniverseActive' => $combinedActive,
    'unique24h' => count($unique24hMap),
    'hits24h' => count($events),
    'regionsCount' => max(1, count($countriesMap)),
    'realms' => $realmsSummary,
    'activeLocations' => array_values($locationsMap),
    'recentArrivals' => $recentArrivals,
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
