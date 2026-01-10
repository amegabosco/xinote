-- Xinote Medical Transcription Database Schema
-- For Supabase PostgreSQL
-- GDPR & Medical Data Compliant

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================
-- CREATE XINOTE SCHEMA
-- ==============================================
CREATE SCHEMA IF NOT EXISTS xinote;

-- Grant permissions on schema
GRANT USAGE ON SCHEMA xinote TO authenticated;
GRANT USAGE ON SCHEMA xinote TO service_role;
GRANT ALL ON SCHEMA xinote TO postgres;

-- Set search path to include xinote schema
ALTER DATABASE postgres SET search_path TO xinote, public;

-- ==============================================
-- DOCTORS TABLE
-- ==============================================
CREATE TABLE IF NOT EXISTS xinote.doctors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    structure TEXT, -- Hospital/Clinic name
    specialization TEXT,
    phone TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_login_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,

    -- Metadata
    settings JSONB DEFAULT '{}'::jsonb,

    CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Index for faster lookups
CREATE INDEX idx_doctors_email ON xinote.doctors(email);
CREATE INDEX idx_doctors_active ON xinote.doctors(is_active) WHERE is_active = TRUE;

-- ==============================================
-- PATIENTS TABLE (Encrypted Sensitive Data)
-- ==============================================
CREATE TABLE IF NOT EXISTS xinote.patients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    doctor_id UUID NOT NULL REFERENCES xinote.doctors(id) ON DELETE CASCADE,

    -- Encrypted patient information (PGP encrypted in application layer)
    encrypted_name TEXT NOT NULL,
    encrypted_age TEXT,
    encrypted_gender TEXT,
    encrypted_medical_history TEXT,

    -- Non-sensitive metadata
    patient_code TEXT UNIQUE, -- Anonymous identifier like "PAT-2024-001"
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_consultation_at TIMESTAMPTZ,

    -- Metadata
    tags TEXT[] DEFAULT '{}'::text[],

    CONSTRAINT unique_patient_code UNIQUE (patient_code)
);

-- Indexes
CREATE INDEX idx_patients_doctor ON xinote.patients(doctor_id);
CREATE INDEX idx_patients_code ON xinote.patients(patient_code);
CREATE INDEX idx_patients_last_consultation ON xinote.patients(last_consultation_at DESC);

-- ==============================================
-- RECORDINGS TABLE
-- ==============================================
CREATE TABLE IF NOT EXISTS xinote.recordings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    doctor_id UUID NOT NULL REFERENCES xinote.doctors(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES xinote.patients(id) ON DELETE SET NULL,

    -- File information
    audio_file_path TEXT NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    duration_seconds INTEGER,
    audio_format TEXT DEFAULT 'm4a',

    -- Recording metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    exam_datetime TIMESTAMPTZ NOT NULL,
    recording_device TEXT, -- Device info from Flutter app

    -- Processing status
    status TEXT DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'transcribing', 'completed', 'error', 'deleted')),
    error_message TEXT,

    -- Quality metrics
    audio_quality_score DECIMAL(3,2), -- 0.00 to 1.00
    background_noise_level TEXT CHECK (background_noise_level IN ('low', 'medium', 'high')),

    -- Metadata
    notes TEXT,
    tags TEXT[] DEFAULT '{}'::text[]
);

-- Indexes
CREATE INDEX idx_recordings_doctor ON xinote.recordings(doctor_id);
CREATE INDEX idx_recordings_patient ON xinote.recordings(patient_id);
CREATE INDEX idx_recordings_status ON xinote.recordings(status);
CREATE INDEX idx_recordings_exam_date ON xinote.recordings(exam_datetime DESC);
CREATE INDEX idx_recordings_created ON xinote.recordings(created_at DESC);

