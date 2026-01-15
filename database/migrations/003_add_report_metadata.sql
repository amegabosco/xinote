-- Migration: Add report_metadata table for PDF report generation
-- Date: 2026-01-15
-- Description: Adds support for AI-generated PDF medical reports

-- ==============================================
-- REPORT METADATA TABLE
-- ==============================================
CREATE TABLE IF NOT EXISTS xinote.report_metadata (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id VARCHAR(50) UNIQUE NOT NULL, -- Format: R-MMDDHHMM-XXXXXX
    recording_id UUID NOT NULL REFERENCES xinote.recordings(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES xinote.doctors(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES xinote.patients(id) ON DELETE SET NULL,

    -- PDF storage
    pdf_url TEXT,
    pdf_file_size_bytes BIGINT,
    pdf_storage_path TEXT, -- Path in Supabase Storage

    -- Generation metadata
    generation_status TEXT NOT NULL DEFAULT 'processing' CHECK (generation_status IN (
        'processing', 'completed', 'error', 'cancelled'
    )),

    -- AI extraction results
    ai_extraction_data JSONB,

    -- Performance metrics
    ai_processing_time_ms INTEGER,
    pdf_generation_time_ms INTEGER,
    total_generation_time_ms INTEGER,

    -- Timestamps
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,

    -- Error tracking
    error_message TEXT,
    error_details JSONB,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,

    -- Version tracking
    report_version INTEGER DEFAULT 1,
    template_version TEXT DEFAULT '1.0.0',

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT unique_report_id UNIQUE (report_id)
);

-- Indexes
CREATE INDEX idx_report_metadata_recording ON xinote.report_metadata(recording_id);
CREATE INDEX idx_report_metadata_doctor ON xinote.report_metadata(doctor_id);
CREATE INDEX idx_report_metadata_patient ON xinote.report_metadata(patient_id);
CREATE INDEX idx_report_metadata_status ON xinote.report_metadata(generation_status);
CREATE INDEX idx_report_metadata_report_id ON xinote.report_metadata(report_id);
CREATE INDEX idx_report_metadata_requested ON xinote.report_metadata(requested_at DESC);

-- Enable RLS
ALTER TABLE xinote.report_metadata ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Doctors can view their own reports"
    ON xinote.report_metadata FOR SELECT
    USING (doctor_id::text = auth.uid()::text);

CREATE POLICY "Service role can manage reports"
    ON xinote.report_metadata FOR ALL
    USING (auth.jwt()->>'role' = 'service_role');

-- Trigger for updated_at
CREATE TRIGGER update_report_metadata_updated_at BEFORE UPDATE ON xinote.report_metadata
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT SELECT ON xinote.report_metadata TO authenticated;
GRANT ALL ON xinote.report_metadata TO service_role;

-- Add comment
COMMENT ON TABLE xinote.report_metadata IS 'Generated PDF medical reports with AI-extracted content';
