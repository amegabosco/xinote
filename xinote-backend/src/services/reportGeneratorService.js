/**
 * Report Generator Service
 * Main orchestration service for generating medical reports
 * Coordinates AI extraction, PDF generation, and storage
 */

const { createClient } = require('@supabase/supabase-js');
const { customAlphabet } = require('nanoid');
const aiExtractionService = require('./aiExtractionService');
const pdfGeneratorService = require('./pdfGeneratorService');
const logger = require('../utils/logger');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Generate report ID: R-MMDDHHMM-XXXXXX
const nanoid = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 6);

function generateReportId() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hour = String(now.getHours()).padStart(2, '0');
  const minute = String(now.getMinutes()).padStart(2, '0');
  const unique = nanoid();

  return `R-${month}${day}${hour}${minute}-${unique}`;
}

/**
 * Generate complete medical report
 * @param {string} recordingId - Recording UUID
 * @param {string} doctorId - Doctor UUID
 * @returns {Promise<Object>} Report metadata
 */
async function generateReport(recordingId, doctorId) {
  const totalStartTime = Date.now();
  const reportId = generateReportId();

  try {
    logger.info('[Report] Starting report generation', {
      reportId,
      recordingId,
      doctorId
    });

    // Step 1: Fetch all required data from database
    const reportData = await fetchReportData(recordingId, doctorId);

    // Step 2: Create report metadata record (status: processing)
    await createReportMetadata(reportId, recordingId, doctorId, reportData.patientId);

    // Step 3: AI content extraction from transcription
    const aiExtractionStartTime = Date.now();
    const aiContent = await aiExtractionService.extractMedicalContent(
      reportData.transcription,
      reportData.examType,
      reportData.language || 'fr'
    );
    const aiProcessingTime = Date.now() - aiExtractionStartTime;

    // Step 4: Generate PDF
    const pdfStartTime = Date.now();
    const pdfData = {
      reportId,
      ...reportData,
      observations: aiContent.observations,
      analysisSummary: aiContent.analysis_summary,
      medicalConclusion: aiContent.medical_conclusion,
      generationDate: new Date().toISOString()
    };

    const pdfBuffer = await pdfGeneratorService.generatePDF(pdfData);
    const pdfProcessingTime = Date.now() - pdfStartTime;

    // Step 5: Upload PDF to Supabase Storage
    const pdfUrl = await uploadPDFToStorage(pdfBuffer, reportId, doctorId);

    // Step 6: Update report metadata (status: completed)
    const totalProcessingTime = Date.now() - totalStartTime;
    await updateReportMetadata(reportId, {
      generation_status: 'completed',
      pdf_url: pdfUrl,
      pdf_file_size_bytes: pdfBuffer.length,
      pdf_storage_path: `${doctorId}/${reportId}.pdf`,
      ai_extraction_data: aiContent,
      ai_processing_time_ms: aiProcessingTime,
      pdf_generation_time_ms: pdfProcessingTime,
      total_generation_time_ms: totalProcessingTime,
      completed_at: new Date().toISOString()
    });

    // Step 7: Log audit event
    await logAuditEvent(doctorId, 'report_generate', reportId, true);

    logger.info('[Report] Report generation completed successfully', {
      reportId,
      totalProcessingTime,
      pdfSize: pdfBuffer.length
    });

    return {
      reportId,
      pdfUrl,
      status: 'completed',
      processingTime: totalProcessingTime,
      pdfSize: pdfBuffer.length
    };

  } catch (error) {
    logger.error('[Report] Report generation failed', {
      reportId,
      recordingId,
      error: error.message,
      stack: error.stack
    });

    // Update report metadata with error
    await updateReportMetadata(reportId, {
      generation_status: 'error',
      error_message: error.message,
      error_details: { stack: error.stack },
      retry_count: 0
    });

    // Log audit event (failure)
    await logAuditEvent(doctorId, 'report_generate', reportId, false, error.message);

    throw error;
  }
}

/**
 * Fetch all data needed for report generation
 */
