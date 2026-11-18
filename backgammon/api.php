<?php
declare(strict_types=1);

error_reporting(E_ALL);
ini_set('display_errors', '0');

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$ROOMS_DIR = __DIR__ . '/data/rooms';
if (!is_dir($ROOMS_DIR)) {
    @mkdir($ROOMS_DIR, 0777, true);
}

// Housekeeping: clean up rooms older than 24 hours (1% chance per request)
if (mt_rand(1, 100) === 1) {
    $now = time();
    foreach (glob($ROOMS_DIR . '/*.json') ?: [] as $file) {
        if ($now - filemtime($file) > 86400) {
            @unlink($file);
        }
    }
}

function json_body(): array {
    $raw = file_get_contents('php://input');
    return $raw ? (json_decode($raw, true) ?: []) : [];
}

function fail(int $code, string $msg): never {
    http_response_code($code);
    echo json_encode(['error' => $msg]);
    exit;
}

function get_room_path(string $roomId): string {
    global $ROOMS_DIR;
    $cleanId = strtoupper(preg_replace('/[^A-Za-z0-9\-]/', '', $roomId));
    if ($cleanId === '') {
        fail(400, 'Invalid room ID');
    }
    return $ROOMS_DIR . '/' . $cleanId . '.json';
}

function load_room(string $roomId): array {
    $path = get_room_path($roomId);
    if (!is_file($path)) {
        fail(404, 'Room not found');
    }
    $raw = file_get_contents($path);
    $data = json_decode($raw ?: '{}', true);
    if (!is_array($data)) {
        fail(500, 'Corrupt room state');
    }
    return $data;
}

function save_room(string $roomId, array $data): bool {
    $path = get_room_path($roomId);
    $data['updatedAt'] = time();
    $json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    
    $fp = @fopen($path, 'c+');
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
    return @file_put_contents($path, $json, LOCK_EX) !== false;
}

$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

// 1. Create Room
if ($action === 'create_room' && $method === 'POST') {
    $body = json_body();
    $hostName = trim((string)($body['hostName'] ?? 'Player 1 (White)'));
    if ($hostName === '') $hostName = 'Player 1 (White)';
    $diceVariant = in_array($body['diceVariant'] ?? '', ['standard', 'axle_1_6', 'axle_3_4'], true) ? $body['diceVariant'] : 'standard';

    // Generate room code TW-XXXX (where XXXX is 4 random uppercase alphanumeric chars)
    $chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    $codePart = '';
    for ($i = 0; $i < 4; $i++) {
        $codePart .= $chars[random_int(0, strlen($chars) - 1)];
    }
    $roomId = 'TW-' . $codePart;
    $token = bin2hex(random_bytes(16));

    $roomData = [
        'id' => $roomId,
        'createdAt' => time(),
        'updatedAt' => time(),
        'hostToken' => $token,
        'guestToken' => null,
        'hostName' => $hostName,
        'guestName' => null,
        'status' => 'waiting', // waiting, active, closed
        'diceVariant' => $diceVariant,
        'turn' => 'white',
        'events' => [],
        'signals' => [
            'offer' => null,
            'answer' => null,
            'candidates' => [],
        ],
    ];

    save_room($roomId, $roomData);

    echo json_encode([
        'success' => true,
        'roomId' => $roomId,
        'token' => $token,
        'role' => 'white',
        'hostName' => $hostName,
        'diceVariant' => $diceVariant,
    ]);
    exit;
}

// 2. Join Room
if ($action === 'join_room' && $method === 'POST') {
    $body = json_body();
    $roomId = strtoupper(trim((string)($body['roomId'] ?? '')));
    $guestName = trim((string)($body['guestName'] ?? 'Player 2 (Red)'));
    if ($guestName === '') $guestName = 'Player 2 (Red)';
    $existingToken = $body['token'] ?? null;

    $room = load_room($roomId);

    // If host is reconnecting with their token
    if ($existingToken && $existingToken === ($room['hostToken'] ?? '')) {
        echo json_encode([
            'success' => true,
            'roomId' => $roomId,
            'role' => 'white',
            'token' => $existingToken,
            'room' => $room,
        ]);
        exit;
    }

    // If guest is reconnecting with their token
    if ($existingToken && $existingToken === ($room['guestToken'] ?? '')) {
        echo json_encode([
            'success' => true,
            'roomId' => $roomId,
            'role' => 'red',
            'token' => $existingToken,
            'room' => $room,
        ]);
        exit;
    }

    // New guest joining
    $token = bin2hex(random_bytes(16));
    $room['guestToken'] = $token;
    $room['guestName'] = $guestName;
    $room['status'] = 'active';

    $eventSeq = count($room['events']) + 1;
    $room['events'][] = [
        'seq' => $eventSeq,
        'type' => 'player_joined',
        'player' => 'red',
        'name' => $guestName,
        'timestamp' => microtime(true),
    ];

    save_room($roomId, $room);

    echo json_encode([
        'success' => true,
        'roomId' => $roomId,
        'role' => 'red',
        'token' => $token,
        'hostName' => $room['hostName'],
        'guestName' => $guestName,
        'diceVariant' => $room['diceVariant'],
        'room' => $room,
    ]);
    exit;
}

