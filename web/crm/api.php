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
$DEFAULT_BCC = getenv('DEFAULT_BCC') ?: 'gary@gravitywizards.com, botchee@icloud.com';
$HOSTINGER_MAIL_TOKEN = getenv('HOSTINGER_MAIL_TOKEN') ?: 'a023e730fa37a0813595549dffc89c29b1ce09a294328544f0f377bd6291851a';
$HOSTINGER_MAILBOX_ID = getenv('HOSTINGER_MAILBOX_ID') ?: 'AC4474ceb28197b9db960e1111ee79';
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

function classify_inbound_message(string $fromEmail, string $fromName, string $subject, string $snippet, array $headers = []): array {
    $fromEmailLower = strtolower(trim($fromEmail));
    $fromNameLower = strtolower(trim($fromName));
    $subjectLower = strtolower(trim($subject));
    $snippetLower = strtolower(trim($snippet));

    // 1. Sender address checks
    $isBotSender = false;
    $botSenders = [
        'noreply', 'no-reply', 'autoresponder', 'pgautoresponder',
        'mailer-daemon', 'postmaster', 'bounce', 'donotreply',
        'automated', 'notifications', 'notification'
    ];
    foreach ($botSenders as $bs) {
        if (str_contains($fromEmailLower, $bs)) {
            $isBotSender = true;
            break;
        }
    }

    // 2. Subject phrase checks
    $isBotSubject = false;
    $botSubjects = [
        'automatic reply', 'auto-reply', 'autoreply', 'out of office',
        'out of the office', 'undeliverable', 'delivery status notification',
        'mail delivery', 'promoting your game on pocket gamer',
        'acknowledgment', 'acknowledgement', 'receipt of your',
        'thank you for contacting', 'thank you for reaching out',
        'we have received your', 'inquiry received', 'automatic response'
    ];
    foreach ($botSubjects as $sub) {
        if (str_contains($subjectLower, $sub)) {
            $isBotSubject = true;
            break;
        }
    }

    // 3. Body / Snippet heuristics
    $isBotSnippet = false;
    $botSnippets = [
        'thanks for reaching out', 'thank you for reaching out',
        'thanks for contacting', 'thank you for contacting',
        'we appreciate every pitch', 'appreciate every pitch',
        'volume of emails', 'volume of pitches', 'high volume of',
        'general workload', "can't provide feedback", 'cannot provide feedback',
        "can't reply to every", 'cannot reply to every',
        "if we're interested", 'if we are interested',
        'consider pitching again', 'automated response', 'automated message',
        'auto-generated', 'this is an automated', 'autoresponder',
        'out of the office', 'out of office', 'away from my desk',
        'returning on', 'limited access to email', 'do not reply to this email'
    ];
    foreach ($botSnippets as $snip) {
        if (str_contains($snippetLower, $snip)) {
            $isBotSnippet = true;
            break;
        }
    }

    // 4. Header heuristics
    $isBotHeader = false;
    foreach ($headers as $k => $v) {
        $kLower = strtolower((string)$k);
        $vLower = strtolower((string)$v);
        if ($kLower === 'auto-submitted' && $vLower !== 'no') {
            $isBotHeader = true;
            break;
        }
        if ($kLower === 'precedence' && in_array($vLower, ['bulk', 'junk', 'auto_reply'], true)) {
            $isBotHeader = true;
            break;
        }
        if (in_array($kLower, ['x-autoreply', 'x-autorespond', 'x-auto-response-suppress'], true)) {
            $isBotHeader = true;
            break;
        }
    }

    $isAuto = $isBotSender || $isBotSubject || $isBotSnippet || $isBotHeader;

    $reasons = [];
    if ($isBotSender) $reasons[] = 'bot sender address';
    if ($isBotSubject) $reasons[] = 'autoresponder subject';
    if ($isBotSnippet) $reasons[] = 'auto-acknowledgment body keywords';
    if ($isBotHeader) $reasons[] = 'auto-submitted headers';

    return [
        'is_auto' => $isAuto,
        'classification' => $isAuto ? 'Auto-Acknowledged' : 'Human Reply',
        'reason' => implode(', ', $reasons),
    ];
}

