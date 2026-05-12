-- Sigma SMS A2P — Test Panel Schema
-- Tables for separate test panel system

USE `sigma_sms_a2p`;

-- ── Test Users Table ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `test_users` (
  `id`           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `username`     VARCHAR(50) NOT NULL UNIQUE,
  `password`     VARCHAR(255) NOT NULL,
  `number_limit` INT UNSIGNED NOT NULL DEFAULT 10 COMMENT 'Max numbers user can allocate',
  `status`       ENUM('active','blocked') NOT NULL DEFAULT 'active',
  `created_at`   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by`   INT UNSIGNED DEFAULT NULL COMMENT 'Admin who created this test user',
  KEY `idx_username` (`username`),
  KEY `idx_status` (`status`),
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Test User Numbers (Allocated Numbers) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS `test_user_numbers` (
  `id`            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `test_username` VARCHAR(50) NOT NULL,
  `number_id`     INT UNSIGNED NOT NULL,
  `allocated_at`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `unique_allocation` (`test_username`, `number_id`),
  KEY `idx_test_username` (`test_username`),
  KEY `idx_allocated_at` (`allocated_at`),
  FOREIGN KEY (`test_username`) REFERENCES `test_users`(`username`) ON DELETE CASCADE,
  FOREIGN KEY (`number_id`)     REFERENCES `numbers`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Add missing columns to test_users (safe for upgrade) ────────────────────
ALTER TABLE `test_users`
  ADD COLUMN IF NOT EXISTS `updated_at`  DATETIME DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS `last_login`  DATETIME DEFAULT NULL;

-- ── Insert Default Test User ──────────────────────────────────────────────────
-- Username: test123
-- Password: test123 (Python $2b$ bcrypt hash)
INSERT IGNORE INTO `test_users` (`username`, `password`, `number_limit`, `status`) VALUES
  ('test123', '$2b$12$1MZXefAekf5hNcLcka.zr.CTfUlgWCBpAUomzyRFJNfM2Of6aLko.', 10, 'active');

-- ── Add Test User Management Page Setting ─────────────────────────────────────
INSERT IGNORE INTO `settings` (`setting_key`, `setting_value`) VALUES
  ('test_panel_enabled', '1'),
  ('test_panel_default_limit', '10');

COMMIT;
