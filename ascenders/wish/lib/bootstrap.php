<?php
declare(strict_types=1);

function tw23_load_config(?string $baseDir = null): array {
    $root = $baseDir ?: dirname(__DIR__);
    $defaults = [
        'max_image_bytes' => (int)(getenv('TWISTED23_MAX_IMAGE_BYTES') ?: 575 * 1024),
        'nonconforming_max_bytes' => (int)(getenv('TWISTED23_NONCONFORMING_MAX_BYTES') ?: 385 * 1024),
        'nonconforming_quota_cost' => (int)(getenv('TWISTED23_NONCONFORMING_QUOTA_COST') ?: 2),
        'l1_daily_quota'  => (int)(getenv('TWISTED23_L1_DAILY_QUOTA') ?: 10),
        'l2_daily_quota'  => (int)(getenv('TWISTED23_L2_DAILY_QUOTA') ?: 50),
        'auth_secret'     => getenv('TWISTED23_AUTH_SECRET') ?: '',
        'admin_key'       => getenv('TWISTED23_ADMIN_KEY') ?: '',
        'resend_api_key'  => getenv('RESEND_API_KEY') ?: '',
        'from_email'      => getenv('TWISTED23_FROM_EMAIL') ?: 'Twisted23 Access <access@twisted23.com>',
        'dev_outbox'      => (getenv('TWISTED23_DEV_OUTBOX') === 'true')
            || (PHP_SAPI === 'cli-server')
            || str_starts_with($_SERVER['HTTP_HOST'] ?? '', 'localhost')
            || str_starts_with($_SERVER['HTTP_HOST'] ?? '', '127.0.0.1'),
        'allowed_hotlink_hosts' => [],
        'data_dir'        => $root . '/data',
        'nda_template'    => is_file($root . '/nda_template.md')
            ? $root . '/nda_template.md'
            : dirname($root) . '/nda_template.md',
    ];

    $cfgFile = $root . '/config.php';
    $loaded = is_file($cfgFile) ? (require $cfgFile) : [];
    $cfg = array_merge($defaults, is_array($loaded) ? $loaded : []);

    // If config.php wasn't uploaded or still uses the placeholder string,
    // mint and persist a real 256-bit secret automatically in protected data/.
    $secret = (string)($cfg['auth_secret'] ?? '');
    if ($secret === '' || str_starts_with($secret, 'CHANGE_ME')) {
        $dataDir = rtrim((string)$cfg['data_dir'], '/');
        if (!is_dir($dataDir)) @mkdir($dataDir, 0755, true);
        $secretFile = $dataDir . '/.runtime-secrets.json';
        if (is_file($secretFile)) {
            $stored = json_decode((string)@file_get_contents($secretFile), true);
            if (is_array($stored) && !empty($stored['auth_secret'])) {
                $secret = (string)$stored['auth_secret'];
            }
        }
        if ($secret === '' || str_starts_with($secret, 'CHANGE_ME')) {
            $secret = bin2hex(random_bytes(32));
            @file_put_contents(
                $secretFile,
                json_encode(['auth_secret' => $secret, 'createdAtIso' => gmdate('c')], JSON_PRETTY_PRINT),
                LOCK_EX
            );
            @chmod($secretFile, 0600);
        }
        $cfg['auth_secret'] = $secret;
    }

    return $cfg;
}
