-- Telegram Raffle Stars Database Schema
-- PostgreSQL implementation

-- Users table for Telegram user management
CREATE TABLE IF NOT EXISTS users (
    telegram_id BIGINT PRIMARY KEY,
    username VARCHAR(255),
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255),
    language_code VARCHAR(10) DEFAULT 'en',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

-- Raffle settings table for configurable game parameters
CREATE TABLE IF NOT EXISTS raffle_settings (
    id SERIAL PRIMARY KEY,
    participants_limit INTEGER NOT NULL DEFAULT 10,
    bet_amount INTEGER NOT NULL DEFAULT 1, -- in Telegram Stars
    winner_percentage INTEGER NOT NULL DEFAULT 70, -- winner gets 70%
    organizer_percentage INTEGER NOT NULL DEFAULT 30, -- organizer gets 30%
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Raffles table for individual raffle instances
CREATE TABLE IF NOT EXISTS raffles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    required_participants INTEGER NOT NULL,
    bet_amount INTEGER NOT NULL, -- in Telegram Stars
    current_participants INTEGER DEFAULT 0,
    total_pot INTEGER DEFAULT 0, -- total amount collected
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    winner_id BIGINT REFERENCES users(telegram_id),
    winner_amount INTEGER,
    organizer_amount INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    random_seed VARCHAR(255), -- for provably fair winner selection
    INDEX idx_raffles_status (status),
    INDEX idx_raffles_created_at (created_at)
);

-- Bids table for tracking individual participant entries
CREATE TABLE IF NOT EXISTS bids (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    raffle_id UUID REFERENCES raffles(id) ON DELETE CASCADE,
    user_telegram_id BIGINT REFERENCES users(telegram_id),
    amount INTEGER NOT NULL, -- should always be 1 star for this game
    placed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    transaction_id VARCHAR(255), -- Telegram Stars transaction ID
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed', 'refunded')),
    UNIQUE(raffle_id, user_telegram_id), -- one bid per user per raffle
    INDEX idx_bids_raffle_id (raffle_id),
    INDEX idx_bids_user_id (user_telegram_id),
    INDEX idx_bids_status (status)
);

-- Star transactions table for financial tracking
CREATE TABLE IF NOT EXISTS star_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_telegram_id BIGINT REFERENCES users(telegram_id),
    amount INTEGER NOT NULL, -- positive for incoming, negative for outgoing
    type VARCHAR(20) NOT NULL CHECK (type IN ('bet', 'win', 'refund', 'fee')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed')),
    telegram_payment_id VARCHAR(255), -- Telegram's payment ID
    raffle_id UUID REFERENCES raffles(id),
    bid_id UUID REFERENCES bids(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    confirmed_at TIMESTAMP,
    metadata JSONB, -- additional transaction data
    INDEX idx_transactions_user_id (user_telegram_id),
    INDEX idx_transactions_type (type),
    INDEX idx_transactions_status (status),
    INDEX idx_transactions_raffle_id (raffle_id)
);

-- Audit logs for admin actions and system events
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user VARCHAR(255),
    action VARCHAR(100) NOT NULL,
    target_type VARCHAR(50), -- 'raffle', 'user', 'settings', etc.
    target_id VARCHAR(255), -- ID of the affected entity
    details JSONB, -- action-specific details
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_audit_logs_admin_user (admin_user),
    INDEX idx_audit_logs_action (action),
    INDEX idx_audit_logs_created_at (created_at)
);

-- Admin users table for admin panel access
CREATE TABLE IF NOT EXISTS admin_users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    role VARCHAR(50) DEFAULT 'admin',
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default raffle settings
INSERT INTO raffle_settings (participants_limit, bet_amount, winner_percentage, organizer_percentage)
VALUES (10, 1, 70, 30)
ON CONFLICT DO NOTHING;

-- Insert default admin user (password: fortunaforever0910)
INSERT INTO admin_users (username, password_hash, email, role)
VALUES ('admin', '$2a$12$FVDv8Cb2AyjXULcUgLDB3ufz8K.Q51/aWL0XmqyMdtpOrwsJV8Ci2', 'admin@rafflestars.com', 'admin')
ON CONFLICT (username) DO NOTHING;

-- Create indexes for optimal performance
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_last_active ON users(last_active);
CREATE INDEX IF NOT EXISTS idx_raffles_winner_id ON raffles(winner_id);
CREATE INDEX IF NOT EXISTS idx_star_transactions_confirmed_at ON star_transactions(confirmed_at);

-- Create functions for common operations
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for auto-updating timestamps
CREATE TRIGGER update_raffle_settings_updated_at 
    BEFORE UPDATE ON raffle_settings 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_admin_users_updated_at 
    BEFORE UPDATE ON admin_users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();