async function fetchReportData(recordingId, doctorId) {
  try {
    // Fetch recording with transcription
    const { data: recording, error: recError } = await supabase
      .from('recordings')
      .select(`
        *,
        transcriptions (
          final_transcript,
          whisper_transcript,
          local_transcript,
          processing_method,
          whisper_language
        ),
        patients (
          id,
          encrypted_name,
          encrypted_age,
          encrypted_gender,
          patient_code
        )
      `)
      .eq('id', recordingId)
      .eq('doctor_id', doctorId)
      .single();

    if (recError) throw new Error(`Failed to fetch recording: ${recError.message}`);
    if (!recording) throw new Error('Recording not found');

    // Fetch doctor info
    const { data: doctor, error: docError } = await supabase
      .from('doctors')
      .select('full_name, structure, specialization')
      .eq('id', doctorId)
      .single();

    if (docError) throw new Error(`Failed to fetch doctor: ${docError.message}`);

    // Decrypt patient data (in production, implement actual decryption)
    // For now, we'll use the encrypted values as-is
    const patientName = recording.patients?.encrypted_name || 'Non spécifié';
    const patientAge = recording.patients?.encrypted_age || 'Non spécifié';
    const patientGender = recording.patients?.encrypted_gender || 'Non spécifié';
    const patientId = recording.patients?.patient_code || 'Unknown';

    // Get transcription (prefer whisper, fallback to final or local)
    const transcription =
      recording.transcriptions?.final_transcript ||
      recording.transcriptions?.whisper_transcript ||
      recording.transcriptions?.local_transcript ||
      '';

    if (!transcription) {
      throw new Error('No transcription available for this recording');
    }

    return {
      patientId,
      patientName,
      patientAge,
      patientGender,
      examType: recording.notes || 'Examen médical',
      transcription,
      language: recording.transcriptions?.whisper_language || 'fr',
      doctorName: doctor.full_name,
      structure: doctor.structure,
      examDate: recording.exam_datetime,
      recordingId: recording.id,
      duration: recording.duration_seconds
    };

  } catch (error) {
    logger.error('[Report] Failed to fetch report data', {
      recordingId,
      error: error.message
    });
    throw error;
  }
}

/**
 * Create initial report metadata record
 */
async function createReportMetadata(reportId, recordingId, doctorId, patientId) {
  try {
    const { error } = await supabase
      .from('report_metadata')
      .insert({
        report_id: reportId,
        recording_id: recordingId,
        doctor_id: doctorId,
        patient_id: patientId,
        generation_status: 'processing',
        requested_at: new Date().toISOString()
      });

    if (error) throw new Error(`Failed to create report metadata: ${error.message}`);

    logger.info('[Report] Report metadata created', { reportId });

  } catch (error) {
    logger.error('[Report] Failed to create report metadata', {
      reportId,
      error: error.message
    });
    throw error;
  }
}

/**
 * Update report metadata
 */
async function updateReportMetadata(reportId, updates) {
  try {
    const { error } = await supabase
      .from('report_metadata')
      .update(updates)
      .eq('report_id', reportId);

    if (error) throw new Error(`Failed to update report metadata: ${error.message}`);

    logger.info('[Report] Report metadata updated', { reportId, status: updates.generation_status });

  } catch (error) {
    logger.error('[Report] Failed to update report metadata', {
      reportId,
      error: error.message
    });
    // Don't throw - this is not critical
  }
}

/**
 * Upload PDF to Supabase Storage
 */
async function uploadPDFToStorage(pdfBuffer, reportId, doctorId) {
  try {
    const fileName = `${reportId}.pdf`;
    const filePath = `${doctorId}/${fileName}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('xinote-reports')
      .upload(filePath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true
      });

    if (error) throw new Error(`Failed to upload PDF: ${error.message}`);

    // Get public URL (if bucket is public) or signed URL
    const { data: urlData } = supabase.storage
      .from('xinote-reports')
      .getPublicUrl(filePath);

    logger.info('[Report] PDF uploaded to storage', {
      reportId,
      path: filePath,
      url: urlData.publicUrl
    });

    return urlData.publicUrl;

  } catch (error) {
    logger.error('[Report] Failed to upload PDF', {
      reportId,
      error: error.message
    });
    throw error;
  }
}

/**
 * Log audit event
 */
async function logAuditEvent(doctorId, action, resourceId, success, errorMessage = null) {
  try {
    await supabase
      .from('audit_log')
      .insert({
        doctor_id: doctorId,
        action,
        resource_type: 'report',
        resource_id: resourceId,
        success,
        error_message: errorMessage,
        timestamp: new Date().toISOString()
      });
  } catch (error) {
    logger.error('[Report] Failed to log audit event', { error: error.message });
    // Don't throw - audit logging should not block the main flow
  }
}

/**
 * Get report status
 */
async function getReportStatus(reportId) {
  try {
    const { data, error } = await supabase
      .from('report_metadata')
      .select('*')
      .eq('report_id', reportId)
      .single();

    if (error) throw new Error(`Failed to fetch report status: ${error.message}`);

    return data;

  } catch (error) {
    logger.error('[Report] Failed to get report status', {
      reportId,
      error: error.message
    });
    throw error;
  }
}

/**
 * Get all reports for a doctor
 */
async function getDoctorReports(doctorId, limit = 50) {
  try {
    const { data, error } = await supabase
      .from('report_metadata')
      .select('*')
      .eq('doctor_id', doctorId)
      .order('requested_at', { ascending: false })
      .limit(limit);

    if (error) throw new Error(`Failed to fetch doctor reports: ${error.message}`);

    return data;

  } catch (error) {
    logger.error('[Report] Failed to get doctor reports', {
      doctorId,
      error: error.message
    });
    throw error;
  }
}

module.exports = {
  generateReport,
  getReportStatus,
  getDoctorReports,
  generateReportId
};