// 3. Send Game Event (Roll, Move, Cube Offer, Cube Respond, Chat, New Game)
if ($action === 'send_event' && $method === 'POST') {
    $body = json_body();
    $roomId = strtoupper(trim((string)($body['roomId'] ?? '')));
    $token = (string)($body['token'] ?? '');
    $type = (string)($body['type'] ?? '');
    $payload = $body['payload'] ?? [];

    $room = load_room($roomId);

    // Authorize sender
    $player = null;
    if ($token === ($room['hostToken'] ?? '')) {
        $player = 'white';
    } elseif ($token === ($room['guestToken'] ?? '')) {
        $player = 'red';
    } else {
        fail(403, 'Unauthorized token for room');
    }

    $eventSeq = count($room['events']) + 1;
    $event = [
        'seq' => $eventSeq,
        'type' => $type,
        'player' => $player,
        'payload' => $payload,
        'timestamp' => microtime(true),
    ];
    $room['events'][] = $event;

    // Track active turn in room state
    if (isset($payload['nextTurn']) && is_string($payload['nextTurn'])) {
        $room['turn'] = $payload['nextTurn'];
    }

    save_room($roomId, $room);

    echo json_encode([
        'success' => true,
        'seq' => $eventSeq,
        'event' => $event,
    ]);
    exit;
}

// 4. Poll Room State & Events
if ($action === 'poll' && $method === 'GET') {
    $roomId = strtoupper(trim((string)($_GET['room'] ?? '')));
    $since = (int)($_GET['since'] ?? 0);
    $token = (string)($_GET['token'] ?? '');

    $room = load_room($roomId);

    $myRole = 'spectator';
    if ($token === ($room['hostToken'] ?? '')) {
        $myRole = 'white';
    } elseif ($token === ($room['guestToken'] ?? '')) {
        $myRole = 'red';
    }

    $newEvents = [];
    foreach ($room['events'] as $e) {
        if (($e['seq'] ?? 0) > $since) {
            $newEvents[] = $e;
        }
    }

    echo json_encode([
        'success' => true,
        'roomId' => $roomId,
        'status' => $room['status'],
        'myRole' => $myRole,
        'hostName' => $room['hostName'],
        'guestName' => $room['guestName'],
        'diceVariant' => $room['diceVariant'],
        'turn' => $room['turn'] ?? 'white',
        'events' => $newEvents,
        'lastSeq' => count($room['events']),
        'signals' => [
            'offer' => ($myRole === 'red') ? ($room['signals']['offer'] ?? null) : null,
            'answer' => ($myRole === 'white') ? ($room['signals']['answer'] ?? null) : null,
            'candidateCount' => count($room['signals']['candidates'] ?? []),
        ],
    ]);
    exit;
}

// 5. WebRTC Signaling (Offer / Answer / ICE Candidates)
if ($action === 'signal' && $method === 'POST') {
    $body = json_body();
    $roomId = strtoupper(trim((string)($body['roomId'] ?? '')));
    $token = (string)($body['token'] ?? '');
    $type = (string)($body['type'] ?? '');
    $data = $body['data'] ?? null;

    $room = load_room($roomId);

    $myRole = null;
    if ($token === ($room['hostToken'] ?? '')) {
        $myRole = 'white';
    } elseif ($token === ($room['guestToken'] ?? '')) {
        $myRole = 'red';
    } else {
        fail(403, 'Unauthorized');
    }

    if ($type === 'offer' && $myRole === 'white') {
        $room['signals']['offer'] = $data;
    } elseif ($type === 'answer' && $myRole === 'red') {
        $room['signals']['answer'] = $data;
    } elseif ($type === 'candidate') {
        if (!isset($room['signals']['candidates'])) $room['signals']['candidates'] = [];
        $room['signals']['candidates'][] = [
            'sender' => $myRole,
            'candidate' => $data,
            'ts' => microtime(true),
        ];
    }

    save_room($roomId, $room);

    echo json_encode(['success' => true]);
    exit;
}

if ($action === 'get_candidates' && $method === 'GET') {
    $roomId = strtoupper(trim((string)($_GET['room'] ?? '')));
    $token = (string)($_GET['token'] ?? '');
    $sinceTs = (float)($_GET['since'] ?? 0);

    $room = load_room($roomId);

    $myRole = null;
    if ($token === ($room['hostToken'] ?? '')) {
        $myRole = 'white';
    } elseif ($token === ($room['guestToken'] ?? '')) {
        $myRole = 'red';
    } else {
        fail(403, 'Unauthorized');
    }

    $targetSender = $myRole === 'white' ? 'red' : 'white';
    $candidates = [];
    foreach ($room['signals']['candidates'] ?? [] as $cand) {
        if (($cand['sender'] ?? '') === $targetSender && ($cand['ts'] ?? 0) > $sinceTs) {
            $candidates[] = $cand;
        }
    }

    echo json_encode([
        'success' => true,
        'candidates' => $candidates,
    ]);
    exit;
}

fail(404, 'Endpoint not found');
