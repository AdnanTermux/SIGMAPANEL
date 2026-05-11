-- Sigma SMS A2P — Crypto Wallets Schema
-- Replace bank_accounts with crypto_wallets for USDT TRC-20 and Binance ID payments

USE `sigma_sms_a2p`;

-- Drop old bank_accounts table if exists
DROP TABLE IF EXISTS `bank_accounts`;

-- Create crypto_wallets table
CREATE TABLE IF NOT EXISTS `crypto_wallets` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT UNSIGNED NOT NULL,
  `wallet_type` ENUM('USDT_TRC20', 'BINANCE_ID') NOT NULL COMMENT 'Type of crypto wallet',
  `wallet_address` VARCHAR(255) NOT NULL COMMENT 'Wallet address or Binance ID',
  `wallet_label` VARCHAR(100) DEFAULT NULL COMMENT 'User-friendly label',
  `is_primary` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Primary wallet for payouts',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  KEY `idx_user_id` (`user_id`),
  KEY `idx_is_primary` (`is_primary`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Update payment_requests table to support crypto
ALTER TABLE `payment_requests` 
  ADD COLUMN `payout_method` ENUM('USDT_TRC20', 'BINANCE_ID') DEFAULT NULL AFTER `amount`,
  ADD COLUMN `payout_address` VARCHAR(255) DEFAULT NULL AFTER `payout_method`,
  ADD COLUMN `transaction_hash` VARCHAR(255) DEFAULT NULL AFTER `payout_address`,
  ADD COLUMN `transaction_date` DATETIME DEFAULT NULL AFTER `transaction_hash`;

-- Add crypto payout settings
INSERT IGNORE INTO `settings` (`setting_key`, `setting_value`) VALUES
  ('crypto_payout_enabled', '1'),
  ('min_payout_amount', '10'),
  ('usdt_trc20_enabled', '1'),
  ('binance_id_enabled', '1'),
  ('payout_processing_time', '24-48 hours');

COMMIT;
