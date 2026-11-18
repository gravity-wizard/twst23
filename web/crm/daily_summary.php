<?php
declare(strict_types=1);

/**
 * GwCrm Daily 4:11 PM Alaska Time Summary Digest Engine
 * - Sends strictly ONE summary email per Anchorage calendar day at/after 4:11 PM America/Anchorage (AKST/AKDT)
 * - Recipient: botchee@icloud.com (1 daily email credit, Zero-BCC)
 * - Atomic LOCK_EX state guard prevents duplicate sends across concurrent cron + opportunistic ticks
 */

function gwcrm_ds_load_env(string $crmDir): void {
    $envFile = rtrim($crmDir, '/') . '/.env';
    if (!is_file($envFile)) return;
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

function gwcrm_ds_config(string $crmDir): array {
    gwcrm_ds_load_env($crmDir);
    return [
        'to' => trim((string)(getenv('DAILY_SUMMARY_TO') ?: 'botchee@icloud.com')),
        'tz' => trim((string)(getenv('DAILY_SUMMARY_TZ') ?: 'America/Anchorage')),
        'hour' => 16,
        'minute' => 11,
        'cron_token' => trim((string)(getenv('DAILY_SUMMARY_CRON_TOKEN') ?: 'tw23_gwcrm_411_summary_9b7e2f4a')),
        'from_address' => trim((string)(getenv('FROM_ADDRESS') ?: 'Gary Stout <media@twisted23.com>')),
        'reply_to' => trim((string)(getenv('REPLY_TO') ?: 'media@twisted23.com')),
        'hostinger_token' => trim((string)(getenv('HOSTINGER_MAIL_TOKEN') ?: 'a023e730fa37a0813595549dffc89c29b1ce09a294328544f0f377bd6291851a')),
        'hostinger_mailbox' => trim((string)(getenv('HOSTINGER_MAILBOX_ID') ?: 'AC4474ceb28197b9db960e1111ee79')),
        'resend_key' => trim((string)(getenv('RESEND_API_KEY') ?: '')),
        'state_file' => rtrim($crmDir, '/') . '/data/daily_summary_state.json',
        'seed_file' => rtrim($crmDir, '/') . '/data/crm.json',
        'runtime_file' => rtrim($crmDir, '/') . '/data/crm.runtime.json',
        'sent_log_file' => rtrim($crmDir, '/') . '/data/sent_log.jsonl',
    ];
}

function gwcrm_ds_read_state_unlocked(string $stateFile): array {
    if (!is_file($stateFile)) return [];
    $raw = @file_get_contents($stateFile);
    $decoded = $raw ? json_decode($raw, true) : null;
    return is_array($decoded) ? $decoded : [];
}

function gwcrm_ds_status(string $crmDir): array {
    $cfg = gwcrm_ds_config($crmDir);
    $tz = new DateTimeZone($cfg['tz']);
    $nowAk = new DateTimeImmutable('now', $tz);
    $todayAk = $nowAk->format('Y-m-d');
    $h = (int)$nowAk->format('G');
    $m = (int)$nowAk->format('i');
    $windowOpen = ($h > $cfg['hour']) || ($h === $cfg['hour'] && $m >= $cfg['minute']);

    $state = gwcrm_ds_read_state_unlocked($cfg['state_file']);
    $sentToday = (($state['last_sent_date'] ?? '') === $todayAk);

    return [
        'enabled' => true,
        'recipient' => $cfg['to'],
        'timezone' => $cfg['tz'],
        'scheduleLabel' => '4:11 PM AK',
        'todayDateAk' => $todayAk,
        'nowAk' => $nowAk->format('Y-m-d g:i A T'),
        'windowOpenToday' => $windowOpen,
        'sentToday' => $sentToday,
        'lastSentDate' => $state['last_sent_date'] ?? null,
        'lastSentAt' => $state['last_sent_at'] ?? null,
        'lastSentAk' => $state['last_sent_ak'] ?? null,
        'nextScheduledLabel' => ($sentToday || $windowOpen)
            ? ($sentToday ? 'Tomorrow · 4:11 PM AK' : 'Pending Today · 4:11 PM AK')
            : 'Today · 4:11 PM AK',
        'creditsPerDay' => 1,
    ];
}

function gwcrm_ds_load_crm_data(array $cfg): array {
    if (function_exists('read_data')) {
        return read_data($cfg['seed_file']);
    }

    $seed = is_file($cfg['seed_file']) ? (json_decode((string)@file_get_contents($cfg['seed_file']), true) ?: []) : [];
    $runtime = is_file($cfg['runtime_file']) ? (json_decode((string)@file_get_contents($cfg['runtime_file']), true) ?: []) : [];

    $rtById = [];
    foreach (($runtime['contacts'] ?? []) as $rc) {
        if (!empty($rc['id'])) $rtById[$rc['id']] = $rc;
    }

    $merged = [];
    $seen = [];
    foreach (($seed['contacts'] ?? []) as $sc) {
        $cid = (string)($sc['id'] ?? '');
        $seen[$cid] = true;
        $sc['bcc_email'] = '';
        if (isset($rtById[$cid])) {
            $rc = $rtById[$cid];
            $rc['bcc_email'] = '';
            $seedCopyRev = (int)($sc['copy_rev'] ?? 0);
            $rtCopyRev = (int)($rc['copy_rev'] ?? 0);
            if ($seedCopyRev > $rtCopyRev) {
                $rc['subject_line'] = $sc['subject_line'] ?? $rc['subject_line'];
                $rc['custom_blurb'] = $sc['custom_blurb'] ?? $rc['custom_blurb'];
                $rc['copy_rev'] = $seedCopyRev;
            }
            $seedRequeueRev = (int)($sc['requeue_rev'] ?? 0);
            $rtRequeueRev = (int)($rc['requeue_rev'] ?? 0);
            if ($seedRequeueRev > $rtRequeueRev) {
                $rc['stage'] = $sc['stage'] ?? 'Queued';
                $rc['delivery_status'] = $sc['delivery_status'] ?? 'Rate-Limited (Re-Queued)';
                $rc['sent_at'] = null;
                $rc['requeue_rev'] = $seedRequeueRev;
                $rc['requeued_at'] = $sc['requeued_at'] ?? gmdate('c');
            }
            $merged[] = array_merge($sc, $rc);
        } else {
            $merged[] = $sc;
        }
    }
    foreach (($runtime['contacts'] ?? []) as $rc) {
        $cid = (string)($rc['id'] ?? '');
        if ($cid !== '' && empty($seen[$cid])) {
            $rc['bcc_email'] = '';
            $merged[] = $rc;
        }
    }

    return [
        'contacts' => $merged,
        'derbies' => !empty($runtime['derbies']) ? $runtime['derbies'] : ($seed['derbies'] ?? []),
        'triage' => !empty($runtime['triage']) ? $runtime['triage'] : ($seed['triage'] ?? []),
    ];
}

function gwcrm_ds_build_digest(string $crmDir): array {
    $cfg = gwcrm_ds_config($crmDir);
    $tz = new DateTimeZone($cfg['tz']);
    $nowAk = new DateTimeImmutable('now', $tz);
    $todayAk = $nowAk->format('Y-m-d');
    $niceDateAk = $nowAk->format('D, M j, Y');
    $niceClockAk = $nowAk->format('g:i A T');

    $data = gwcrm_ds_load_crm_data($cfg);
    $contacts = $data['contacts'] ?? [];
    $triage = $data['triage'] ?? [];
    $derbies = $data['derbies'] ?? [];

    // Parse sent_log.jsonl for today's dispatches (in America/Anchorage) & rolling 24h Hostinger credits
    $sentTodayRows = [];
    $seenSentKeys = [];
    $cutoff24h = time() - 86400;
    $credits24h = 0;
    $pitches24h = 0;

    if (is_file($cfg['sent_log_file'])) {
        foreach (file($cfg['sent_log_file'], FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [] as $line) {
            $row = json_decode($line, true);
            if (!is_array($row) || empty($row['sent_at'])) continue;
            $ts = strtotime((string)$row['sent_at']);
            if ($ts === false) continue;

            $isSummary = (($row['kind'] ?? '') === 'daily_summary' || (int)($row['step'] ?? 1) === 0);
            $rowCredits = isset($row['recipient_credits']) ? max(1, (int)$row['recipient_credits']) : 5;
            if ($ts >= $cutoff24h) {
                $credits24h += $rowCredits;
                if (!$isSummary) $pitches24h++;
            }

            if (!$isSummary) {
                $dtAk = (new DateTimeImmutable('@' . $ts))->setTimezone($tz);
                if ($dtAk->format('Y-m-d') === $todayAk) {
                    $key = ($row['id'] ?? '') . ':' . ($row['step'] ?? 1) . ':' . $row['sent_at'];
                    $seenSentKeys[$key] = true;
                    $sentTodayRows[] = [
                        'ts' => $ts,
                        'time_ak' => $dtAk->format('g:i A T'),
                        'id' => (string)($row['id'] ?? ''),
                        'outlet' => (string)($row['outlet'] ?? 'Unknown Outlet'),
                        'to' => (string)($row['to'] ?? ''),
                        'step' => (int)($row['step'] ?? 1),
                        'credits' => $rowCredits,
                    ];
                }
            }
        }
    }

    // Also include any contacts marked sent today in runtime JSON that weren't in sent_log.jsonl
    foreach ($contacts as $c) {
        foreach ([1 => 'sent_at', 2 => 'step_2_sent_at'] as $stepNum => $field) {
            if (empty($c[$field])) continue;
            $ts = strtotime((string)$c[$field]);
            if ($ts === false) continue;
            $dtAk = (new DateTimeImmutable('@' . $ts))->setTimezone($tz);
            if ($dtAk->format('Y-m-d') === $todayAk) {
                $alreadyListed = false;
                foreach ($sentTodayRows as $sr) {
                    if ($sr['id'] === ($c['id'] ?? '') && $sr['step'] === $stepNum) {
                        $alreadyListed = true;
                        break;
                    }
                }
                if (!$alreadyListed) {
                    $sentTodayRows[] = [
                        'ts' => $ts,
                        'time_ak' => $dtAk->format('g:i A T'),
                        'id' => (string)($c['id'] ?? ''),
                        'outlet' => (string)($c['outlet'] ?? ''),
                        'to' => (string)($c['primary_email'] ?? ''),
                        'step' => $stepNum,
                        'credits' => 1,
                    ];
                }
            }
        }
    }
    usort($sentTodayRows, static fn(array $a, array $b): int => $a['ts'] <=> $b['ts']);

    // Stage counts & lists
    $counts = [
        'total' => count($contacts),
        'queued' => 0,
        'sent1' => 0,
        'sent2' => 0,
        'form_fill' => 0,
        'auto_ack' => 0,
        'human_reply' => 0,
        'bounced' => 0,
    ];
    $queuedList = [];
    $humanReplyList = [];
    $autoAckList = [];
    $attentionList = [];

    foreach ($contacts as $c) {
        $stage = (string)($c['stage'] ?? 'Queued');
        $dstat = (string)($c['delivery_status'] ?? '');
        if ($stage === 'Queued') {
            $counts['queued']++;
            $queuedList[] = $c;
        } elseif ($stage === 'Sent Step 1') {
            $counts['sent1']++;
        } elseif ($stage === 'Sent Step 2') {
            $counts['sent2']++;
        } elseif ($stage === 'Sent (Form Fill)') {
            $counts['form_fill']++;
        } elseif ($stage === 'Auto-Acknowledged') {
            $counts['auto_ack']++;
            $autoAckList[] = $c;
        } elseif (in_array($stage, ['Received Reply', 'Featured'], true)) {
            $counts['human_reply']++;
            $humanReplyList[] = $c;
        } elseif ($stage === 'Bounced') {
            $counts['bounced']++;
            $attentionList[] = $c;
        }

        if ($stage !== 'Bounced' && (stripos($dstat, 'Rate-Limited') !== false || stripos($dstat, 'Bounce') !== false)) {
            $attentionList[] = $c;
        }
    }

    // Optional local Universe Visitor 24h snapshot (reads local JSON file only, 0 network calls)
    $visitorLine = '';
    $visitorEventsFile = dirname(rtrim($crmDir, '/')) . '/visitors/data/events.json';
    if (is_file($visitorEventsFile)) {
        $vEvents = json_decode((string)@file_get_contents($visitorEventsFile), true);
        if (is_array($vEvents)) {
            $uAll = [];
            $uBySite = ['twisted23' => [], 'slogbog' => [], 'gravity-wizards' => []];
            foreach ($vEvents as $ev) {
                if (!is_array($ev) || ((int)($ev['ts'] ?? 0)) < $cutoff24h) continue;
                $vid = (string)($ev['vid'] ?? '');
                $site = (string)($ev['site'] ?? 'twisted23');
                if ($vid !== '') {
                    $uAll[$vid] = true;
                    if (isset($uBySite[$site])) $uBySite[$site][$vid] = true;
                }
            }
            $visitorLine = sprintf(
                "Universe 24h Visitors: %d unique (%d Twisted23 · %d sLogbog · %d gravity-wizards)",
                count($uAll),
                count($uBySite['twisted23']),
                count($uBySite['slogbog']),
                count($uBySite['gravity-wizards'])
            );
        }
    }

    $sentTodayCount = count($sentTodayRows);
    $remainingEst = max(0, 100 - ($credits24h + 1)); // +1 includes this daily summary email

    $subject = sprintf(
        'GwCrm 4:11 PM Summary (%s) — %d Sent Today · %d Queued · %d Human %s',
        $nowAk->format('M j'),
        $sentTodayCount,
        $counts['queued'],
        $counts['human_reply'],
        $counts['human_reply'] === 1 ? 'Reply' : 'Replies'
    );

    $lines = [];
    $lines[] = "GWCRM DAILY OUTREACH SUMMARY — 4:11 PM ALASKA TIME";
    $lines[] = "============================================================";
    $lines[] = "Generated : {$niceDateAk} at {$niceClockAk}";
    $lines[] = "Inbox     : {$cfg['to']} (1 daily email credit · Zero-BCC Active)";
    $lines[] = sprintf(
        "24h Quota : ~%d / 100 Hostinger recipient credits used (~%d remaining)",
        $credits24h + 1,
        $remainingEst
    );
    if ($visitorLine !== '') {
        $lines[] = $visitorLine;
    }
    $lines[] = "";

    // 1. Today's Dispatches
    $lines[] = "1. OUTREACH SENT TODAY ({$sentTodayCount})";
    $lines[] = "------------------------------------------------------------";
    if ($sentTodayCount === 0) {
        $lines[] = "• No outreach pitches dispatched since midnight Alaska Time.";
    } else {
        foreach ($sentTodayRows as $sr) {
            $lines[] = sprintf(
                "• [%s] Step %d -> %s <%s> (%d credit%s)",
                $sr['time_ak'],
                $sr['step'],
                $sr['outlet'],
                $sr['to'],
                $sr['credits'],
                $sr['credits'] === 1 ? '' : 's'
            );
        }
    }
    $lines[] = "";

    // 2. Pipeline Snapshot
    $lines[] = "2. PIPELINE SNAPSHOT ({$counts['total']} Total Outlets)";
    $lines[] = "------------------------------------------------------------";
    $lines[] = sprintf("• Queued (Ready to Send) : %d", $counts['queued']);
    $lines[] = sprintf("• Sent Step 1            : %d", $counts['sent1']);
    $lines[] = sprintf("• Sent Step 2            : %d", $counts['sent2']);
    if ($counts['form_fill'] > 0) {
        $lines[] = sprintf("• Sent (Web Form Fill)   : %d", $counts['form_fill']);
    }
    $lines[] = sprintf("• Auto-Acknowledged      : %d", $counts['auto_ack']);
    $lines[] = sprintf("• Human Replies          : %d", $counts['human_reply']);
    $lines[] = sprintf("• Bounced                : %d", $counts['bounced']);
    $lines[] = "";

    // 3. Replies & Attention Items
    $lines[] = "3. REPLIES & DELIVERY ALERTS";
    $lines[] = "------------------------------------------------------------";
    if (count($humanReplyList) === 0 && count($autoAckList) === 0 && count($attentionList) === 0) {
        $lines[] = "• No new replies, bounces, or rate-limit alerts.";
    } else {
        foreach ($humanReplyList as $c) {
            $lines[] = sprintf("• [HUMAN REPLY] %s <%s>", $c['outlet'] ?? '', $c['primary_email'] ?? '');
        }
        foreach ($autoAckList as $c) {
            $lines[] = sprintf("• [AUTO-ACK]    %s <%s>", $c['outlet'] ?? '', $c['primary_email'] ?? '');
        }
        foreach ($attentionList as $c) {
            $lines[] = sprintf(
                "• [ALERT]       %s <%s> — %s (%s)",
                $c['outlet'] ?? '',
                $c['primary_email'] ?? '',
                $c['stage'] ?? '',
                $c['delivery_status'] ?? ''
            );
        }
    }
    $lines[] = "";

    // 4. Up Next in Queue
    $nextSlice = array_slice($queuedList, 0, 6);
    $lines[] = sprintf("4. UP NEXT IN QUEUE (%d Ready · Showing Next %d)", $counts['queued'], count($nextSlice));
    $lines[] = "------------------------------------------------------------";
    if (count($nextSlice) === 0) {
        $lines[] = "• Queue is currently clear.";
    } else {
        foreach ($nextSlice as $idx => $c) {
            $cc = trim((string)($c['cc_email'] ?? ''));
            $ccCount = $cc !== '' ? count(array_filter(array_map('trim', explode(',', $cc)))) : 0;
            $cred = 1 + $ccCount;
            $lines[] = sprintf(
                "%d. [%s] %s <%s> (%d credit%s)",
                $idx + 1,
                $c['id'] ?? '',
                $c['outlet'] ?? '',
                $c['primary_email'] ?: 'Web Form',
                $cred,
                $cred === 1 ? '' : 's'
            );
        }
        if ($counts['queued'] > count($nextSlice)) {
            $lines[] = sprintf("   ...plus %d more queued outlets ready in GwCrm.", $counts['queued'] - count($nextSlice));
        }
    }

    // Open Triage / Derby summary if any open items exist
    $openTriage = array_values(array_filter($triage, static fn($t): bool => ($t['status'] ?? 'Open') !== 'Resolved'));
    $openDerbies = array_values(array_filter($derbies, static fn($d): bool => ($d['status'] ?? '') !== 'Completed'));
    if (count($openTriage) > 0 || count($openDerbies) > 0) {
        $lines[] = "";
        $lines[] = sprintf(
            "5. OPS NOTES: %d open puzzle triage item(s) · %d active GPADA Derby task(s)",
            count($openTriage),
            count($openDerbies)
        );
    }

    $lines[] = "";
    $lines[] = "------------------------------------------------------------";
    $lines[] = "GwCrm Outreach Hub : https://www.twisted23.com/crm/";
    $lines[] = "User ControL PaneL : https://www.twisted23.com/ucp/";
    $lines[] = "Visitors Live Globe: https://www.twisted23.com/visitors/";
    $lines[] = "— Automated 4:11 PM AK Daily Digest (media@twisted23.com)";

    return [
        'to' => $cfg['to'],
        'subject' => $subject,
        'text' => implode("\n", $lines),
        'today_date_ak' => $todayAk,
        'now_ak' => $nowAk->format('Y-m-d g:i:s A T'),
        'sent_today_count' => $sentTodayCount,
        'queued_count' => $counts['queued'],
    ];
}

function gwcrm_ds_dispatch_single_email(array $cfg, string $to, string $subject, string $text): array {
    // 1. Primary: Hostinger Agentic Mail REST API (DKIM signed, Zero BCC, 1 credit)
    if ($cfg['hostinger_token'] !== '' && $cfg['hostinger_mailbox'] !== '' && function_exists('curl_init')) {
        $payload = [
            'to' => [$to],
            'displayName' => 'GwCrm Daily Summary',
            'subject' => $subject,
            'text' => $text,
        ];
        $ch = curl_init("https://api.mail.hostinger.com/api/v1/mailboxes/{$cfg['hostinger_mailbox']}/send");
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_USERAGENT => 'Twisted23-GwCrm-DailySummary/1.0',
            CURLOPT_HTTPHEADER => [
                'Authorization: Bearer ' . $cfg['hostinger_token'],
                'Content-Type: application/json',
            ],
            CURLOPT_POSTFIELDS => json_encode($payload),
            CURLOPT_TIMEOUT => 15,
        ]);
        $respRaw = curl_exec($ch);
        $httpCode = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlErr = curl_error($ch);
        curl_close($ch);

        if ($httpCode >= 200 && $httpCode < 300) {
            return ['ok' => true, 'channel' => 'hostinger_mail_api', 'http_code' => $httpCode];
        }
        $respJson = is_string($respRaw) ? (json_decode($respRaw, true) ?: []) : [];
        $errMsg = trim((string)($respJson['message'] ?? $respJson['error'] ?? ($curlErr ?: "Hostinger HTTP {$httpCode}")));
        return ['ok' => false, 'channel' => 'hostinger_mail_api', 'http_code' => $httpCode, 'error' => $errMsg];
    }

    // 2. Fallback: Resend API if configured
    if ($cfg['resend_key'] !== '' && !str_contains($cfg['resend_key'], 'your_actual_key') && function_exists('curl_init')) {
        $payload = [
            'from' => $cfg['from_address'],
            'to' => [$to],
            'reply_to' => $cfg['reply_to'],
            'subject' => $subject,
            'text' => $text,
        ];
        $ch = curl_init('https://api.resend.com/emails');
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_HTTPHEADER => [
                'Authorization: Bearer ' . $cfg['resend_key'],
                'Content-Type: application/json',
            ],
            CURLOPT_POSTFIELDS => json_encode($payload),
            CURLOPT_TIMEOUT => 15,
        ]);
        $respRaw = curl_exec($ch);
        $httpCode = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlErr = curl_error($ch);
        curl_close($ch);
        if ($respRaw !== false && $httpCode >= 200 && $httpCode < 300) {
            return ['ok' => true, 'channel' => 'resend', 'http_code' => $httpCode];
        }
        return ['ok' => false, 'channel' => 'resend', 'http_code' => $httpCode, 'error' => $curlErr ?: "Resend HTTP {$httpCode}"];
    }

    // 3. Fallback: PHP mail()
    $headers = "From: {$cfg['from_address']}\r\nReply-To: {$cfg['reply_to']}\r\nContent-Type: text/plain; charset=UTF-8\r\n";
    $sent = @mail($to, $subject, $text, $headers);
    return ['ok' => (bool)$sent, 'channel' => 'php_mail', 'http_code' => $sent ? 200 : 500, 'error' => $sent ? '' : 'mail() returned false'];
}

