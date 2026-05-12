-- Sigma SMS A2P — Security Enhancement Schema Update
-- Add tables for rate limiting, HTTP delivery logging, and test runs

USE `sigma_sms_a2p`;

-- ── Rate Limiting Table ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `rate_limits` (
  `id`         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `identifier` VARCHAR(100) NOT NULL COMMENT 'User ID, IP, or unique identifier',
  `action`     VARCHAR(50) NOT NULL COMMENT 'Action type: login, api_call, test, etc.',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_identifier_action` (`identifier`, `action`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── HTTP Delivery Log ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `http_delivery_log` (
  `id`               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `sms_received_id`  INT UNSIGNED NOT NULL,
  `number`           VARCHAR(20) NOT NULL,
  `delivery_url`     VARCHAR(500) NOT NULL,
  `success`          TINYINT(1) NOT NULL DEFAULT 0,
  `http_code`        INT DEFAULT NULL,
  `response_message` TEXT,
  `created_at`       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_sms_received` (`sms_received_id`),
  KEY `idx_created_at` (`created_at`),
  FOREIGN KEY (`sms_received_id`) REFERENCES `sms_received`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Test Runs ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `test_runs` (
  `id`             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id`        INT UNSIGNED NOT NULL,
  `test_type`      ENUM('quick','batch') NOT NULL DEFAULT 'batch',
  `country`        VARCHAR(2) DEFAULT NULL,
  `service`        VARCHAR(50) DEFAULT NULL,
  `numbers_tested` INT UNSIGNED NOT NULL DEFAULT 0,
  `success_count`  INT UNSIGNED NOT NULL DEFAULT 0,
  `created_at`     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_user_created` (`user_id`, `created_at`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Login Attempts (for security monitoring) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS `login_attempts` (
  `id`         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `username`   VARCHAR(100) NOT NULL,
  `ip_address` VARCHAR(45) NOT NULL,
  `success`    TINYINT(1) NOT NULL DEFAULT 0,
  `user_agent` VARCHAR(255) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_username_ip` (`username`, `ip_address`, `created_at`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Security Events Log ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `security_events` (
  `id`          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `event_type`  VARCHAR(50) NOT NULL COMMENT 'Type: suspicious_login, rate_limit, sql_injection_attempt, etc.',
  `severity`    ENUM('low','medium','high','critical') NOT NULL DEFAULT 'medium',
  `user_id`     INT UNSIGNED DEFAULT NULL,
  `ip_address`  VARCHAR(45) NOT NULL,
  `description` TEXT,
  `metadata`    JSON DEFAULT NULL,
  `created_at`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_event_type` (`event_type`, `created_at`),
  KEY `idx_severity` (`severity`, `created_at`),
  KEY `idx_user_id` (`user_id`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── API Request Log (for monitoring and debugging) ────────────────────────────
CREATE TABLE IF NOT EXISTS `api_request_log` (
  `id`            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id`       INT UNSIGNED DEFAULT NULL,
  `endpoint`      VARCHAR(255) NOT NULL,
  `method`        VARCHAR(10) NOT NULL,
  `ip_address`    VARCHAR(45) NOT NULL,
  `response_code` INT DEFAULT NULL,
  `response_time` INT DEFAULT NULL COMMENT 'Response time in milliseconds',
  `created_at`    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_user_endpoint` (`user_id`, `endpoint`, `created_at`),
  KEY `idx_created_at` (`created_at`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Blocked IPs ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `blocked_ips` (
  `id`          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `ip_address`  VARCHAR(45) NOT NULL UNIQUE,
  `reason`      VARCHAR(255) DEFAULT NULL,
  `blocked_by`  INT UNSIGNED DEFAULT NULL,
  `expires_at`  DATETIME DEFAULT NULL COMMENT 'NULL = permanent block',
  `created_at`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_ip_expires` (`ip_address`, `expires_at`),
  FOREIGN KEY (`blocked_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Add indexes for better performance ────────────────────────────────────────
-- These help with security queries and monitoring

-- Clean up old rate limit records (run periodically via cron)
-- DELETE FROM rate_limits WHERE created_at < DATE_SUB(NOW(), INTERVAL 1 HOUR);

-- Clean up old login attempts (keep for 30 days)
-- DELETE FROM login_attempts WHERE created_at < DATE_SUB(NOW(), INTERVAL 30 DAY);

-- Clean up old API logs (keep for 7 days)
-- DELETE FROM api_request_log WHERE created_at < DATE_SUB(NOW(), INTERVAL 7 DAY);

-- Add new settings for HTTP delivery
INSERT IGNORE INTO `settings` (`setting_key`, `setting_value`) VALUES
  ('http_delivery_enabled', '0'),
  ('http_delivery_url', ''),
  ('http_delivery_ip', ''),
  ('http_delivery_port', '8080'),
  ('http_delivery_method', 'POST'),
  ('http_delivery_format', 'json'),
  ('http_delivery_auth', '');

-- Add security settings
INSERT IGNORE INTO `settings` (`setting_key`, `setting_value`) VALUES
  ('login_max_attempts', '5'),
  ('login_lockout_duration', '900'),
  ('api_rate_limit', '100'),
  ('enable_captcha', '1'),
  ('session_timeout', '86400');

COMMIT;