-- ==============================================
-- TRANSCRIPTIONS TABLE
-- ==============================================
CREATE TABLE IF NOT EXISTS xinote.transcriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recording_id UUID NOT NULL REFERENCES xinote.recordings(id) ON DELETE CASCADE,

    -- Local transcription (from Android speech-to-text)
    local_transcript TEXT,
    local_confidence_score DECIMAL(3,2),
    local_language TEXT DEFAULT 'fr_FR',
    local_chunks JSONB, -- Array of chunk objects with timestamps

    -- Cloud transcription (from OpenAI Whisper)
    whisper_transcript TEXT,
    whisper_confidence_score DECIMAL(3,2),
    whisper_language TEXT,
    whisper_model TEXT DEFAULT 'whisper-1',

    -- Final combined transcript
    final_transcript TEXT NOT NULL,
    processing_method TEXT DEFAULT 'hybrid' CHECK (processing_method IN ('local', 'whisper', 'hybrid')),

    -- Medical analysis
    medical_terms_detected TEXT[] DEFAULT '{}'::text[],
    medical_flags JSONB DEFAULT '[]'::jsonb, -- Warnings, critical terms, etc.
    anatomical_terms TEXT[] DEFAULT '{}'::text[],
    medication_mentions TEXT[] DEFAULT '{}'::text[],

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    transcription_started_at TIMESTAMPTZ,
    transcription_completed_at TIMESTAMPTZ,

    -- Processing metadata
    processing_time_ms INTEGER,
    whisper_api_cost_usd DECIMAL(6,4), -- Track API costs

    CONSTRAINT unique_recording_transcription UNIQUE (recording_id)
);

-- Indexes
CREATE INDEX idx_transcriptions_recording ON xinote.transcriptions(recording_id);
CREATE INDEX idx_transcriptions_created ON xinote.transcriptions(created_at DESC);
CREATE INDEX idx_transcriptions_medical_terms ON xinote.transcriptions USING GIN (medical_terms_detected);

-- ==============================================
-- AUDIT LOG TABLE (GDPR Compliance)
-- ==============================================
CREATE TABLE IF NOT EXISTS xinote.audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    doctor_id UUID REFERENCES xinote.doctors(id) ON DELETE SET NULL,

    -- Action details
    action TEXT NOT NULL CHECK (action IN (
        'login', 'logout',
        'recording_upload', 'recording_view', 'recording_delete',
        'patient_create', 'patient_view', 'patient_update', 'patient_delete',
        'transcription_view', 'transcription_export',
        'settings_update', 'data_export'
    )),
    resource_type TEXT,
    resource_id UUID,

    -- Request metadata
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,

    -- Additional context
    details JSONB DEFAULT '{}'::jsonb,

    -- Success/failure
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT
);

-- Indexes
CREATE INDEX idx_audit_log_doctor ON xinote.audit_log(doctor_id);
CREATE INDEX idx_audit_log_timestamp ON xinote.audit_log(timestamp DESC);
CREATE INDEX idx_audit_log_action ON xinote.audit_log(action);
CREATE INDEX idx_audit_log_resource ON xinote.audit_log(resource_type, resource_id);

-- ==============================================
-- API KEYS TABLE (for Flutter app authentication)
-- ==============================================
CREATE TABLE IF NOT EXISTS xinote.api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    doctor_id UUID NOT NULL REFERENCES xinote.doctors(id) ON DELETE CASCADE,

    -- API key details
    key_hash TEXT NOT NULL UNIQUE, -- Bcrypt hashed API key
    key_prefix TEXT NOT NULL, -- First 8 chars for identification (e.g., "xin_prod_")
    name TEXT NOT NULL, -- Human-readable name

    -- Permissions
    scopes TEXT[] DEFAULT '{upload,transcribe,view}'::text[],

    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,

    -- Usage tracking
    request_count INTEGER DEFAULT 0,
    last_request_ip INET,

    CONSTRAINT unique_key_hash UNIQUE (key_hash)
);

