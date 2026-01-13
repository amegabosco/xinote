-- API Keys for Doctor Authentication
-- This allows doctors to generate API keys for their mobile apps

CREATE TABLE IF NOT EXISTS xinote.api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    doctor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- API Key
    key_hash TEXT NOT NULL UNIQUE, -- bcrypt hash of the API key
    key_prefix TEXT NOT NULL, -- First 8 chars for identification (e.g., "xn_1234...")
    key_name TEXT, -- Optional name/description (e.g., "My iPhone", "Work Phone")

    -- Metadata
    last_used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE, -- NULL = never expires
    revoked_at TIMESTAMP WITH TIME ZONE, -- NULL = active

    -- Usage tracking
    request_count INTEGER DEFAULT 0,
    last_request_ip INET,

    -- Scopes/permissions (for future use)
    scopes TEXT[] DEFAULT ARRAY['upload', 'view', 'transcribe']::TEXT[]
);

-- Indexes
CREATE INDEX idx_api_keys_doctor ON xinote.api_keys(doctor_id) WHERE revoked_at IS NULL;
CREATE INDEX idx_api_keys_hash ON xinote.api_keys(key_hash) WHERE revoked_at IS NULL;
CREATE INDEX idx_api_keys_prefix ON xinote.api_keys(key_prefix);

-- Row Level Security
ALTER TABLE xinote.api_keys ENABLE ROW LEVEL SECURITY;

-- Doctors can only view their own API keys
CREATE POLICY "Doctors can view their own API keys"
    ON xinote.api_keys
    FOR SELECT
    USING (doctor_id::text = auth.uid()::text);

-- Doctors can create API keys for themselves
CREATE POLICY "Doctors can create their own API keys"
    ON xinote.api_keys
    FOR INSERT
    WITH CHECK (doctor_id::text = auth.uid()::text);

-- Doctors can revoke their own API keys
CREATE POLICY "Doctors can revoke their own API keys"
    ON xinote.api_keys
    FOR UPDATE
    USING (doctor_id::text = auth.uid()::text)
    WITH CHECK (doctor_id::text = auth.uid()::text);

-- Service role can manage all API keys
CREATE POLICY "Service role can manage API keys"
    ON xinote.api_keys
    USING (auth.jwt()->>'role' = 'service_role');

-- Add comment
COMMENT ON TABLE xinote.api_keys IS 'API keys for doctor authentication from mobile apps';
