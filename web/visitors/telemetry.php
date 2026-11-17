<?php
declare(strict_types=1);

/**
 * Twisted23 Real-Time Visitor Telemetry Endpoint
 * - Records genuine browser page visits via POST (no fake/synthetic data)
 * - Returns aggregated 24h & 5-minute active visitor metrics + city/country coords via GET or POST response
 * - Never stores raw visitor IP addresses (uses daily salted SHA-256 hashes)
 */

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

$EARTH_TILT_DEG = 23.44;
$NOW = time();
$ACTIVE_WINDOW = 300;   // 5 minutes = active session
$WINDOW_24H = 86400;    // 24 hours = recent telemetry window

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
        $_SERVER['REMOTE_ADDR'] ?? ''
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

function map_table_name(string $path): string {
    $p = strtolower(trim($path));
    if ($p === '' || $p === '/' || $p === '/index.html') return 'Parlour Lounge';
    if (strpos($p, '/backgammon') === 0) return 'Backgammon 3D';
    if (strpos($p, '/slider') === 0) return 'Twisted 23 Slider';
    if (strpos($p, '/tophat') === 0) return 'FGN TopHatPuzzle';
    if (strpos($p, '/hangman') === 0) return 'CameLcase Hangman';
    if (strpos($p, '/extreme') === 0) return 'eXtreme 24-Cie';
    if (strpos($p, '/flippingdice') === 0) return 'Flipping Dice';
    if (strpos($p, '/visitors') === 0) return 'Visitors Globe';
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
        'lon' => null
    ];

    // Check CDN / Apache GeoIP headers first if available
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
            'lon' => round((float)$hdrLon, 4)
        ];
    }

    if (!filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
        return $default;
    }

    // Privacy-preserving geo cache keyed by SHA-256 of IP
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
        if (($now - (int)($entry['cachedAt'] ?? 0)) < 604800) { // 7 days
            unset($entry['cachedAt']);
            return $entry;
        }
    }

    // Server-side lookup via ipwho.is (HTTPS, zero API key needed)
    $geo = $default;
    $url = 'https://ipwho.is/' . rawurlencode($ip);
    $respBody = null;
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 2,
            CURLOPT_CONNECTTIMEOUT => 1,
            CURLOPT_USERAGENT => 'Twisted23-Visitors/1.0'
        ]);
        $respBody = curl_exec($ch);
        curl_close($ch);
    } else {
        $ctx = stream_context_create(['http' => ['timeout' => 2, 'header' => "User-Agent: Twisted23-Visitors/1.0\r\n"]]);
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
                'lon' => isset($j['longitude']) && is_numeric($j['longitude']) ? round((float)$j['longitude'], 4) : null
            ];
        }
    }

    if ($geo['countryCode'] === 'XX' && $hdrCountryCode && $hdrCountryCode !== 'XX') {
        $geo['countryCode'] = $hdrCountryCode;
        $geo['country'] = $hdrCountry ?: $hdrCountryCode;
        $geo['city'] = $hdrCity ?: $hdrCountryCode;
        $geo['flag'] = country_code_to_flag($hdrCountryCode);
    }

    // Keep geo cache bounded to 1000 entries
    $cache[$ipKey] = array_merge($geo, ['cachedAt' => $now]);
    if (count($cache) > 1000) {
        $cache = array_slice($cache, -1000, null, true);
    }
    @file_put_contents($geoCacheFile, json_encode($cache), LOCK_EX);

    return $geo;
}

$dataDir = resolve_data_dir();
$logFile = $dataDir . '/visitors_log.json';
$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
$ip = get_client_ip();
$ua = substr((string)($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 200);
$daySalt = gmdate('Y-m-d', $NOW);
$visitorHash = substr(hash('sha256', $ip . '|twst23|' . $daySalt), 0, 16);
$sessionHash = substr(hash('sha256', $ip . '|' . $ua . '|' . $daySalt), 0, 16);

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

    $shouldRecord = ($method === 'POST') || (isset($_GET['action']) && $_GET['action'] === 'ping');
    if ($shouldRecord && !preg_match('/bot|crawl|spider|slurp|headless/i', $ua)) {
        $rawBody = file_get_contents('php://input');
        $bodyJson = $rawBody ? json_decode($rawBody, true) : null;
        $reqPath = is_array($bodyJson) && isset($bodyJson['path'])
            ? (string)$bodyJson['path']
            : (string)($_GET['path'] ?? '/');
        $reqPath = '/' . ltrim(substr(preg_replace('/[^a-zA-Z0-9_\/\-\.]/', '', $reqPath), 0, 80), '/');
        $table = map_table_name($reqPath);

        $geo = geolocate_ip($ip, $dataDir, $NOW);

        // Deduplicate rapid reloads from same session+path within 20s (update timestamp instead)
        $updatedExisting = false;
        for ($i = count($events) - 1; $i >= 0; $i--) {
            if (($events[$i]['sessionHash'] ?? '') === $sessionHash && ($events[$i]['path'] ?? '') === $reqPath && ($NOW - (int)($events[$i]['ts'] ?? 0)) < 20) {
                $events[$i]['ts'] = $NOW;
                $updatedExisting = true;
                break;
            }
        }
        if (!$updatedExisting) {
            $events[] = [
                'ts' => $NOW,
                'visitorHash' => $visitorHash,
                'sessionHash' => $sessionHash,
                'path' => $reqPath,
                'table' => $table,
                'city' => $geo['city'],
                'country' => $geo['country'],
                'countryCode' => $geo['countryCode'],
                'flag' => $geo['flag'],
                'lat' => $geo['lat'],
                'lon' => $geo['lon']
            ];
            if (count($events) > 2500) {
                $events = array_slice($events, -2500);
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

// Aggregate real telemetry metrics
$activeSessionsMap = [];
$unique24hMap = [];
$countriesMap = [];
$locationsMap = [];
$recentArrivals = [];

for ($i = count($events) - 1; $i >= 0; $i--) {
    $ev = $events[$i];
    $age = max(0, $NOW - (int)$ev['ts']);
    $vHash = (string)($ev['visitorHash'] ?? '');
    $sHash = (string)($ev['sessionHash'] ?? '');

    if ($vHash !== '') $unique24hMap[$vHash] = true;
    if ($age <= $ACTIVE_WINDOW && $sHash !== '') {
        $activeSessionsMap[$sHash] = true;
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
                'lastTable' => $ev['table'],
                'lastTs' => (int)$ev['ts'],
                'isActive' => ($age <= $ACTIVE_WINDOW)
            ];
        } else {
            $locationsMap[$locKey]['count']++;
            if ($age <= $ACTIVE_WINDOW) {
                $locationsMap[$locKey]['isActive'] = true;
            }
        }
    }

    if (count($recentArrivals) < 20) {
        $recentArrivals[] = [
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
            'isYou' => ($vHash === $visitorHash)
        ];
    }
}

echo json_encode([
    'ok' => true,
    'source' => 'live_server_telemetry',
    'serverTime' => $NOW,
    'earthTiltDeg' => $EARTH_TILT_DEG,
    'activeSessions' => count($activeSessionsMap),
    'unique24h' => count($unique24hMap),
    'hits24h' => count($events),
    'regionsCount' => count($countriesMap),
    'activeLocations' => array_values($locationsMap),
    'recentArrivals' => $recentArrivals
], JSON_UNESCAPED_UNICODE);