-- Indexes
CREATE INDEX idx_api_keys_doctor ON xinote.api_keys(doctor_id);
CREATE INDEX idx_api_keys_active ON xinote.api_keys(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_api_keys_prefix ON xinote.api_keys(key_prefix);

-- ==============================================
-- STORAGE BUCKETS (for Supabase Storage)
-- ==============================================
-- This will be created via Supabase Storage API, not SQL
-- But we document the structure here:

-- Bucket: xinote-recordings
--   - Private (requires authentication)
--   - Max file size: 100MB
--   - Allowed MIME types: audio/m4a, audio/mp4, audio/mpeg
--   - Path structure: {doctor_id}/{recording_id}.m4a

-- ==============================================
-- HELPER FUNCTIONS
-- ==============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to tables with updated_at
CREATE TRIGGER update_doctors_updated_at BEFORE UPDATE ON xinote.doctors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON xinote.patients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to log audit events
CREATE OR REPLACE FUNCTION log_audit_event(
    p_doctor_id UUID,
    p_action TEXT,
    p_resource_type TEXT DEFAULT NULL,
    p_resource_id UUID DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_details JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
    v_audit_id UUID;
BEGIN
    INSERT INTO xinote.audit_log (
        doctor_id, action, resource_type, resource_id,
        ip_address, user_agent, details
    ) VALUES (
        p_doctor_id, p_action, p_resource_type, p_resource_id,
        p_ip_address, p_user_agent, p_details
    )
    RETURNING id INTO v_audit_id;

    RETURN v_audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================

-- Enable RLS on all tables
ALTER TABLE xinote.doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE xinote.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE xinote.recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE xinote.transcriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE xinote.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE xinote.api_keys ENABLE ROW LEVEL SECURITY;

-- Doctors: Can only access their own data
CREATE POLICY "Doctors can view their own profile"
    ON xinote.doctors FOR SELECT
    USING (auth.uid()::text = id::text);

CREATE POLICY "Doctors can update their own profile"
    ON xinote.doctors FOR UPDATE
    USING (auth.uid()::text = id::text);

-- Patients: Doctors can only access their own patients
CREATE POLICY "Doctors can view their own patients"
    ON xinote.patients FOR SELECT
    USING (doctor_id::text = auth.uid()::text);

CREATE POLICY "Doctors can create patients"
    ON xinote.patients FOR INSERT
    WITH CHECK (doctor_id::text = auth.uid()::text);

CREATE POLICY "Doctors can update their own patients"
    ON xinote.patients FOR UPDATE
    USING (doctor_id::text = auth.uid()::text);

CREATE POLICY "Doctors can delete their own patients"
    ON xinote.patients FOR DELETE
    USING (doctor_id::text = auth.uid()::text);

-- Recordings: Doctors can only access their own recordings
CREATE POLICY "Doctors can view their own recordings"
    ON xinote.recordings FOR SELECT
    USING (doctor_id::text = auth.uid()::text);

CREATE POLICY "Doctors can create recordings"
    ON xinote.recordings FOR INSERT
    WITH CHECK (doctor_id::text = auth.uid()::text);

CREATE POLICY "Doctors can update their own recordings"
    ON xinote.recordings FOR UPDATE
    USING (doctor_id::text = auth.uid()::text);

CREATE POLICY "Doctors can delete their own recordings"
    ON xinote.recordings FOR DELETE
    USING (doctor_id::text = auth.uid()::text);

-- Transcriptions: Access via recordings relationship
CREATE POLICY "Doctors can view transcriptions of their recordings"
    ON xinote.transcriptions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM xinote.recordings
            WHERE recordings.id = transcriptions.recording_id
            AND recordings.doctor_id::text = auth.uid()::text
        )
    );

CREATE POLICY "Service role can manage transcriptions"
    ON xinote.transcriptions FOR ALL
    USING (auth.jwt()->>'role' = 'service_role');

-- Audit Log: Doctors can only view their own audit logs
CREATE POLICY "Doctors can view their own audit logs"
    ON xinote.audit_log FOR SELECT
    USING (doctor_id::text = auth.uid()::text);

CREATE POLICY "Service role can create audit logs"
    ON xinote.audit_log FOR INSERT
    WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- API Keys: Doctors can manage their own API keys
