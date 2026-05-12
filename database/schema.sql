-- Sigma SMS A2P OTP Panel — Database Schema
-- Engine: InnoDB, Charset: utf8mb4
-- Tables created in dependency order to satisfy foreign key constraints.

CREATE DATABASE IF NOT EXISTS `sigma_sms_a2p`
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `sigma_sms_a2p`;

-- ── 1. Users ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `users` (
  `id`         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `username`   VARCHAR(30)  NOT NULL UNIQUE,
  `email`      VARCHAR(100) DEFAULT NULL,
  `password`   VARCHAR(255) NOT NULL,
  `role`       ENUM('super_admin','admin','manager','reseller','sub_reseller','user') NOT NULL DEFAULT 'reseller',
  `status`     ENUM('active','pending','blocked') NOT NULL DEFAULT 'active',
  `parent_id`  INT UNSIGNED DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`parent_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE INDEX `idx_users_parent_status` ON `users` (`parent_id`, `status`);
CREATE INDEX `idx_users_role_status` ON `users` (`role`, `status`);

-- ── 2. API Tokens ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `api_tokens` (
  `id`           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id`      INT UNSIGNED NOT NULL,
  `token`        VARCHAR(64)  NOT NULL UNIQUE,
  `created_at`   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `last_used_at` DATETIME DEFAULT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 3. Numbers ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `numbers` (
  `id`          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `number`      VARCHAR(20) NOT NULL UNIQUE,
  `country`     VARCHAR(2)  DEFAULT NULL,
  `service`     VARCHAR(50) DEFAULT NULL,
  `rate`        DECIMAL(10,6) NOT NULL DEFAULT 0.000000,
  `status`      ENUM('active','inactive') NOT NULL DEFAULT 'active',
  `created_by`  INT UNSIGNED DEFAULT NULL,
  `assigned_to` INT UNSIGNED DEFAULT NULL,
  `assigned_at` DATETIME DEFAULT NULL,
  `created_at`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`created_by`)  REFERENCES `users`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`assigned_to`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE INDEX `idx_numbers_assigned_status` ON `numbers` (`assigned_to`, `status`);
CREATE INDEX `idx_numbers_service_country` ON `numbers` (`service`, `country`);

-- ── 4. SMS Received (real data from external API) ─────────────────────────────
CREATE TABLE IF NOT EXISTS `sms_received` (
  `id`          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `number`      VARCHAR(20) NOT NULL,
  `service`     VARCHAR(50) DEFAULT NULL,
  `country`     VARCHAR(2)  DEFAULT NULL,
  `otp`         VARCHAR(30) NOT NULL,
  `message`     TEXT,
  `received_at` DATETIME NOT NULL,
  `created_at`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `unique_otp` (`number`, `otp`, `received_at`),
  KEY `idx_received_at` (`received_at`),
  KEY `idx_number`      (`number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 5. Profit Log ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `profit_log` (
  `id`              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id`         INT UNSIGNED NOT NULL,
  `number_id`       INT UNSIGNED NOT NULL,
  `sms_received_id` INT UNSIGNED NOT NULL,
  `rate_applied`    DECIMAL(10,6) NOT NULL,
  `profit_amount`   DECIMAL(10,6) NOT NULL,
  `currency`        VARCHAR(3) NOT NULL DEFAULT 'USD',
  `created_at`      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `unique_sms_received` (`sms_received_id`),
  KEY `idx_user_id`    (`user_id`),
  KEY `idx_number_id`  (`number_id`),
  KEY `idx_created_at` (`created_at`),
  FOREIGN KEY (`user_id`)         REFERENCES `users`(`id`)        ON DELETE CASCADE,
  FOREIGN KEY (`number_id`)       REFERENCES `numbers`(`id`)      ON DELETE CASCADE,
  FOREIGN KEY (`sms_received_id`) REFERENCES `sms_received`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE INDEX `idx_profit_user_created` ON `profit_log` (`user_id`, `created_at`);

-- ── 6. Notifications ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `notifications` (
  `id`         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id`    INT UNSIGNED NOT NULL,
  `message`    TEXT NOT NULL,
  `is_read`    TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_user_id` (`user_id`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE INDEX `idx_notifications_user_read` ON `notifications` (`user_id`, `is_read`);

-- ── 7. News / Announcements ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `news_master` (
  `id`         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `title`      VARCHAR(255) NOT NULL,
  `content`    TEXT NOT NULL,
  `created_by` INT UNSIGNED NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 8. Credit Notes ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `credit_notes` (
  `id`          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id`     INT UNSIGNED NOT NULL,
  `amount`      DECIMAL(10,2) NOT NULL,
  `currency`    VARCHAR(3) NOT NULL DEFAULT 'USD',
  `description` TEXT,
  `created_at`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 9. Payment Requests ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `payment_requests` (
  `id`         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id`    INT UNSIGNED NOT NULL,
  `amount`     DECIMAL(10,2) NOT NULL,
  `currency`   VARCHAR(3) NOT NULL DEFAULT 'USD',
  `status`     ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 10. Bank Accounts ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `bank_accounts` (
  `id`             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id`        INT UNSIGNED NOT NULL,
  `bank_name`      VARCHAR(100) DEFAULT NULL,
  `account_number` VARCHAR(50)  DEFAULT NULL,
  `routing_number` VARCHAR(50)  DEFAULT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 11. Statements ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `statements` (
  `id`             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id`        INT UNSIGNED NOT NULL,
  `period_start`   DATE DEFAULT NULL,
  `period_end`     DATE DEFAULT NULL,
  `total_earnings` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `currency`       VARCHAR(3) NOT NULL DEFAULT 'USD',
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 12. Settings (key-value store) ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `settings` (
  `setting_key`   VARCHAR(50) PRIMARY KEY,
  `setting_value` TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ── Security Logs (needed by SecurityLog model for login audit) ───────────────
CREATE TABLE IF NOT EXISTS `security_logs` (
  `id`          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `event_type`  VARCHAR(50) NOT NULL,
  `severity`    VARCHAR(20) NOT NULL DEFAULT 'info',
  `username`    VARCHAR(50) DEFAULT NULL,
  `user_id`     INT UNSIGNED DEFAULT NULL,
  `ip_address`  VARCHAR(45) DEFAULT NULL,
  `user_agent`  VARCHAR(255) DEFAULT NULL,
  `message`     TEXT NOT NULL,
  `details`     TEXT DEFAULT NULL,
  `created_at`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_event_type` (`event_type`),
  KEY `idx_username`   (`username`),
  KEY `idx_ip_address` (`ip_address`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Ensure users table has all required columns (safe for fresh + upgrade) ────
ALTER TABLE `users`
  ADD COLUMN IF NOT EXISTS `full_name`             VARCHAR(100) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `balance`               DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS `credit_limit`          DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS `api_token`             VARCHAR(64) UNIQUE DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `phone`                 VARCHAR(20) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `timezone`              VARCHAR(50) NOT NULL DEFAULT 'UTC',
  ADD COLUMN IF NOT EXISTS `language`              VARCHAR(5) NOT NULL DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS `updated_at`            DATETIME DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS `last_login`            DATETIME DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `failed_login_attempts` INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `locked_until`          DATETIME DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `notes`                 TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `tags`                  VARCHAR(255) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `commission_rate`       DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS `profit_share`          DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS `api_quota`             INT NOT NULL DEFAULT 1000,
  ADD COLUMN IF NOT EXISTS `impersonated_by`       INT UNSIGNED DEFAULT NULL;

-- ── Default settings ──────────────────────────────────────────────────────────
INSERT IGNORE INTO `settings` (`setting_key`, `setting_value`) VALUES
  ('last_fetch',  '2000-01-01 00:00:00'),
  ('site_name',   'Sigma SMS A2P'),
  ('site_logo',   ''),
  ('otp_api_url', 'https://tempnum.net/api/public/otps');

-- ── Default admin user ────────────────────────────────────────────────────────
-- Default password: "admin123" (bcrypt b$ hash, Python compatible)
-- CHANGE IMMEDIATELY after installation!
INSERT IGNORE INTO `users` (`username`, `email`, `password`, `role`, `status`) VALUES
  ('admin', 'admin@sigma-sms.com', '$2b$12$a6PLoHNC2AYPD4aC.YRjs.Ow9jnYQXETA1R9tNmBa6niBMaGx7CKO', 'admin', 'active');

-- ── 14. SMPP Connections ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `smpp_connections` (
  `id`                 INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `name`               VARCHAR(100) NOT NULL,
  `host`               VARCHAR(255) NOT NULL,
  `port`               INT NOT NULL DEFAULT 2775,
  `system_id`          VARCHAR(50) NOT NULL,
  `password`           VARCHAR(255) NOT NULL,
  `system_type`        VARCHAR(20) DEFAULT 'SMPP',
  `interface_version`  VARCHAR(10) DEFAULT '3.4',
  `status`             ENUM('active','inactive') NOT NULL DEFAULT 'active',
  `created_at`         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`         DATETIME DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  `last_activity_at`   DATETIME DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 15. Transaction Ledger (Double-entry) ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS `transaction_ledger` (
  `id`              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id`         INT UNSIGNED NOT NULL,
  `transaction_type` ENUM('credit','debit','commission','payout','refund','transfer','adjustment') NOT NULL,
  `amount`          DECIMAL(12,4) NOT NULL,
  `balance_before`  DECIMAL(12,4) NOT NULL,
  `balance_after`   DECIMAL(12,4) NOT NULL,
  `currency`        VARCHAR(3) NOT NULL DEFAULT 'USD',
  `reference_type`  VARCHAR(50) DEFAULT NULL,
  `reference_id`    INT UNSIGNED DEFAULT NULL,
  `description`     TEXT,
  `created_by`      INT UNSIGNED DEFAULT NULL,
  `created_at`      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_user_id`  (`user_id`),
  KEY `idx_type_date` (`transaction_type`, `created_at`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 16. Audit Logs ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id`             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id`        INT UNSIGNED DEFAULT NULL,
  `action`         VARCHAR(100) NOT NULL,
  `resource_type`  VARCHAR(50) DEFAULT NULL,
  `resource_id`    INT UNSIGNED DEFAULT NULL,
  `old_values`     JSON DEFAULT NULL,
  `new_values`     JSON DEFAULT NULL,
  `ip_address`     VARCHAR(45) DEFAULT NULL,
  `user_agent`     VARCHAR(255) DEFAULT NULL,
  `created_at`     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_user_id`    (`user_id`),
  KEY `idx_action`     (`action`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
