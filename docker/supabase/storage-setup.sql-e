-- Supabase Storage Configuration for Xinote Audio Files
-- Run this after the main schema.sql

-- ==============================================
-- STORAGE BUCKET CREATION
-- ==============================================
-- Note: This must be run with proper Supabase credentials

-- Create storage bucket for audio recordings
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'xinote-recordings',
    'xinote-recordings',
    FALSE,  -- Private bucket, requires authentication
    104857600,  -- 100MB max file size
    ARRAY['audio/m4a', 'audio/mp4', 'audio/mpeg', 'audio/x-m4a']::text[]
)
ON CONFLICT (id) DO UPDATE SET
    file_size_limit = 104857600,
    allowed_mime_types = ARRAY['audio/m4a', 'audio/mp4', 'audio/mpeg', 'audio/x-m4a']::text[];

-- ==============================================
-- STORAGE POLICIES
-- ==============================================

-- Policy: Doctors can upload their own recordings
CREATE POLICY "Doctors can upload recordings"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'xinote-recordings'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Doctors can view their own recordings
CREATE POLICY "Doctors can view their recordings"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'xinote-recordings'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Doctors can update their own recordings
CREATE POLICY "Doctors can update their recordings"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'xinote-recordings'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Doctors can delete their own recordings
CREATE POLICY "Doctors can delete their recordings"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'xinote-recordings'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Service role has full access
CREATE POLICY "Service role has full access to recordings"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'xinote-recordings')
WITH CHECK (bucket_id = 'xinote-recordings');

-- ==============================================
-- STORAGE HELPER FUNCTIONS
-- ==============================================

-- Function to get signed URL for audio file (valid for 1 hour)
CREATE OR REPLACE FUNCTION get_recording_url(recording_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    file_path TEXT;
    signed_url TEXT;
BEGIN
    -- Get the file path from recordings table
    SELECT audio_file_path INTO file_path
    FROM xinote.recordings
    WHERE id = recording_id
    AND doctor_id::text = auth.uid()::text;

    IF file_path IS NULL THEN
        RAISE EXCEPTION 'Recording not found or access denied';
    END IF;

    -- Generate signed URL (valid for 1 hour)
    -- This is a placeholder - actual implementation depends on Supabase client
    RETURN file_path;
END;
$$;

-- Function to clean up orphaned storage objects
CREATE OR REPLACE FUNCTION cleanup_orphaned_storage()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_count INTEGER := 0;
BEGIN
    -- This function should be called periodically via a cron job
    -- to remove storage objects that don't have a corresponding database record

    -- In practice, this is better handled via Supabase Edge Functions
    -- or external cleanup scripts

    RETURN deleted_count;
END;
$$;

-- ==============================================
-- STORAGE QUOTAS & LIMITS
-- ==============================================

-- Create a table to track storage usage per doctor
CREATE TABLE IF NOT EXISTS xinote.storage_quotas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    doctor_id UUID NOT NULL REFERENCES xinote.doctors(id) ON DELETE CASCADE,

    -- Quota limits
    max_storage_bytes BIGINT DEFAULT 10737418240,  -- 10GB default
    max_recordings INTEGER DEFAULT 1000,

    -- Current usage
    used_storage_bytes BIGINT DEFAULT 0,
    recordings_count INTEGER DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_calculated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT unique_doctor_quota UNIQUE (doctor_id)
);

-- Enable RLS
ALTER TABLE xinote.storage_quotas ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY "Doctors can view their own quota"
    ON xinote.storage_quotas FOR SELECT
    USING (doctor_id::text = auth.uid()::text);

-- Function to update storage quota usage
CREATE OR REPLACE FUNCTION update_storage_quota(p_doctor_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_used_bytes BIGINT;
    v_recording_count INTEGER;
BEGIN
    -- Calculate total storage used
    SELECT
        COALESCE(SUM(file_size_bytes), 0),
        COUNT(*)
    INTO v_used_bytes, v_recording_count
    FROM xinote.recordings
    WHERE doctor_id = p_doctor_id
    AND status != 'deleted';

    -- Update or insert quota record
    INSERT INTO xinote.storage_quotas (
        doctor_id,
        used_storage_bytes,
        recordings_count,
        last_calculated_at
    )
    VALUES (
        p_doctor_id,
        v_used_bytes,
        v_recording_count,
        NOW()
    )
    ON CONFLICT (doctor_id) DO UPDATE SET
        used_storage_bytes = v_used_bytes,
        recordings_count = v_recording_count,
        last_calculated_at = NOW(),
        updated_at = NOW();
END;
$$;

-- Trigger to update quota when recordings change
CREATE OR REPLACE FUNCTION on_recording_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Update quota for the affected doctor
    IF TG_OP = 'DELETE' THEN
        PERFORM update_storage_quota(OLD.doctor_id);
    ELSE
        PERFORM update_storage_quota(NEW.doctor_id);
    END IF;

    RETURN NULL;
END;
$$;

CREATE TRIGGER recording_change_trigger
AFTER INSERT OR UPDATE OR DELETE ON xinote.recordings
FOR EACH ROW
EXECUTE FUNCTION on_recording_change();

-- ==============================================
-- STORAGE STATISTICS VIEW
-- ==============================================

CREATE OR REPLACE VIEW xinote.storage_statistics AS
SELECT
    d.id as doctor_id,
    d.full_name,
    sq.used_storage_bytes,
    sq.max_storage_bytes,
    ROUND((sq.used_storage_bytes::NUMERIC / sq.max_storage_bytes::NUMERIC) * 100, 2) as usage_percentage,
    sq.recordings_count,
    sq.max_recordings,
    sq.last_calculated_at
FROM xinote.doctors d
LEFT JOIN xinote.storage_quotas sq ON d.id = sq.doctor_id;

-- ==============================================
-- EXAMPLE: File Path Structure
-- ==============================================

-- Audio files should be stored in this structure:
-- {doctor_id}/{recording_id}.m4a
--
-- Example:
-- 550e8400-e29b-41d4-a716-446655440000/7c9e6679-7425-40de-944b-e07fc1f90ae7.m4a
--
-- This allows for:
-- 1. Easy access control via RLS policies
-- 2. Organized file structure
-- 3. Simple cleanup of doctor's data on deletion

-- ==============================================
-- STORAGE MIGRATION HELPER
-- ==============================================

-- Function to migrate old n8n files to new storage structure
CREATE OR REPLACE FUNCTION migrate_n8n_storage()
RETURNS TABLE (
    recording_id UUID,
    old_path TEXT,
    new_path TEXT,
    status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- This is a placeholder for migration logic
    -- Actual implementation will depend on how files are currently stored in n8n

    RETURN QUERY
    SELECT
        r.id,
        r.audio_file_path,
        r.doctor_id::text || '/' || r.id::text || '.m4a' as new_path,
        'pending'::text
    FROM xinote.recordings r
    WHERE r.audio_file_path NOT LIKE r.doctor_id::text || '%';
END;
$$;

-- ==============================================
-- COMPLETION MESSAGE
-- ==============================================

DO $$
BEGIN
    RAISE NOTICE '✅ Supabase Storage configuration completed!';
    RAISE NOTICE '🗂️  Bucket created: xinote-recordings';
    RAISE NOTICE '🔒 Storage policies configured';
    RAISE NOTICE '📊 Storage quotas table created';
    RAISE NOTICE '📝 Next: Test file upload via Supabase client';
END $$;
