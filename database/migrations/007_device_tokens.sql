-- Device Tokens Table for Push Notifications
-- Stores device tokens for sending push notifications when transcripts/reports are ready

CREATE TABLE IF NOT EXISTS xinote.device_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID NOT NULL REFERENCES xinote.doctors(id) ON DELETE CASCADE,
    device_token TEXT NOT NULL,
    device_type VARCHAR(20) DEFAULT 'android' CHECK (device_type IN ('android', 'ios')),
    device_info JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_notification_at TIMESTAMP WITH TIME ZONE,

    -- Ensure unique doctor-device combination
    UNIQUE (doctor_id, device_token)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_device_tokens_doctor_active
    ON xinote.device_tokens(doctor_id, is_active)
    WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_device_tokens_token
    ON xinote.device_tokens(device_token)
    WHERE is_active = true;

-- Notification Queue Table
-- Queue for pending notifications to be sent to devices
CREATE TABLE IF NOT EXISTS xinote.notification_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID NOT NULL REFERENCES xinote.doctors(id) ON DELETE CASCADE,
    recording_id UUID REFERENCES xinote.recordings(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL CHECK (notification_type IN ('transcript_ready', 'report_ready', 'upload_success', 'error')),
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    data JSONB,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sent_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0
);

-- Index for processing notifications
CREATE INDEX IF NOT EXISTS idx_notification_queue_status
    ON xinote.notification_queue(status, created_at)
    WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_notification_queue_doctor
    ON xinote.notification_queue(doctor_id, created_at DESC);

-- Function to automatically create notifications
CREATE OR REPLACE FUNCTION xinote.create_notification_on_transcript_complete()
RETURNS TRIGGER AS $$
BEGIN
    -- Only create notification when transcription is completed
    IF NEW.transcription_completed_at IS NOT NULL AND
       (OLD.transcription_completed_at IS NULL OR OLD.transcription_completed_at != NEW.transcription_completed_at) THEN

        INSERT INTO xinote.notification_queue (
            doctor_id,
            recording_id,
            notification_type,
            title,
            body,
            data
        )
        SELECT
            r.doctor_id,
            NEW.recording_id,
            'transcript_ready',
            'Transcription complète',
            'La transcription de votre enregistrement est prête',
            jsonb_build_object(
                'recording_id', NEW.recording_id,
                'transcript_id', NEW.id,
                'processing_method', NEW.processing_method,
                'confidence_score', NEW.whisper_confidence_score
            )
        FROM xinote.recordings r
        WHERE r.id = NEW.recording_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for transcript completion
DROP TRIGGER IF EXISTS trigger_notify_transcript_complete ON xinote.transcriptions;
CREATE TRIGGER trigger_notify_transcript_complete
    AFTER INSERT OR UPDATE ON xinote.transcriptions
    FOR EACH ROW
    EXECUTE FUNCTION xinote.create_notification_on_transcript_complete();

-- Function to automatically create notifications for report completion
CREATE OR REPLACE FUNCTION xinote.create_notification_on_report_complete()
RETURNS TRIGGER AS $$
BEGIN
    -- Only create notification when report generation is completed
    IF NEW.generation_status = 'completed' AND
       (OLD.generation_status IS NULL OR OLD.generation_status != 'completed') THEN

        INSERT INTO xinote.notification_queue (
            doctor_id,
            recording_id,
            notification_type,
            title,
            body,
            data
        )
        VALUES (
            NEW.doctor_id,
            NEW.recording_id,
            'report_ready',
            'Rapport médical généré',
            'Votre rapport médical est prêt à être téléchargé',
            jsonb_build_object(
                'report_id', NEW.report_id,
                'recording_id', NEW.recording_id,
                'pdf_url', NEW.pdf_url,
                'pdf_size_bytes', NEW.pdf_file_size_bytes
            )
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for report completion
DROP TRIGGER IF EXISTS trigger_notify_report_complete ON xinote.report_metadata;
CREATE TRIGGER trigger_notify_report_complete
    AFTER INSERT OR UPDATE ON xinote.report_metadata
    FOR EACH ROW
    EXECUTE FUNCTION xinote.create_notification_on_report_complete();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON xinote.device_tokens TO authenticated;
GRANT SELECT, INSERT, UPDATE ON xinote.notification_queue TO authenticated;
GRANT USAGE ON SCHEMA xinote TO authenticated;

-- Row Level Security (RLS)
ALTER TABLE xinote.device_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE xinote.notification_queue ENABLE ROW LEVEL SECURITY;

-- Doctors can only manage their own device tokens
CREATE POLICY device_tokens_doctor_policy ON xinote.device_tokens
    FOR ALL
    USING (doctor_id = auth.uid());

-- Doctors can only see their own notifications
CREATE POLICY notification_queue_doctor_policy ON xinote.notification_queue
    FOR SELECT
    USING (doctor_id = auth.uid());

-- Comment
COMMENT ON TABLE xinote.device_tokens IS 'Stores device tokens for push notifications';
COMMENT ON TABLE xinote.notification_queue IS 'Queue for pending notifications to be sent to devices';
COMMENT ON FUNCTION xinote.create_notification_on_transcript_complete() IS 'Automatically creates notification when transcript is completed';
COMMENT ON FUNCTION xinote.create_notification_on_report_complete() IS 'Automatically creates notification when report is generated';