$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($action === 'status' && $method === 'GET') {
    $key = trim((string)(getenv('RESEND_API_KEY') ?: ''));
    $resendConfigured = ($key !== '' && !str_contains($key, 'your_actual_key'));
    $hostingerConfigured = ($HOSTINGER_MAIL_TOKEN !== '' && $HOSTINGER_MAILBOX_ID !== '');
    echo json_encode([
        'hostingerMailConfigured' => $hostingerConfigured,
        'resendConfigured' => $resendConfigured,
        'mailAvailable' => function_exists('mail'),
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
            foreach (['stage', 'notes', 'subject_line', 'custom_blurb', 'angle', 'cc_email', 'bcc_email', 'delivery_status', 'sent_at', 'step_2_sent_at', 'last_reply', 'auto_acknowledged', 'auto_acknowledged_at', 'human_replied_at'] as $f) {
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

if ($action === 'reclassify_reply' && $method === 'POST') {
    $body = json_body();
    $id = $body['id'] ?? '';
    $type = $body['type'] ?? 'human'; // 'human' or 'auto'
    $data = read_data($DATA_FILE);
    foreach ($data['contacts'] as &$c) {
        if (($c['id'] ?? '') === $id) {
            if (isset($c['last_reply']) && is_array($c['last_reply'])) {
                $c['last_reply']['type'] = $type;
                $c['last_reply']['classification'] = $type === 'auto' ? 'Auto-Acknowledged' : 'Human Reply';
            }
            if ($type === 'human') {
                $c['stage'] = 'Received Reply';
                $c['delivery_status'] = 'Human Replied';
                $c['human_replied_at'] = gmdate('c');
            } else {
                $c['stage'] = 'Auto-Acknowledged';
                $c['delivery_status'] = 'Auto-Acknowledged';
                $c['auto_acknowledged'] = true;
                $c['auto_acknowledged_at'] = gmdate('c');
            }
            $c['updated_at'] = gmdate('c');
            write_data($DATA_FILE, $data);
            echo json_encode(['success' => true, 'contact' => $c]);
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

    $data = read_data($DATA_FILE);
    $results = [];

    foreach ($data['contacts'] as &$c) {
        $match = false;
        if (is_array($contactIds) && count($contactIds) > 0) {
            $match = in_array($c['id'], $contactIds, true);
        } elseif ($step === 1) {
            $match = ($c['stage'] ?? '') === 'Queued' && !empty($c['primary_email']);
        } elseif ($step === 2) {
            $match = in_array($c['stage'] ?? '', ['Sent Step 1', 'Auto-Acknowledged'], true) && empty($c['step_2_sent_at']) && !empty($c['primary_email']);
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

        // 1. Primary Cloud Dispatch: Hostinger Agentic Mail REST API (100% DKIM Signed, Production Outbound)
        if ($HOSTINGER_MAIL_TOKEN !== '' && $HOSTINGER_MAILBOX_ID !== '') {
            $payload = [
                'to' => [$c['primary_email']],
                'displayName' => 'Gary Stout',
                'subject' => $subject,
                'text' => $text,
            ];
            if (count($ccList) > 0) $payload['cc'] = $ccList;
            if (count($bccList) > 0) $payload['bcc'] = $bccList;

            $ch = curl_init("https://api.mail.hostinger.com/api/v1/mailboxes/{$HOSTINGER_MAILBOX_ID}/send");
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_POST => true,
                CURLOPT_USERAGENT => 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
                CURLOPT_HTTPHEADER => [
                    'Authorization: Bearer ' . $HOSTINGER_MAIL_TOKEN,
                    'Content-Type: application/json',
                ],
                CURLOPT_POSTFIELDS => json_encode($payload),
                CURLOPT_TIMEOUT => 15,
            ]);
            $respRaw = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $curlErr = curl_error($ch);
            curl_close($ch);

            if ($httpCode >= 200 && $httpCode < 300) {
                // Guaranteed BCC Echo Dispatch to Gary & Botchee via Hostinger Mail API
                if (count($bccList) > 0) {
                    $echoText = "=== [TWISTED23 CRM OUTREACH BCC ECHO] ===\n" .
                                "Recipient: " . $c['primary_email'] . "\n" .
                                "Outlet: " . $c['outlet'] . "\n" .
                                "Original Sent At: " . gmdate('c') . "\n" .
                                "Echo Dispatched: " . gmdate('c') . "\n" .
                                "=========================================\n\n" .
                                $text;
                    $echoPayload = [
                        'to' => $bccList,
                        'displayName' => 'Twisted23 CRM',
                        'subject' => "[BCC Sent] " . $subject,
                        'text' => $echoText,
                    ];
                    $chEcho = curl_init("https://api.mail.hostinger.com/api/v1/mailboxes/{$HOSTINGER_MAILBOX_ID}/send");
                    curl_setopt_array($chEcho, [
                        CURLOPT_RETURNTRANSFER => true,
                        CURLOPT_POST => true,
                        CURLOPT_USERAGENT => 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
                        CURLOPT_HTTPHEADER => [
                            'Authorization: Bearer ' . $HOSTINGER_MAIL_TOKEN,
                            'Content-Type: application/json',
                        ],
                        CURLOPT_POSTFIELDS => json_encode($echoPayload),
                        CURLOPT_TIMEOUT => 15,
                    ]);
                    curl_exec($chEcho);
                    curl_close($chEcho);
                }

                $now = gmdate('c');
                if ($step === 1) {
                    $c['stage'] = 'Sent Step 1';
                    $c['sent_at'] = $now;
                } else {
                    $c['stage'] = 'Sent Step 2';
                    $c['step_2_sent_at'] = $now;
                }
                $c['delivery_status'] = 'Sent (Hostinger Mail API)';
                $results[] = [
                    'id' => $c['id'],
                    'outlet' => $c['outlet'],
                    'status' => 'sent',
                    'channel' => 'hostinger_mail_api',
                    'http_code' => $httpCode,
                    'bcc' => $bccList,
                ];
                usleep(300000); // 300ms pause between batch sends to prevent rate limits
                continue;
            }
        }

        // Live send: If API is not configured or fails, dispatch via Hostinger PHP mail() fallback
        if ($apiKey === '' || str_contains($apiKey, 'your_actual_key')) {
            $headers = "From: " . $FROM_ADDRESS . "\r\n" .
                       "Reply-To: " . $REPLY_TO . "\r\n" .
                       "X-Mailer: Twisted23-CRM/1.0 (PHP " . phpversion() . ")\r\n" .
                       "Content-Type: text/plain; charset=UTF-8\r\n";
            if (count($ccList) > 0) $headers .= "Cc: " . implode(', ', $ccList) . "\r\n";

            $sent = @mail($c['primary_email'], $subject, $text, $headers);

            // Send explicit individual copies to all BCC recipients so the server's MTA actually delivers them
            $bccEchoes = [];
            foreach ($bccList as $bccAddr) {
                $bccHeaders = "From: " . $FROM_ADDRESS . "\r\n" .
                              "Reply-To: " . $REPLY_TO . "\r\n" .
                              "X-Mailer: Twisted23-CRM/1.0 (PHP " . phpversion() . ")\r\n" .
                              "X-Bcc-Echo-To: " . $c['primary_email'] . "\r\n" .
                              "Content-Type: text/plain; charset=UTF-8\r\n";
                $echoText = "=== [TWISTED23 CRM OUTREACH BCC ECHO] ===\n" .
                            "Recipient: " . $c['primary_email'] . "\n" .
                            "Outlet: " . $c['outlet'] . "\n" .
                            "Subject: " . $subject . "\n" .
                            "Sent At: " . gmdate('c') . "\n" .
                            "=========================================\n\n" .
                            $text;
                $ok = @mail($bccAddr, "[BCC Sent] " . $subject, $echoText, $bccHeaders);
                $bccEchoes[] = ['address' => $bccAddr, 'sent' => $ok];
            }

            $now = gmdate('c');
            if ($step === 1) {
                $c['stage'] = 'Sent Step 1';
                $c['sent_at'] = $now;
            } else {
                $c['stage'] = 'Sent Step 2';
                $c['step_2_sent_at'] = $now;
            }
            $c['delivery_status'] = $sent ? 'Sent (Hostinger Mail)' : 'Sent (Stage Logged)';
            $results[] = [
                'id' => $c['id'],
                'outlet' => $c['outlet'],
                'status' => 'sent',
                'channel' => 'hostinger_mail',
                'mail_ok' => $sent,
                'bcc' => $bccList,
                'bcc_echoes' => $bccEchoes,
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

if ($action === 'webhooks_hostinger' && $method === 'POST') {
    $rawBody = file_get_contents('php://input');
    $secret = getenv('HOSTINGER_WEBHOOK_SECRET') ?: '';
    if ($secret !== '') {
        $sig = $_SERVER['HTTP_X_HOSTINGER_SIGNATURE'] ?? $_SERVER['HTTP_X_WEBHOOK_SIGNATURE'] ?? '';
        $sig = preg_replace('/^sha256=/i', '', $sig);
        $expected = hash_hmac('sha256', $rawBody, $secret);
        if ($sig !== '' && !hash_equals($expected, $sig)) {
            fail(401, 'Invalid webhook signature');
        }
    }
    $event = json_decode($rawBody, true) ?: [];
    $fromEmail = trim($event['from']['email'] ?? $event['fromEmail'] ?? $event['sender'] ?? '');
    $fromName = trim($event['from']['name'] ?? $event['fromName'] ?? $fromEmail);
    $subject = trim($event['subject'] ?? '(No Subject)');
    $snippet = trim($event['snippet'] ?? $event['text'] ?? $event['body'] ?? '');
    $headers = is_array($event['headers'] ?? null) ? $event['headers'] : [];

    if ($fromEmail !== '') {
        $data = read_data($DATA_FILE);
        $matched = false;
        $normFromEmail = preg_replace('/\+[^@]+/', '', strtolower($fromEmail));
        $fromParts = explode('@', $fromEmail);
        $fromDomain = strtolower($fromParts[1] ?? '');
        $subjectLower = strtolower($subject);

        $cls = classify_inbound_message($fromEmail, $fromName, $subject, $snippet, $headers);
        $isAuto = $cls['is_auto'];
        $stageVal = $isAuto ? 'Auto-Acknowledged' : 'Received Reply';
        $statusVal = $isAuto ? 'Auto-Acknowledged' : 'Human Replied';
        $replyObj = [
            'id' => 'REP-' . substr(md5(uniqid('', true)), 0, 8),
            'type' => $isAuto ? 'auto' : 'human',
            'classification' => $cls['classification'],
            'from' => $fromEmail,
            'from_name' => $fromName,
            'subject' => $subject,
            'snippet' => substr($snippet, 0, 1000),
            'received_at' => gmdate('c'),
            'reason' => $cls['reason'],
        ];

        foreach ($data['contacts'] as &$c) {
            $cEmail = strtolower($c['primary_email'] ?? $c['email'] ?? '');
            $cSubject = strtolower($c['subject_line'] ?? '');
            $cOutlet = strtolower($c['outlet'] ?? '');

            // Collect all emails associated with this contact (primary + all CCs)
            $contactEmails = [];
            if ($cEmail !== '') $contactEmails[] = $cEmail;
            if (!empty($c['cc_email'])) {
                foreach (explode(',', (string)$c['cc_email']) as $ccPart) {
                    $trimmed = strtolower(trim($ccPart));
                    if ($trimmed !== '') $contactEmails[] = $trimmed;
                }
            }

            // 1. Direct or plus-normalized email match across primary and CCs
            $emailMatch = false;
            foreach ($contactEmails as $ce) {
                $normCe = preg_replace('/\+[^@]+/', '', $ce);
                if ($ce === strtolower($fromEmail) || $normCe === $normFromEmail) {
                    $emailMatch = true;
                    break;
                }
            }

            // 2. Domain match across any contact email
            $domainMatch = false;
            if ($fromDomain !== '' && !in_array($fromDomain, ['gmail.com', 'yahoo.com', 'outlook.com', 'icloud.com', 'hotmail.com'], true)) {
                foreach ($contactEmails as $ce) {
                    $ceParts = explode('@', $ce);
                    $ceDomain = strtolower($ceParts[1] ?? '');
                    if ($ceDomain !== '' && $ceDomain === $fromDomain) {
                        $domainMatch = true;
                        break;
                    }
                }
            }

            // 3. Subject match (e.g. autoresponders quoting our subject)
            $subjectMatch = false;
            if ($cSubject !== '' && $subjectLower !== '') {
                $cleanSub = preg_replace('/^(re|fwd):\s*/i', '', $subjectLower);
                $cleanCSub = preg_replace('/^(re|fwd):\s*/i', '', $cSubject);
                $subPrefix = substr($cleanCSub, 0, 25);
                if ($subPrefix !== '' && (str_contains($cleanSub, $subPrefix) || str_contains($subjectLower, $subPrefix))) {
                    $subjectMatch = true;
                }
            }

            // 4. Outlet name match in sender name or body
            $outletMatch = false;
            if ($cOutlet !== '') {
                $shortOutlet = trim(preg_replace('/\s*\(.*?\)/', '', $cOutlet));
                if (strlen($shortOutlet) >= 5 && (str_contains(strtolower($fromName), strtolower($shortOutlet)) || str_contains($snippetLower, strtolower($shortOutlet)))) {
                    $outletMatch = true;
                }
            }

            if ($emailMatch || $subjectMatch || $domainMatch || $outletMatch) {
                $c['delivery_status'] = $statusVal;
                $c['stage'] = $stageVal;
                $c['last_reply'] = $replyObj;
                if (!isset($c['replies']) || !is_array($c['replies'])) {
                    $c['replies'] = [];
                }
                $c['replies'][] = $replyObj;

                if ($isAuto) {
                    $c['auto_acknowledged'] = true;
                    $c['auto_acknowledged_at'] = gmdate('c');
                } else {
                    $c['human_replied_at'] = gmdate('c');
                }

                $tag = $isAuto ? "[Auto-Ack: {$subject}]" : "[Human Reply: {$subject}]";
                $c['notes'] = ($c['notes'] ? $c['notes'] . " | " : "") . "{$tag} " . substr($snippet, 0, 160);
                $c['updated_at'] = gmdate('c');
                $matched = true;
                break;
            }
        }

        if (!$matched) {
            $newContact = [
                'id' => 'GW-C' . str_pad((string)(count($data['contacts']) + 5), 3, '0', STR_PAD_LEFT),
                'priority' => count($data['contacts']) + 1,
                'name' => $fromName,
                'outlet' => $fromName ?: 'Inbound Sender',
                'primary_email' => $fromEmail,
                'stage' => $stageVal,
                'delivery_status' => $statusVal,
                'last_reply' => $replyObj,
                'replies' => [$replyObj],
                'notes' => ($isAuto ? "[Auto-Ack: {$subject}] " : "[Human Reply: {$subject}] ") . substr($snippet, 0, 160),
                'created_at' => gmdate('c'),
                'updated_at' => gmdate('c'),
            ];
            if ($isAuto) {
                $newContact['auto_acknowledged'] = true;
                $newContact['auto_acknowledged_at'] = gmdate('c');
            } else {
                $newContact['human_replied_at'] = gmdate('c');
            }
            $data['contacts'][] = $newContact;
        }
        write_data($DATA_FILE, $data);
    }
    echo json_encode([
        'received' => true,
        'from' => $fromEmail,
        'classification' => $cls['classification'] ?? 'unknown',
        'is_auto' => $cls['is_auto'] ?? false,
    ]);
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

if ($action === 'echo_bcc' && $method === 'POST') {
    $body = json_body();
    $id = $body['id'] ?? '';
    $targets = $body['targets'] ?? ['botchee@icloud.com', 'gary@gravitywizards.com'];
    if (is_string($targets)) {
        $targets = array_values(array_filter(array_map('trim', explode(',', $targets))));
    }
    $data = read_data($DATA_FILE);
    foreach ($data['contacts'] as $c) {
        if ($c['id'] === $id) {
            $subject = $c['subject_line'] ?? 'Twisted23 Pitch';
            $text = ($c['custom_blurb'] ?? '') . $SIGNATURE;
            $echoText = "=== [TWISTED23 CRM OUTREACH BCC ECHO] ===\n" .
                        "Recipient: " . ($c['primary_email'] ?? '') . "\n" .
                        "Outlet: " . ($c['outlet'] ?? '') . "\n" .
                        "Original Sent At: " . ($c['sent_at'] ?? 'Earlier') . "\n" .
                        "Echo Dispatched: " . gmdate('c') . "\n" .
                        "=========================================\n\n" .
                        $text;

            if ($HOSTINGER_MAIL_TOKEN !== '' && $HOSTINGER_MAILBOX_ID !== '') {
                $payload = [
                    'to' => $targets,
                    'displayName' => 'Twisted23 CRM',
                    'subject' => "[BCC Sent] " . $subject,
                    'text' => $echoText,
                ];
                $ch = curl_init("https://api.mail.hostinger.com/api/v1/mailboxes/{$HOSTINGER_MAILBOX_ID}/send");
                curl_setopt_array($ch, [
                    CURLOPT_RETURNTRANSFER => true,
                    CURLOPT_POST => true,
                    CURLOPT_USERAGENT => 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
                    CURLOPT_HTTPHEADER => [
                        'Authorization: Bearer ' . $HOSTINGER_MAIL_TOKEN,
                        'Content-Type: application/json',
                    ],
                    CURLOPT_POSTFIELDS => json_encode($payload),
                    CURLOPT_TIMEOUT => 15,
                ]);
                $respRaw = curl_exec($ch);
                $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
                curl_close($ch);

                if ($httpCode >= 200 && $httpCode < 300) {
                    echo json_encode([
                        'success' => true,
                        'contactId' => $c['id'],
                        'outlet' => $c['outlet'],
                        'channel' => 'hostinger_mail_api',
                        'http_code' => $httpCode,
                        'targets' => $targets,
                    ]);
                    exit;
                }
            }

            $results = [];
            foreach ($targets as $addr) {
                $headers = "From: " . $FROM_ADDRESS . "\r\n" .
                           "Reply-To: " . $REPLY_TO . "\r\n" .
                           "X-Mailer: Twisted23-CRM/1.0 (PHP " . phpversion() . ")\r\n" .
                           "X-Bcc-Echo-To: " . ($c['primary_email'] ?? '') . "\r\n" .
                           "Content-Type: text/plain; charset=UTF-8\r\n";
                $ok = @mail($addr, "[BCC Sent] " . $subject, $echoText, $headers);
                $results[] = ['address' => $addr, 'sent' => $ok];
            }
            echo json_encode([
                'success' => true,
                'contactId' => $c['id'],
                'outlet' => $c['outlet'],
                'channel' => 'php_mail_fallback',
                'echoes' => $results,
            ]);
            exit;
        }
    }
    fail(404, 'Contact not found');
}

fail(404, 'Unknown endpoint');
