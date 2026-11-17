<?php
declare(strict_types=1);

error_reporting(E_ALL);
ini_set('display_errors', '0');

header('Content-Type: application/json; charset=utf-8');

// Load .env if present
$envFile = __DIR__ . '/.env';
if (is_file($envFile)) {
    foreach (file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
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

$DATA_FILE = __DIR__ . '/data/crm.json';
$FROM_ADDRESS = getenv('FROM_ADDRESS') ?: 'Gary Stout <media@twisted23.com>';
$REPLY_TO = getenv('REPLY_TO') ?: 'media@twisted23.com';
$DEFAULT_BCC = getenv('DEFAULT_BCC') ?: 'gary@gravitywizards.com';
$SIGNATURE = "\n\nBest,\nGary Stout\nTwisted23 & Gravity Wizards (Anchorage, AK)\nhttps://twisted23.com\nmedia@twisted23.com";

function read_data(string $path): array {
    $raw = file_get_contents($path);
    return json_decode($raw ?: '{}', true) ?: ['contacts' => [], 'derbies' => [], 'triage' => []];
}

function write_data(string $path, array $data): void {
    $fp = fopen($path, 'c+');
    if ($fp && flock($fp, LOCK_EX)) {
        ftruncate($fp, 0);
        rewind($fp);
        fwrite($fp, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . "\n");
        fflush($fp);
        flock($fp, LOCK_UN);
        fclose($fp);
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

$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($action === 'status' && $method === 'GET') {
    $key = trim((string)(getenv('RESEND_API_KEY') ?: ''));
    $configured = ($key !== '' && !str_contains($key, 'your_actual_key'));
    echo json_encode([
        'resendConfigured' => $configured,
        'fromAddress' => $FROM_ADDRESS,
        'replyTo' => $REPLY_TO,
    ]);
    exit;
}

if ($action === 'state' && $method === 'GET') {
    echo json_encode(read_data($DATA_FILE));
    exit;
}

if ($action === 'contact' && $method === 'PATCH') {
    $id = $_GET['id'] ?? '';
    $body = json_body();
    $data = read_data($DATA_FILE);
    foreach ($data['contacts'] as &$c) {
        if (($c['id'] ?? '') === $id) {
            foreach (['stage', 'notes', 'subject_line', 'custom_blurb', 'angle', 'cc_email', 'bcc_email'] as $f) {
                if (array_key_exists($f, $body)) $c[$f] = $body[$f];
            }
            $c['updated_at'] = gmdate('c');
            write_data($DATA_FILE, $data);
            echo json_encode($c);
            exit;
        }
    }
    fail(404, 'Contact not found');
}

if ($action === 'contacts' && $method === 'POST') {
    $body = json_body();
    $data = read_data($DATA_FILE);
    $maxP = 0;
    foreach ($data['contacts'] as $c) {
        $maxP = max($maxP, (int)($c['priority'] ?? 0));
    }
    $contact = [
        'id' => 'GW-C' . str_pad((string)(count($data['contacts']) + 5), 3, '0', STR_PAD_LEFT),
        'priority' => $maxP + 1,
        'outlet' => $body['outlet'] ?? 'New Contact',
        'primary_email' => strtolower(trim((string)($body['primary_email'] ?? ''))),
        'cc_email' => strtolower(trim((string)($body['cc_email'] ?? ''))),
        'bcc_email' => strtolower(trim((string)($body['bcc_email'] ?? $DEFAULT_BCC))),
        'angle' => $body['angle'] ?? '',
        'subject_line' => $body['subject_line'] ?? '',
        'custom_blurb' => $body['custom_blurb'] ?? '',
        'stage' => $body['stage'] ?? 'Queued',
        'notes' => $body['notes'] ?? '',
        'delivery_status' => 'Not Sent',
        'resend_id' => null,
        'sent_at' => null,
        'step_2_sent_at' => null,
    ];
    $data['contacts'][] = $contact;
    write_data($DATA_FILE, $data);
    http_response_code(201);
    echo json_encode($contact);
    exit;
}

if ($action === 'send' && $method === 'POST') {
    $body = json_body();
    $contactIds = $body['contactIds'] ?? null;
    $step = (int)($body['step'] ?? 1);
    $dryRun = (bool)($body['dryRun'] ?? true);
    $apiKey = trim((string)(getenv('RESEND_API_KEY') ?: ''));

    if (!$dryRun && ($apiKey === '' || str_contains($apiKey, 'your_actual_key'))) {
        fail(400, 'RESEND_API_KEY is not configured. Add it to .env before sending live emails.');
    }

    $data = read_data($DATA_FILE);
    $results = [];

    foreach ($data['contacts'] as &$c) {
        $match = false;
        if (is_array($contactIds) && count($contactIds) > 0) {
            $match = in_array($c['id'], $contactIds, true);
        } elseif ($step === 1) {
            $match = ($c['stage'] ?? '') === 'Queued' && !empty($c['primary_email']);
        } elseif ($step === 2) {
            $match = ($c['stage'] ?? '') === 'Sent Step 1' && empty($c['step_2_sent_at']) && !empty($c['primary_email']);
        }
        if (!$match) continue;

        if (empty($c['primary_email'])) {
            $results[] = ['id' => $c['id'], 'outlet' => $c['outlet'], 'status' => 'skipped', 'reason' => 'No email address'];
            continue;
        }

        $ccList = array_values(array_filter(array_map('trim', explode(',', (string)($c['cc_email'] ?? '')))));
        $bccRaw = !empty($c['bcc_email']) ? (string)$c['bcc_email'] : $DEFAULT_BCC;
        $bccList = array_values(array_filter(array_map('trim', explode(',', $bccRaw))));
        $subject = $step === 1 ? $c['subject_line'] : 'Re: ' . $c['subject_line'];
        $text = $step === 1
            ? ($c['custom_blurb'] . $SIGNATURE)
            : ("Just a quick follow-up in case my note earlier this week got buried.\n\nIf you have 2 minutes to try it right in your browser, you can jump straight into Tophat Sudoku and the Flipping Dice 3D-in-2D Spatial Lab here:\nhttps://twisted23.com\nhttps://flippingdice.twisted23.com\n\nHappy to share a quick walkthrough or any technical notes if this fits what you're covering." . $SIGNATURE);

        if ($dryRun) {
            $results[] = [
                'id' => $c['id'],
                'outlet' => $c['outlet'],
                'to' => $c['primary_email'],
                'cc' => $ccList,
                'bcc' => $bccList,
                'subject' => $subject,
                'preview' => $text,
                'status' => 'dry_run',
            ];
            continue;
        }

        $payload = [
            'from' => $FROM_ADDRESS,
            'to' => [$c['primary_email']],
            'reply_to' => $REPLY_TO,
            'subject' => $subject,
            'text' => $text,
        ];
        if (count($ccList) > 0) $payload['cc'] = $ccList;
        if (count($bccList) > 0) $payload['bcc'] = $bccList;

        $ch = curl_init('https://api.resend.com/emails');
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_HTTPHEADER => [
                'Authorization: Bearer ' . $apiKey,
                'Content-Type: application/json',
            ],
            CURLOPT_POSTFIELDS => json_encode($payload),
            CURLOPT_TIMEOUT => 15,
        ]);
        $respRaw = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlErr = curl_error($ch);
        curl_close($ch);

        if ($respRaw === false) {
            $results[] = ['id' => $c['id'], 'outlet' => $c['outlet'], 'status' => 'error', 'error' => $curlErr];
            continue;
        }
        $respBody = json_decode($respRaw, true) ?: [];
        if ($httpCode < 200 || $httpCode >= 300) {
            $results[] = ['id' => $c['id'], 'outlet' => $c['outlet'], 'status' => 'error', 'error' => $respBody['message'] ?? "HTTP $httpCode"];
            continue;
        }

        $now = gmdate('c');
        if ($step === 1) {
            $c['stage'] = 'Sent Step 1';
            $c['sent_at'] = $now;
        } else {
            $c['stage'] = 'Sent Step 2';
            $c['step_2_sent_at'] = $now;
        }
        $c['resend_id'] = $respBody['id'] ?? null;
        $c['delivery_status'] = 'Sent to Resend';
        $results[] = ['id' => $c['id'], 'outlet' => $c['outlet'], 'status' => 'sent', 'resend_id' => $c['resend_id']];
    }

    if (!$dryRun) write_data($DATA_FILE, $data);
    echo json_encode(['dryRun' => $dryRun, 'step' => $step, 'results' => $results]);
    exit;
}

if ($action === 'webhooks_resend' && $method === 'POST') {
    $event = json_body();
    $emailId = $event['data']['email_id'] ?? null;
    $type = $event['type'] ?? null;
    if ($emailId && $type) {
        $data = read_data($DATA_FILE);
        $map = [
            'email.sent' => 'Sent',
            'email.delivered' => 'Delivered',
            'email.delivery_delayed' => 'Delayed',
            'email.bounced' => 'Bounced',
            'email.opened' => 'Opened',
            'email.clicked' => 'Clicked',
        ];
        foreach ($data['contacts'] as &$c) {
            if (($c['resend_id'] ?? '') === $emailId) {
                $c['delivery_status'] = $map[$type] ?? $type;
                $c['updated_at'] = gmdate('c');
                write_data($DATA_FILE, $data);
                break;
            }
        }
    }
    echo json_encode(['received' => true]);
    exit;
}

if ($action === 'derbies' && $method === 'POST') {
    $body = json_body();
    $data = read_data($DATA_FILE);
    $item = [
        'id' => 'DERBY-' . str_pad((string)(count($data['derbies']) + 1), 3, '0', STR_PAD_LEFT),
        'title' => $body['title'] ?? 'Untitled Derby Item',
        'role' => $body['role'] ?? 'Derby Ops',
        'date' => $body['date'] ?? '',
        'status' => $body['status'] ?? 'Planned',
        'owner' => $body['owner'] ?? 'Gary',
        'notes' => $body['notes'] ?? '',
    ];
    $data['derbies'][] = $item;
    write_data($DATA_FILE, $data);
    http_response_code(201);
    echo json_encode($item);
    exit;
}

if ($action === 'triage' && $method === 'POST') {
    $body = json_body();
    $data = read_data($DATA_FILE);
    $item = [
        'id' => 'BUG-' . str_pad((string)(count($data['triage']) + 1), 3, '0', STR_PAD_LEFT),
        'surface' => $body['surface'] ?? 'Twisted23.com',
        'title' => $body['title'] ?? 'Untitled Issue',
        'severity' => $body['severity'] ?? 'Medium',
        'status' => $body['status'] ?? 'Open',
        'reporter' => $body['reporter'] ?? 'Internal',
        'notes' => $body['notes'] ?? '',
    ];
    $data['triage'][] = $item;
    write_data($DATA_FILE, $data);
    http_response_code(201);
    echo json_encode($item);
    exit;
}

fail(404, 'Unknown endpoint');