CREATE POLICY "Doctors can view their own API keys"
    ON xinote.api_keys FOR SELECT
    USING (doctor_id::text = auth.uid()::text);

CREATE POLICY "Doctors can create API keys"
    ON xinote.api_keys FOR INSERT
    WITH CHECK (doctor_id::text = auth.uid()::text);

CREATE POLICY "Doctors can update their own API keys"
    ON xinote.api_keys FOR UPDATE
    USING (doctor_id::text = auth.uid()::text);

-- ==============================================
-- VIEWS FOR COMMON QUERIES
-- ==============================================

-- View: Recordings with transcription status
CREATE OR REPLACE VIEW xinote.recordings_with_transcriptions AS
SELECT
    r.*,
    t.final_transcript,
    t.processing_method,
    t.whisper_confidence_score,
    t.medical_terms_detected,
    p.patient_code
FROM xinote.recordings r
LEFT JOIN xinote.transcriptions t ON r.id = t.recording_id
LEFT JOIN xinote.patients p ON r.patient_id = p.id;

-- View: Doctor statistics
CREATE OR REPLACE VIEW xinote.doctor_statistics AS
SELECT
    d.id as doctor_id,
    d.full_name,
    COUNT(DISTINCT p.id) as total_patients,
    COUNT(DISTINCT r.id) as total_recordings,
    COUNT(DISTINCT t.id) as total_transcriptions,
    SUM(r.duration_seconds) as total_recording_duration_seconds,
    MAX(r.created_at) as last_recording_at
FROM xinote.doctors d
LEFT JOIN xinote.patients p ON d.id = p.doctor_id
LEFT JOIN xinote.recordings r ON d.id = r.doctor_id
LEFT JOIN xinote.transcriptions t ON r.id = t.recording_id
GROUP BY d.id, d.full_name;

-- ==============================================
-- SEED DATA (Optional - for testing)
-- ==============================================

-- Uncomment to create a test doctor account
-- INSERT INTO xinote.doctors (id, email, full_name, structure, specialization)
-- VALUES (
--     '00000000-0000-0000-0000-000000000001',
--     'dr.test@xinote.com',
--     'Dr. Test Account',
--     'Test Hospital',
--     'General Medicine'
-- ) ON CONFLICT (email) DO NOTHING;

-- ==============================================
-- COMMENTS FOR DOCUMENTATION
-- ==============================================

COMMENT ON TABLE xinote.doctors IS 'Medical practitioners using the Xinote app';
COMMENT ON TABLE xinote.patients IS 'Patient records with encrypted sensitive data';
COMMENT ON TABLE xinote.recordings IS 'Audio recordings of medical consultations';
COMMENT ON TABLE xinote.transcriptions IS 'Transcriptions from local and Whisper API';
COMMENT ON TABLE xinote.audit_log IS 'GDPR-compliant audit trail of all actions';
COMMENT ON TABLE xinote.api_keys IS 'API keys for Flutter app authentication';

-- ==============================================
-- GRANT PERMISSIONS
-- ==============================================

-- Grant authenticated users access to their own data
GRANT SELECT, INSERT, UPDATE, DELETE ON xinote.doctors TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON xinote.patients TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON xinote.recordings TO authenticated;
GRANT SELECT ON xinote.transcriptions TO authenticated;
GRANT SELECT ON xinote.audit_log TO authenticated;
GRANT SELECT, INSERT, UPDATE ON xinote.api_keys TO authenticated;

-- Grant service role full access
GRANT ALL ON ALL TABLES IN SCHEMA xinote TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA xinote TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA xinote TO service_role;

-- ==============================================
-- COMPLETION MESSAGE
-- ==============================================

DO $$
BEGIN
    RAISE NOTICE '✅ Xinote database schema created successfully!';
    RAISE NOTICE '📊 Tables: doctors, patients, recordings, transcriptions, audit_log, api_keys';
    RAISE NOTICE '🔒 Row Level Security enabled on all tables';
    RAISE NOTICE '📝 Next: Configure Supabase Storage bucket for audio files';
END $$;
