<?php
declare(strict_types=1);

return [
    // Configurable per-image cap: 575 KB (588800) for blank/conforming a8a tags, 385 KB (394240) for non-conforming tags
    'max_image_bytes' => (int)(getenv('TWISTED23_MAX_IMAGE_BYTES') ?: 575 * 1024),
    'nonconforming_max_bytes' => (int)(getenv('TWISTED23_NONCONFORMING_MAX_BYTES') ?: 385 * 1024),
    'nonconforming_quota_cost' => (int)(getenv('TWISTED23_NONCONFORMING_QUOTA_COST') ?: 2),
    'l1_daily_quota'  => (int)(getenv('TWISTED23_L1_DAILY_QUOTA') ?: 10),
    'l2_daily_quota'  => (int)(getenv('TWISTED23_L2_DAILY_QUOTA') ?: 50),

    // Replace these in Hostinger environment or directly in config.php before go-live
    'auth_secret'     => getenv('TWISTED23_AUTH_SECRET') ?: 'CHANGE_ME_TO_A_32_CHAR_RANDOM_SECRET_KEY',
    'admin_key'       => getenv('TWISTED23_ADMIN_KEY') ?: '',

    // Optional Resend API key; if empty and dev_outbox=false, falls back to PHP mail()
    'resend_api_key'  => getenv('RESEND_API_KEY') ?: '',
    'from_email'      => getenv('TWISTED23_FROM_EMAIL') ?: 'Twisted23 Access <access@twisted23.com>',
    'dev_outbox'      => (getenv('TWISTED23_DEV_OUTBOX') === 'true')
        || (PHP_SAPI === 'cli-server')
        || str_starts_with($_SERVER['HTTP_HOST'] ?? '', 'localhost')
        || str_starts_with($_SERVER['HTTP_HOST'] ?? '', '127.0.0.1'),

    // Optional hotlink allowlist (empty = allow any referrer, e.g. Cloudflare/Markdown readers)
    // Example: ['twisted23.com', 'www.twisted23.com']
    'allowed_hotlink_hosts' => [],

    'data_dir'        => __DIR__ . '/data',
    'nda_template'    => is_file(__DIR__ . '/nda_template.md')
        ? __DIR__ . '/nda_template.md'
        : dirname(__DIR__) . '/nda_template.md',
];
