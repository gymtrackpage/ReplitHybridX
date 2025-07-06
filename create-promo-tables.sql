
-- Create promo codes table
CREATE TABLE IF NOT EXISTS promo_codes (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  free_months INTEGER NOT NULL DEFAULT 0,
  max_uses INTEGER,
  uses_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMP,
  created_by VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create promo code uses table
CREATE TABLE IF NOT EXISTS promo_code_uses (
  id SERIAL PRIMARY KEY,
  promo_code_id INTEGER REFERENCES promo_codes(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL,
  free_months_granted INTEGER NOT NULL,
  used_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON promo_codes(code);
CREATE INDEX IF NOT EXISTS idx_promo_code_uses_user_id ON promo_code_uses(user_id);
CREATE INDEX IF NOT EXISTS idx_promo_code_uses_promo_code_id ON promo_code_uses(promo_code_id);

-- Add promo columns to users table if they don't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS promo_free_months_remaining INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS promo_expires TIMESTAMP;
