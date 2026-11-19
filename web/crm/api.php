<?php
declare(strict_types=1);

error_reporting(E_ALL);
ini_set('display_errors', '0');

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

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
$HOSTINGER_MAIL_TOKEN = getenv('HOSTINGER_MAIL_TOKEN') ?: 'a023e730fa37a0813595549dffc89c29b1ce09a294328544f0f377bd6291851a';
$HOSTINGER_MAILBOX_ID = getenv('HOSTINGER_MAILBOX_ID') ?: 'AC4474ceb28197b9db960e1111ee79';
$SIGNATURE = "\n\nBest,\nGary Stout\nTwisted23 & Gravity Wizards (Anchorage, AK)\nhttps://twisted23.com\nmedia@twisted23.com";

function runtime_file_for(string $path): string {
    return dirname($path) . '/crm.runtime.json';
}

function sent_log_file_for(string $path): string {
    return dirname($path) . '/sent_log.jsonl';
}

function read_sent_ledger(string $logPath): array {
    if (!is_file($logPath)) return [];
    $ledger = [];
    foreach (file($logPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [] as $line) {
        $row = json_decode($line, true);
        if (is_array($row) && !empty($row['id']) && !empty($row['step'])) {
            $ledger[$row['id'] . ':' . (int)$row['step']] = $row;
        }
    }
    return $ledger;
}

function count_recent_sent_stats(string $logPath, int $windowSeconds = 86400): array {
    if (!is_file($logPath)) {
        return ['pitches_24h' => 0, 'credits_24h_est' => 0];
    }
    $cutoff = time() - $windowSeconds;
    $pitches = 0;
    $credits = 0;
    foreach (file($logPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [] as $line) {
        $row = json_decode($line, true);
        if (!is_array($row) || empty($row['sent_at'])) continue;
        $ts = strtotime((string)$row['sent_at']);
        if ($ts !== false && $ts >= $cutoff) {
            $isSummary = (($row['kind'] ?? '') === 'daily_summary' || (int)($row['step'] ?? 1) === 0);
            if (!$isSummary) {
                $pitches++;
            }
            // Legacy entries prior to Zero-BCC policy did not log recipient_credits and used ~5 credits/pitch
            $credits += isset($row['recipient_credits']) ? max(1, (int)$row['recipient_credits']) : 5;
        }
    }
    return ['pitches_24h' => $pitches, 'credits_24h_est' => $credits];
}

function append_sent_ledger(string $logPath, array $entry): void {
    @file_put_contents($logPath, json_encode($entry, JSON_UNESCAPED_SLASHES) . "\n", FILE_APPEND | LOCK_EX);
}

function write_single_json(string $target, string $json): bool {
    $fp = @fopen($target, 'c+');
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
    $written = @file_put_contents($target, $json, LOCK_EX);
    if ($written === false) {
        $written = @file_put_contents($target, $json);
    }
    return $written !== false;
}

function read_data(string $path): array {
    $seedRaw = is_file($path) ? file_get_contents($path) : '';
    $seed = json_decode($seedRaw ?: '{}', true) ?: ['contacts' => [], 'derbies' => [], 'triage' => []];

    $runtimePath = runtime_file_for($path);
    $runtime = [];
    if (is_file($runtimePath)) {
        $rtRaw = file_get_contents($runtimePath);
        $runtime = json_decode($rtRaw ?: '{}', true) ?: [];
    }

    $rtById = [];
    foreach (($runtime['contacts'] ?? []) as $rc) {
        if (!empty($rc['id'])) $rtById[$rc['id']] = $rc;
    }

    $mergedContacts = [];
    $seenIds = [];
    foreach (($seed['contacts'] ?? []) as $sc) {
        $cid = $sc['id'] ?? '';
        $seenIds[$cid] = true;
        if ($cid !== '' && isset($rtById[$cid])) {
            $rc = $rtById[$cid];
            $seedCopyRev = (int)($sc['copy_rev'] ?? 0);
            $rtCopyRev = (int)($rc['copy_rev'] ?? 0);
            $seedRequeueRev = (int)($sc['requeue_rev'] ?? 0);
            $rtRequeueRev = (int)($rc['requeue_rev'] ?? 0);
            $seedRequeuedTs = !empty($sc['requeued_at']) ? (strtotime((string)$sc['requeued_at']) ?: 0) : 0;
            $rtSentTs = !empty($rc['sent_at']) ? (strtotime((string)$rc['sent_at']) ?: 0) : 0;

            $seedCopyFields = [
                'category' => $sc['category'] ?? '',
                'angle' => $sc['angle'] ?? '',
                'subject_line' => $sc['subject_line'] ?? '',
                'custom_blurb' => $sc['custom_blurb'] ?? '',
                'custom_signature' => $sc['custom_signature'] ?? '',
                'copy_rev' => $seedCopyRev,
            ];
            $seedRequeueFields = [
                'stage' => $sc['stage'] ?? 'Queued',
                'delivery_status' => $sc['delivery_status'] ?? 'Rate-Limited (Re-Queued)',
                'notes' => $sc['notes'] ?? '',
                'requeue_rev' => $seedRequeueRev,
                'requeued_at' => $sc['requeued_at'] ?? gmdate('c'),
                'sent_at' => null,
            ];

            $rtAhead = !empty($rc['sent_at']) || !empty($rc['step_2_sent_at']) || !empty($rc['last_reply']) || !empty($rc['updated_at']) || (($rc['stage'] ?? 'Queued') !== 'Queued');
            if ($rtAhead) {
                $sc = array_merge($sc, $rc);
                if ($seedCopyRev > $rtCopyRev) {
                    $sc = array_merge($sc, $seedCopyFields);
                }
                // If seed explicitly re-queued a rate-limited/bounced pitch after its failed attempt, restore Queued
                if ($seedRequeueRev > $rtRequeueRev && ($rtSentTs === 0 || ($seedRequeuedTs > 0 && $rtSentTs < $seedRequeuedTs))) {
                    $sc = array_merge($sc, $seedRequeueFields);
                }
            }
        }
        $sc['bcc_email'] = '';
        $mergedContacts[] = $sc;
    }
    foreach (($runtime['contacts'] ?? []) as $rc) {
        $cid = $rc['id'] ?? '';
        if ($cid !== '' && empty($seenIds[$cid])) {
            $rc['bcc_email'] = '';
            $mergedContacts[] = $rc;
        }
    }

    // Reconcile against append-only sent_log.jsonl so genuinely sent pitches never revert to Queued,
    // while honoring explicit re-queues (requeued_at >= ledger sent_at) and Bounced/Dropped stages.
    $ledger = read_sent_ledger(sent_log_file_for($path));
    if (!empty($ledger)) {
        foreach ($mergedContacts as &$mc) {
            $cid = $mc['id'] ?? '';
            if ($cid === '') continue;
            if (isset($ledger["{$cid}:1"]) && empty($mc['sent_at'])) {
                $l1 = $ledger["{$cid}:1"];
                $ledgerSentTs = strtotime((string)($l1['sent_at'] ?? '')) ?: 0;
                $requeuedTs = !empty($mc['requeued_at']) ? (strtotime((string)$mc['requeued_at']) ?: 0) : 0;
                $isExplicitlyReset = in_array($mc['stage'] ?? '', ['Bounced', 'Dropped'], true)
                    || ($requeuedTs > 0 && $requeuedTs >= $ledgerSentTs);
                if (!$isExplicitlyReset) {
                    $mc['sent_at'] = $l1['sent_at'] ?? gmdate('c');
                    if (($mc['stage'] ?? 'Queued') === 'Queued') {
                        $mc['stage'] = 'Sent Step 1';
                    }
                    if (($mc['delivery_status'] ?? 'Not Sent') === 'Not Sent') {
                        $mc['delivery_status'] = $l1['delivery_status'] ?? 'Sent (Hostinger Mail API)';
                    }
                }
            }
            if (isset($ledger["{$cid}:2"]) && empty($mc['step_2_sent_at'])) {
                $l2 = $ledger["{$cid}:2"];
                $mc['step_2_sent_at'] = $l2['sent_at'] ?? gmdate('c');
                if (in_array($mc['stage'] ?? '', ['Queued', 'Sent Step 1'], true)) {
                    $mc['stage'] = 'Sent Step 2';
                }
            }
        }
        unset($mc);
    }

    return [
        'contacts' => $mergedContacts,
        'derbies' => !empty($runtime['derbies']) ? $runtime['derbies'] : ($seed['derbies'] ?? []),
        'triage' => !empty($runtime['triage']) ? $runtime['triage'] : ($seed['triage'] ?? []),
        'bom' => !empty($runtime['bom']) ? $runtime['bom'] : ($seed['bom'] ?? []),
        'bom_ideas' => !empty($runtime['bom_ideas']) ? $runtime['bom_ideas'] : ($seed['bom_ideas'] ?? []),
        'financials' => !empty($runtime['financials']) ? $runtime['financials'] : ($seed['financials'] ?? []),
    ];
}

function write_data(string $path, array $data): bool {
    $json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . "\n";
    $okRuntime = write_single_json(runtime_file_for($path), $json);
    $okSeed = write_single_json($path, $json);
    return $okRuntime || $okSeed;
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

    // 0. MTA Bounce / Rate-Limit DSN detection (distinct from autoresponders)
    $isDsnSender = str_contains($fromEmailLower, 'mailer-daemon')
        || str_contains($fromEmailLower, 'postmaster')
        || str_contains($fromNameLower, 'mail delivery');
    $isDsnSubject = str_contains($subjectLower, 'undelivered mail')
        || str_contains($subjectLower, 'undeliverable')
        || str_contains($subjectLower, 'delivery status notification')
        || str_contains($subjectLower, 'failure notice')
        || str_contains($subjectLower, 'returned mail')
        || str_contains($subjectLower, 'sending limit');
    $isDsnBody = str_contains($snippetLower, 'your message could not be delivered')
        || str_contains($snippetLower, 'action: failed')
        || str_contains($snippetLower, 'final-recipient:')
        || str_contains($snippetLower, 'ratelimit exceeded');
    $isRateLimit = str_contains($snippetLower, 'ratelimit exceeded')
        || str_contains($snippetLower, '451 4.7.1')
        || str_contains($snippetLower, 'reached the allowed sending limit')
        || str_contains($subjectLower, 'sending limit');

    if (($isDsnSender && ($isDsnSubject || $isDsnBody)) || $isRateLimit) {
        return [
            'is_auto' => true,
            'is_bounce' => true,
            'is_rate_limit' => $isRateLimit,
            'classification' => $isRateLimit ? 'Rate-Limited (Re-Queued)' : 'Bounced',
            'reason' => $isRateLimit ? 'MTA 451 4.7.1 sender daily rate limit' : 'MTA delivery failure DSN',
        ];
    }

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
        'is_bounce' => false,
        'is_rate_limit' => false,
        'classification' => $isAuto ? 'Auto-Acknowledged' : 'Human Reply',
        'reason' => implode(', ', $reasons),
    ];
}

require_once dirname(__DIR__) . '/auth/guard.php';
require_once __DIR__ . '/daily_summary.php';

$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

// Inbound server-to-server mail webhooks & scheduled 4:11 PM summary cron authenticate via dedicated tokens;
// all interactive GwCrm endpoints require Founder / Administrator session.
$authCtx = null;
if (!in_array($action, ['webhooks_resend', 'webhooks_hostinger', 'cron_daily_summary'], true)) {
    $authCtx = tw23_require_admin_json();
}

if ($action === 'cron_daily_summary' && in_array($method, ['GET', 'POST'], true)) {
    $dsCfg = gwcrm_ds_config(__DIR__);
    $providedToken = trim((string)($_SERVER['HTTP_X_GWCRM_CRON_TOKEN'] ?? ($_GET['token'] ?? '')));
    if ($providedToken === '' || !hash_equals($dsCfg['cron_token'], $providedToken)) {
        http_response_code(403);
        echo json_encode(['ok' => false, 'error' => 'Invalid cron token']);
        exit;
    }
    $res = gwcrm_ds_maybe_send(__DIR__, false, false);
    if (empty($res['ok'])) {
        http_response_code(502);
    }
    echo json_encode($res);
    exit;
}

if ($action === 'daily_summary_preview' && $method === 'GET') {
    echo json_encode(gwcrm_ds_maybe_send(__DIR__, true, false));
    exit;
}

if ($action === 'daily_summary_send_now' && $method === 'POST') {
    $res = gwcrm_ds_maybe_send(__DIR__, false, true);
    if (empty($res['ok'])) {
        http_response_code(502);
    }
    echo json_encode($res);
    exit;
}

if ($action === 'status' && $method === 'GET') {
    gwcrm_ds_fast_tick(__DIR__);
    $key = trim((string)(getenv('RESEND_API_KEY') ?: ''));
    $resendConfigured = ($key !== '' && !str_contains($key, 'your_actual_key'));
    $hostingerConfigured = ($HOSTINGER_MAIL_TOKEN !== '' && $HOSTINGER_MAILBOX_ID !== '');
    $quotaStats = count_recent_sent_stats(sent_log_file_for($DATA_FILE));
    echo json_encode([
        'hostingerMailConfigured' => $hostingerConfigured,
        'resendConfigured' => $resendConfigured,
        'mailAvailable' => function_exists('mail'),
        'fromAddress' => $FROM_ADDRESS,
        'replyTo' => $REPLY_TO,
        'zeroBccActive' => true,
        'pitchesLast24h' => $quotaStats['pitches_24h'],
        'creditsLast24hEst' => $quotaStats['credits_24h_est'],
        'dailyCreditLimit' => 100,
        'dailySummary' => gwcrm_ds_status(__DIR__),
        'authUser' => $authCtx ? tw23_sanitize_user($authCtx['user'], true) : null,
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
            foreach (['primary_email', 'outlet', 'stage', 'notes', 'subject_line', 'custom_blurb', 'angle', 'cc_email', 'delivery_status', 'sent_at', 'step_2_sent_at', 'last_reply', 'auto_acknowledged', 'auto_acknowledged_at', 'human_replied_at', 'requeued_at', 'requeue_rev'] as $f) {
                if (array_key_exists($f, $body)) $c[$f] = $body[$f];
            }
            $c['bcc_email'] = '';
            if (array_key_exists('angle', $body) || array_key_exists('subject_line', $body) || array_key_exists('custom_blurb', $body)) {
                $c['copy_rev'] = ((int)($c['copy_rev'] ?? 0)) + 1;
            }
            // When staff resets a contact to Queued or Bounced, clear sent_at and stamp requeued_at so retry isn't blocked by sent_log.jsonl
            if (isset($body['stage']) && in_array($body['stage'], ['Queued', 'Bounced'], true)) {
                $c['sent_at'] = null;
                $c['requeued_at'] = gmdate('c');
                $c['requeue_rev'] = ((int)($c['requeue_rev'] ?? 0)) + 1;
                if (!array_key_exists('delivery_status', $body)) {
                    $c['delivery_status'] = $body['stage'] === 'Bounced' ? 'Bounced (Retry Pending)' : 'Re-Queued (Ready)';
                }
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
        'bcc_email' => '',
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
    $sentLedger = read_sent_ledger(sent_log_file_for($DATA_FILE));
    $forceResend = !empty($body['forceResend']);
    $results = [];
    $limit = isset($body['limit']) ? (int)$body['limit'] : (is_array($contactIds) ? count($contactIds) : 2);
    $matchedCount = 0;

    foreach ($data['contacts'] as &$c) {
        $match = false;
        if (is_array($contactIds)) {
            $match = in_array($c['id'], $contactIds, true);
        } elseif ($step === 1) {
            $match = ($c['stage'] ?? '') === 'Queued' && !empty($c['primary_email']);
        } elseif ($step === 2) {
            $match = in_array($c['stage'] ?? '', ['Sent Step 1', 'Auto-Acknowledged'], true) && empty($c['step_2_sent_at']) && !empty($c['primary_email']);
        }
        if (!$match) continue;

        if ($matchedCount >= $limit) {
            break;
        }
        $matchedCount++;

        if (empty($c['primary_email'])) {
            $results[] = ['id' => $c['id'], 'outlet' => $c['outlet'], 'status' => 'skipped', 'reason' => 'No email address'];
            continue;
        }

        // Duplicate-dispatch safety guard: block accidental repeat sends unless forceResend=true or contact was explicitly re-queued/bounced
        $ledgerKey = ($c['id'] ?? '') . ':' . $step;
        $ledgerEntry = $sentLedger[$ledgerKey] ?? null;
        $ledgerSentTs = $ledgerEntry ? (strtotime((string)($ledgerEntry['sent_at'] ?? '')) ?: 0) : 0;
        $requeuedTs = !empty($c['requeued_at']) ? (strtotime((string)$c['requeued_at']) ?: 0) : 0;
        $ledgerActive = $ledgerEntry !== null
            && !($step === 1 && (($c['stage'] ?? '') === 'Bounced' || ($requeuedTs > 0 && $requeuedTs >= $ledgerSentTs)));
        $alreadySentStep = ($step === 1 && !empty($c['sent_at'])) || ($step === 2 && !empty($c['step_2_sent_at'])) || $ledgerActive;
        if (!$dryRun && !$forceResend && $alreadySentStep) {
            $results[] = [
                'id' => $c['id'],
                'outlet' => $c['outlet'],
                'status' => 'skipped_duplicate',
                'reason' => "Already dispatched Step {$step} earlier (duplicate protection active)",
            ];
            continue;
        }

        // Zero-BCC Policy: GwCrm emails never include BCC recipients; copies are archived in media@twisted23.com Sent & sent_log.jsonl
        $ccList = array_values(array_filter(array_map('trim', explode(',', (string)($c['cc_email'] ?? '')))));
        $recipientCredits = 1 + count($ccList);

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
                'credits_used' => $recipientCredits,
                'subject' => $subject,
                'preview' => $text,
                'status' => 'dry_run',
            ];
            continue;
        }

        // 1. Primary Cloud Dispatch: Hostinger Agentic Mail REST API (100% DKIM Signed, Zero-BCC Single Envelope)
        if ($HOSTINGER_MAIL_TOKEN !== '' && $HOSTINGER_MAILBOX_ID !== '') {
            $payload = [
                'to' => [$c['primary_email']],
                'displayName' => 'Gary Stout',
                'subject' => $subject,
                'text' => $text,
            ];
            if (count($ccList) > 0) $payload['cc'] = $ccList;

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
                $now = gmdate('c');
                if ($step === 1) {
                    $c['stage'] = 'Sent Step 1';
                    $c['sent_at'] = $now;
                } else {
                    $c['stage'] = 'Sent Step 2';
                    $c['step_2_sent_at'] = $now;
                }
                $c['delivery_status'] = 'Sent (Hostinger Mail API)';
                append_sent_ledger(sent_log_file_for($DATA_FILE), [
                    'id' => $c['id'],
                    'outlet' => $c['outlet'],
                    'to' => $c['primary_email'],
                    'step' => $step,
                    'sent_at' => $now,
                    'recipient_credits' => $recipientCredits,
                    'delivery_status' => $c['delivery_status'],
                ]);
                $results[] = [
                    'id' => $c['id'],
                    'outlet' => $c['outlet'],
                    'to' => $c['primary_email'],
                    'cc' => $ccList,
                    'credits_used' => $recipientCredits,
                    'status' => 'sent',
                    'channel' => 'hostinger_mail_api',
                    'http_code' => $httpCode,
                ];
                usleep(500000); // 500ms pause between batch sends to respect MTA rate limits
                continue;
            }

            // Do NOT fall through to @mail() when Hostinger API rejects or rate-limits a send; keep contact Queued for retry
            $respJson = is_string($respRaw) ? (json_decode($respRaw, true) ?: []) : [];
            $apiErr = trim((string)($respJson['message'] ?? $respJson['error'] ?? ($curlErr ?: "Hostinger Mail API HTTP {$httpCode}")));
            $isRateLimited = ($httpCode === 429 || $httpCode === 451 || stripos($apiErr, 'limit') !== false || stripos($apiErr, 'rate') !== false);
            if ($isRateLimited) {
                $c['delivery_status'] = 'Rate-Limited (Retry Later)';
                $results[] = [
                    'id' => $c['id'],
                    'outlet' => $c['outlet'],
                    'status' => 'rate_limited',
                    'http_code' => $httpCode,
                    'error' => "Hostinger daily sending limit reached ({$apiErr}). Kept Queued for next window.",
                ];
                break; // Halt batch immediately so remaining contacts stay untouched
            }
            $results[] = [
                'id' => $c['id'],
                'outlet' => $c['outlet'],
                'status' => 'error',
                'http_code' => $httpCode,
                'error' => $apiErr,
            ];
            continue;
        }

        // Live send fallback: Hostinger PHP mail() only if neither Hostinger Mail API nor Resend API is configured
        if ($apiKey === '' || str_contains($apiKey, 'your_actual_key')) {
            $headers = "From: " . $FROM_ADDRESS . "\r\n" .
                       "Reply-To: " . $REPLY_TO . "\r\n" .
                       "X-Mailer: Twisted23-CRM/1.0 (PHP " . phpversion() . ")\r\n" .
                       "Content-Type: text/plain; charset=UTF-8\r\n";
            if (count($ccList) > 0) $headers .= "Cc: " . implode(', ', $ccList) . "\r\n";

            $sent = @mail($c['primary_email'], $subject, $text, $headers);

            $now = gmdate('c');
            if ($step === 1) {
                $c['stage'] = 'Sent Step 1';
                $c['sent_at'] = $now;
            } else {
                $c['stage'] = 'Sent Step 2';
                $c['step_2_sent_at'] = $now;
            }
            $c['delivery_status'] = $sent ? 'Sent (Hostinger Mail)' : 'Sent (Stage Logged)';
            append_sent_ledger(sent_log_file_for($DATA_FILE), [
                'id' => $c['id'],
                'outlet' => $c['outlet'],
                'to' => $c['primary_email'],
                'step' => $step,
                'sent_at' => $now,
                'recipient_credits' => $recipientCredits,
                'delivery_status' => $c['delivery_status'],
            ]);
            $results[] = [
                'id' => $c['id'],
                'outlet' => $c['outlet'],
                'to' => $c['primary_email'],
                'cc' => $ccList,
                'credits_used' => $recipientCredits,
                'status' => 'sent',
                'channel' => 'hostinger_mail',
                'mail_ok' => $sent,
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
        append_sent_ledger(sent_log_file_for($DATA_FILE), [
            'id' => $c['id'],
            'outlet' => $c['outlet'],
            'to' => $c['primary_email'],
            'step' => $step,
            'sent_at' => $now,
            'recipient_credits' => $recipientCredits,
            'delivery_status' => $c['delivery_status'],
        ]);
        $results[] = ['id' => $c['id'], 'outlet' => $c['outlet'], 'credits_used' => $recipientCredits, 'status' => 'sent', 'resend_id' => $c['resend_id']];
    }

    if (!$dryRun) {
        write_data($DATA_FILE, $data);
        $sentOutlets = array_map(fn($r) => ($r['outlet'] ?? $r['id'] ?? '?') . ':' . ($r['status'] ?? '?'), $results);
        tw23_audit_log('GWCRM_SEND', $authCtx['user']['username'] ?? 'Staff', "Step {$step} -> " . implode(', ', $sentOutlets));
    }
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
        $snippetLower = strtolower($snippet);

        $cls = classify_inbound_message($fromEmail, $fromName, $subject, $snippet, $headers);
        $isAuto = $cls['is_auto'];
        $isBounce = !empty($cls['is_bounce']);
        $isRateLimit = !empty($cls['is_rate_limit']);

        if ($isBounce) {
            $stageVal = $isRateLimit ? 'Queued' : 'Bounced';
            $statusVal = $isRateLimit ? 'Rate-Limited (Re-Queued)' : 'Bounced (DSN)';
        } else {
            $stageVal = $isAuto ? 'Auto-Acknowledged' : 'Received Reply';
            $statusVal = $isAuto ? 'Auto-Acknowledged' : 'Human Replied';
        }
        $replyObj = [
            'id' => 'REP-' . substr(md5(uniqid('', true)), 0, 8),
            'type' => $isBounce ? 'bounce' : ($isAuto ? 'auto' : 'human'),
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

            // 1. Direct or plus-normalized email match across primary and CCs (or Final-Recipient inside DSN body)
            $emailMatch = false;
            foreach ($contactEmails as $ce) {
                $normCe = preg_replace('/\+[^@]+/', '', $ce);
                if ($ce === strtolower($fromEmail) || $normCe === $normFromEmail) {
                    $emailMatch = true;
                    break;
                }
                if ($isBounce && $ce !== '' && str_contains($snippetLower, $ce)) {
                    $emailMatch = true;
                    break;
                }
            }

            // 2. Domain match across any contact email (skip for mailer-daemon DSNs so hostinger.com doesn't mismatch)
            $domainMatch = false;
            if (!$isBounce && $fromDomain !== '' && !in_array($fromDomain, ['gmail.com', 'yahoo.com', 'outlook.com', 'icloud.com', 'hotmail.com', 'hostinger.com', 'mail.hostinger.com'], true)) {
                foreach ($contactEmails as $ce) {
                    $ceParts = explode('@', $ce);
                    $ceDomain = strtolower($ceParts[1] ?? '');
                    if ($ceDomain !== '' && $ceDomain === $fromDomain) {
                        $domainMatch = true;
                        break;
                    }
                }
            }

            // 3. Subject match (e.g. autoresponders or DSN headers quoting our subject)
            $subjectMatch = false;
            if ($cSubject !== '' && ($subjectLower !== '' || $snippetLower !== '')) {
                $cleanSub = preg_replace('/^(re|fwd):\s*/i', '', $subjectLower);
                $cleanCSub = preg_replace('/^(re|fwd):\s*/i', '', $cSubject);
                $subPrefix = substr($cleanCSub, 0, 25);
                if ($subPrefix !== '' && (str_contains($cleanSub, $subPrefix) || str_contains($subjectLower, $subPrefix) || ($isBounce && str_contains($snippetLower, $subPrefix)))) {
                    $subjectMatch = true;
                }
            }

            // 4. Outlet name match in sender name or body
            $outletMatch = false;
            if (!$isBounce && $cOutlet !== '') {
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

                if ($isBounce) {
                    $c['sent_at'] = null;
                    $c['requeued_at'] = gmdate('c');
                    $c['requeue_rev'] = ((int)($c['requeue_rev'] ?? 0)) + 1;
                } elseif ($isAuto) {
                    $c['auto_acknowledged'] = true;
                    $c['auto_acknowledged_at'] = gmdate('c');
                } else {
                    $c['human_replied_at'] = gmdate('c');
                }

                $tag = $isBounce ? ($isRateLimit ? "[Rate-Limit Re-Queued]" : "[Bounce DSN]") : ($isAuto ? "[Auto-Ack: {$subject}]" : "[Human Reply: {$subject}]");
                $c['notes'] = ($c['notes'] ? $c['notes'] . " | " : "") . "{$tag} " . substr($snippet, 0, 160);
                $c['updated_at'] = gmdate('c');
                $matched = true;
                break;
            }
        }

        if (!$matched && !$isBounce) {
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
        'is_bounce' => $cls['is_bounce'] ?? false,
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

if ($action === 'bom' && $method === 'POST') {
    $body = json_body();
    $data = read_data($DATA_FILE);
    if (!isset($data['bom']) || !is_array($data['bom'])) {
        $data['bom'] = [];
    }
    $item = [
        'id' => 'BOM-U' . str_pad((string)(count($data['bom']) + 1), 2, '0', STR_PAD_LEFT),
        'assembly' => trim((string)($body['assembly'] ?? 'Launcher Wireless RF Trigger')),
        'part_no' => trim((string)($body['part_no'] ?? 'CUSTOM')),
        'name' => trim((string)($body['name'] ?? 'Untitled Part')),
        'qty_per_launcher' => max(0, (float)($body['qty_per_launcher'] ?? 0)),
        'qty_per_fobb_kit' => max(0, (float)($body['qty_per_fobb_kit'] ?? 0)),
        'unit_cost_usd' => max(0, round((float)($body['unit_cost_usd'] ?? 0), 2)),
        'retail_sku_usd' => ($body['retail_sku_usd'] ?? '') !== '' && $body['retail_sku_usd'] !== null ? round((float)$body['retail_sku_usd'], 2) : null,
        'supplier_url' => trim((string)($body['supplier_url'] ?? '')),
        'status' => trim((string)($body['status'] ?? 'Planned')),
        'spec_notes' => trim((string)($body['spec_notes'] ?? '')),
    ];
    $data['bom'][] = $item;
    write_data($DATA_FILE, $data);
    http_response_code(201);
    echo json_encode($item);
    exit;
}

if ($action === 'bom_item' && $method === 'PATCH') {
    $id = trim((string)($_GET['id'] ?? ''));
    if ($id === '') fail(400, 'Missing BOM id');
    $body = json_body();
    $data = read_data($DATA_FILE);
    $found = null;
    foreach ($data['bom'] as &$b) {
        if (($b['id'] ?? '') === $id) {
            foreach (['assembly', 'part_no', 'name', 'supplier_url', 'status', 'spec_notes'] as $strField) {
                if (array_key_exists($strField, $body)) $b[$strField] = trim((string)$body[$strField]);
            }
            foreach (['qty_per_launcher', 'qty_per_fobb_kit', 'unit_cost_usd'] as $numField) {
                if (array_key_exists($numField, $body)) $b[$numField] = max(0, round((float)$body[$numField], 2));
            }
            if (array_key_exists('retail_sku_usd', $body)) {
                $b['retail_sku_usd'] = ($body['retail_sku_usd'] === '' || $body['retail_sku_usd'] === null) ? null : round((float)$body['retail_sku_usd'], 2);
            }
            $found = $b;
            break;
        }
    }
    unset($b);
    if (!$found) fail(404, 'BOM item not found');
    write_data($DATA_FILE, $data);
    echo json_encode($found);
    exit;
}

if ($action === 'financials' && $method === 'POST') {
    $body = json_body();
    $data = read_data($DATA_FILE);
    if (!isset($data['financials']) || !is_array($data['financials'])) {
        $data['financials'] = [];
    }
    $item = [
        'id' => 'FIN-' . str_pad((string)(count($data['financials']) + 1), 3, '0', STR_PAD_LEFT),
        'vendor' => trim((string)($body['vendor'] ?? 'Untitled Vendor')),
        'category' => trim((string)($body['category'] ?? 'SaaS / Subscription')),
        'account_email' => trim((string)($body['account_email'] ?? 'gary@gravitywizards.com')),
        'entity' => trim((string)($body['entity'] ?? 'Gravity Wizards, Inc.')),
        'billing_cycle' => trim((string)($body['billing_cycle'] ?? 'Monthly')),
        'monthly_usd' => max(0, round((float)($body['monthly_usd'] ?? 0), 2)),
        'annual_risk_usd' => max(0, round((float)($body['annual_risk_usd'] ?? 0), 2)),
        'status' => trim((string)($body['status'] ?? 'Active')),
        'contact_email' => trim((string)($body['contact_email'] ?? '')),
        'linked_contact_id' => trim((string)($body['linked_contact_id'] ?? '')),
        'reference_url' => trim((string)($body['reference_url'] ?? '')),
        'logged_date' => gmdate('Y-m-d'),
        'notes' => trim((string)($body['notes'] ?? '')),
    ];
    $data['financials'][] = $item;
    write_data($DATA_FILE, $data);
    http_response_code(201);
    echo json_encode($item);
    exit;
}

if ($action === 'financial_item' && $method === 'PATCH') {
    $id = trim((string)($_GET['id'] ?? ''));
    if ($id === '') fail(400, 'Missing financial record id');
    $body = json_body();
    $data = read_data($DATA_FILE);
    $found = null;
    foreach ($data['financials'] as &$f) {
        if (($f['id'] ?? '') === $id) {
            foreach (['vendor', 'category', 'account_email', 'entity', 'billing_cycle', 'status', 'contact_email', 'linked_contact_id', 'reference_url', 'notes'] as $strField) {
                if (array_key_exists($strField, $body)) $f[$strField] = trim((string)$body[$strField]);
            }
            foreach (['monthly_usd', 'annual_risk_usd'] as $numField) {
                if (array_key_exists($numField, $body)) $f[$numField] = max(0, round((float)$body[$numField], 2));
            }
            $found = $f;
            break;
        }
    }
    unset($f);
    if (!$found) fail(404, 'Financial record not found');
    write_data($DATA_FILE, $data);
    echo json_encode($found);
    exit;
}

fail(404, 'Unknown endpoint');
