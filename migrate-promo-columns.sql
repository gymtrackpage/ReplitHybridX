
-- Add missing promo-related columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS promo_free_months_remaining INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS promo_expires TIMESTAMP;

-- Update existing users to have default values
UPDATE users SET promo_free_months_remaining = 0 WHERE promo_free_months_remaining IS NULL;
