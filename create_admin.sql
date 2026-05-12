-- Sigma SMS A2P - Create Admin User (SQL Method)
-- This creates an admin account with default credentials
-- Username: admin
-- Password: admin123
-- ⚠️ CHANGE PASSWORD IMMEDIATELY AFTER FIRST LOGIN!

USE sigma_sms_a2p;

-- Delete existing admin if exists
DELETE FROM users WHERE username = 'admin';

-- Create admin user
-- Password hash for "admin123" using bcrypt
INSERT INTO users (username, email, password, role, status, created_at)
VALUES (
    'admin',
    'admin@sigma-sms.com',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5NU7qXqKqKqKq',
    'admin',
    'active',
    NOW()
);

-- Verify admin was created
SELECT id, username, email, role, status, created_at 
FROM users 
WHERE username = 'admin';

-- Display login information
SELECT 
    '========================================' AS '',
    'Admin Account Created Successfully!' AS '',
    '========================================' AS '',
    '' AS '',
    'Login URL: http://your-domain.com/login' AS '',
    'Username: admin' AS '',
    'Password: admin123' AS '',
    '' AS '',
    '⚠️  CHANGE PASSWORD IMMEDIATELY!' AS '';
