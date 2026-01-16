-- Migration 008: Fix recordings table and audit_log RLS
-- Fixes missing updated_at column and RLS policy issues

-- ==============================================
-- FIX RECORDINGS TABLE
-- ==============================================

-- Add updated_at column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'xinote'
        AND table_name = 'recordings'
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE xinote.recordings
        ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();

        RAISE NOTICE 'Added updated_at column to recordings table';
    ELSE
        RAISE NOTICE 'updated_at column already exists in recordings table';
    END IF;
END $$;

-- Create or replace trigger function for updated_at
CREATE OR REPLACE FUNCTION xinote.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS update_recordings_updated_at ON xinote.recordings;
CREATE TRIGGER update_recordings_updated_at
    BEFORE UPDATE ON xinote.recordings
    FOR EACH ROW
    EXECUTE FUNCTION xinote.update_updated_at_column();

-- ==============================================
-- FIX AUDIT_LOG RLS
-- ==============================================

-- Drop existing restrictive policies if they exist
DROP POLICY IF EXISTS "Users can view their own audit logs" ON xinote.audit_log;
DROP POLICY IF EXISTS "Service role full access" ON xinote.audit_log;

-- Create permissive policies for audit_log
-- Allow service role to insert (for backend operations)
CREATE POLICY "Service role can insert audit logs"
    ON xinote.audit_log
    FOR INSERT
    TO service_role
    WITH CHECK (true);

-- Allow service role to select
CREATE POLICY "Service role can view audit logs"
    ON xinote.audit_log
    FOR SELECT
    TO service_role
    USING (true);

-- Allow authenticated users to view their own logs
CREATE POLICY "Doctors can view their own audit logs"
    ON xinote.audit_log
    FOR SELECT
    TO authenticated
    USING (user_id::text = auth.uid()::text);

-- ==============================================
-- VERIFY CHANGES
-- ==============================================

-- Check that updated_at exists
DO $$
DECLARE
    col_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'xinote'
        AND table_name = 'recordings'
        AND column_name = 'updated_at'
    ) INTO col_exists;

    IF col_exists THEN
        RAISE NOTICE '✅ Column recordings.updated_at exists';
    ELSE
        RAISE EXCEPTION '❌ Column recordings.updated_at does not exist';
    END IF;
END $$;

-- Check audit_log RLS
DO $$
DECLARE
    policy_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE schemaname = 'xinote'
    AND tablename = 'audit_log';

    IF policy_count > 0 THEN
        RAISE NOTICE '✅ Audit log has % RLS policies', policy_count;
    ELSE
        RAISE WARNING '⚠️  No RLS policies found for audit_log';
    END IF;
END $$;

-- Show current policies
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE schemaname = 'xinote'
AND tablename IN ('recordings', 'audit_log')
ORDER BY tablename, policyname;

RAISE NOTICE '✅ Migration 008 completed successfully';