function gwcrm_ds_maybe_send(string $crmDir, bool $dryRun = false, bool $ignoreClockWindow = false): array {
    $cfg = gwcrm_ds_config($crmDir);
    $tz = new DateTimeZone($cfg['tz']);
    $nowAk = new DateTimeImmutable('now', $tz);
    $todayAk = $nowAk->format('Y-m-d');
    $h = (int)$nowAk->format('G');
    $m = (int)$nowAk->format('i');
    $windowOpen = ($h > $cfg['hour']) || ($h === $cfg['hour'] && $m >= $cfg['minute']);

    if ($dryRun) {
        $digest = gwcrm_ds_build_digest($crmDir);
        $statusInfo = gwcrm_ds_status($crmDir);
        return [
            'ok' => true,
            'status' => 'dry_run',
            'schedule' => $statusInfo,
            'to' => $digest['to'],
            'subject' => $digest['subject'],
            'text' => $digest['text'],
        ];
    }

    if (!$ignoreClockWindow && !$windowOpen) {
        return [
            'ok' => true,
            'status' => 'before_window',
            'scheduled_for' => '16:11 ' . $cfg['tz'],
            'now_ak' => $nowAk->format('Y-m-d g:i:s A T'),
            'today_date_ak' => $todayAk,
        ];
    }

    $dataDir = dirname($cfg['state_file']);
    if (!is_dir($dataDir)) {
        @mkdir($dataDir, 0775, true);
    }

    $fp = @fopen($cfg['state_file'], 'c+');
    if (!$fp) {
        return ['ok' => false, 'status' => 'lock_open_error', 'error' => 'Could not open daily_summary_state.json'];
    }

    if (!@flock($fp, LOCK_EX)) {
        @fclose($fp);
        return ['ok' => false, 'status' => 'lock_acquire_error', 'error' => 'Could not acquire exclusive lock'];
    }

    @rewind($fp);
    $rawState = stream_get_contents($fp);
    $state = ($rawState !== false && $rawState !== '') ? (json_decode($rawState, true) ?: []) : [];

    // Strictly ONE summary email per Anchorage calendar day
    if (($state['last_sent_date'] ?? '') === $todayAk) {
        @flock($fp, LOCK_UN);
        @fclose($fp);
        return [
            'ok' => true,
            'status' => 'already_sent_today',
            'today_date_ak' => $todayAk,
            'last_sent_at' => $state['last_sent_at'] ?? null,
            'last_sent_ak' => $state['last_sent_ak'] ?? null,
            'recipient' => $state['recipient'] ?? $cfg['to'],
        ];
    }

    // Cooldown guard (10 min) if a previous automatic attempt hit a transient error or rate limit
    $lastAttemptTs = (int)($state['last_attempt_ts'] ?? 0);
    if (!$ignoreClockWindow && $lastAttemptTs > (time() - 600)) {
        @flock($fp, LOCK_UN);
        @fclose($fp);
        return [
            'ok' => true,
            'status' => 'retry_cooldown',
            'last_attempt_ts' => $lastAttemptTs,
            'last_error' => $state['last_error'] ?? null,
        ];
    }

    $state['last_attempt_ts'] = time();
    @ftruncate($fp, 0);
    @rewind($fp);
    @fwrite($fp, json_encode($state, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . "\n");
    @fflush($fp);

    $digest = gwcrm_ds_build_digest($crmDir);
    $sendRes = gwcrm_ds_dispatch_single_email($cfg, $digest['to'], $digest['subject'], $digest['text']);

    if (!empty($sendRes['ok'])) {
        $nowIso = gmdate('c');
        $state['last_sent_date'] = $todayAk;
        $state['last_sent_at'] = $nowIso;
        $state['last_sent_ak'] = $nowAk->format('Y-m-d g:i:s A T');
        $state['recipient'] = $digest['to'];
        $state['last_subject'] = $digest['subject'];
        $state['last_channel'] = $sendRes['channel'] ?? 'hostinger_mail_api';
        unset($state['last_error']);

        @ftruncate($fp, 0);
        @rewind($fp);
        @fwrite($fp, json_encode($state, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . "\n");
        @fflush($fp);
        @flock($fp, LOCK_UN);
        @fclose($fp);

        // Log 1 recipient credit in sent_log.jsonl (step: 0 & kind: daily_summary so contact ledger ignores it)
        $ledgerRow = [
            'id' => 'DAILY-SUMMARY-' . $todayAk,
            'outlet' => 'GwCrm 4:11 PM Daily Summary',
            'to' => $digest['to'],
            'step' => 0,
            'kind' => 'daily_summary',
            'sent_at' => $nowIso,
            'recipient_credits' => 1,
            'delivery_status' => 'Sent (' . ($sendRes['channel'] ?? 'Hostinger Mail API') . ')',
        ];
        @file_put_contents($cfg['sent_log_file'], json_encode($ledgerRow, JSON_UNESCAPED_SLASHES) . "\n", FILE_APPEND | LOCK_EX);

        return [
            'ok' => true,
            'status' => 'sent',
            'to' => $digest['to'],
            'subject' => $digest['subject'],
            'today_date_ak' => $todayAk,
            'sent_at_ak' => $state['last_sent_ak'],
            'credits_used' => 1,
            'channel' => $sendRes['channel'] ?? 'hostinger_mail_api',
        ];
    }

    $state['last_error'] = $sendRes['error'] ?? 'Unknown dispatch error';
    @ftruncate($fp, 0);
    @rewind($fp);
    @fwrite($fp, json_encode($state, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . "\n");
    @fflush($fp);
    @flock($fp, LOCK_UN);
    @fclose($fp);

    return [
        'ok' => false,
        'status' => 'error',
        'http_code' => $sendRes['http_code'] ?? 500,
        'error' => $state['last_error'],
    ];
}

/**
 * Ultra-fast opportunistic check (<0.05ms in steady state) safe to call at the end of web requests.
 * Zero disk I/O before 4:11 PM America/Anchorage; single tiny JSON read after 4:11 PM once sent.
 */
function gwcrm_ds_fast_tick(string $crmDir): void {
    try {
        $tz = new DateTimeZone('America/Anchorage');
        $nowAk = new DateTimeImmutable('now', $tz);
        $h = (int)$nowAk->format('G');
        $m = (int)$nowAk->format('i');
        if ($h < 16 || ($h === 16 && $m < 11)) {
            return;
        }
        $todayAk = $nowAk->format('Y-m-d');
        $stateFile = rtrim($crmDir, '/') . '/data/daily_summary_state.json';
        if (is_file($stateFile)) {
            $state = json_decode((string)@file_get_contents($stateFile), true);
            if (is_array($state)) {
                if (($state['last_sent_date'] ?? '') === $todayAk) return;
                if (((int)($state['last_attempt_ts'] ?? 0)) > (time() - 600)) return;
            }
        }
        gwcrm_ds_maybe_send($crmDir, false, false);
    } catch (Throwable $e) {
        // Never disrupt caller request on opportunistic background tick
    }
}
