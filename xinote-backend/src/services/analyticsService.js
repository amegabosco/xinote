/**
 * Analytics Service
 * Provides statistics and metrics for admin dashboard
 */

const { createClient } = require('@supabase/supabase-js');
const logger = require('../utils/logger');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Get overall system statistics
 */
async function getSystemStats() {
  try {
    const [doctors, patients, recordings, transcriptions, reports] = await Promise.all([
      supabase.from('doctors').select('id', { count: 'exact', head: true }),
      supabase.from('patients').select('id', { count: 'exact', head: true }),
      supabase.from('recordings').select('id', { count: 'exact', head: true }),
      supabase.from('transcriptions').select('id', { count: 'exact', head: true }),
      supabase.from('report_metadata').select('id', { count: 'exact', head: true }),
    ]);

    return {
      totalDoctors: doctors.count || 0,
      totalPatients: patients.count || 0,
      totalRecordings: recordings.count || 0,
      totalTranscriptions: transcriptions.count || 0,
      totalReports: reports.count || 0,
    };
  } catch (error) {
    logger.error('[Analytics] Failed to get system stats', { error: error.message });
    throw error;
  }
}

/**
 * Get doctor activity statistics
 */
async function getDoctorActivity(timeRange = '7d') {
  try {
    const daysAgo = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysAgo);

    const { data, error } = await supabase
      .from('recordings')
      .select('doctor_id, created_at')
      .gte('created_at', startDate.toISOString());

    if (error) throw error;

    // Group by doctor
    const activityByDoctor = data.reduce((acc, record) => {
      if (!acc[record.doctor_id]) {
        acc[record.doctor_id] = 0;
      }
      acc[record.doctor_id]++;
      return acc;
    }, {});

    return activityByDoctor;
  } catch (error) {
    logger.error('[Analytics] Failed to get doctor activity', { error: error.message });
    throw error;
  }
}

/**
 * Get recording statistics by time period
 */
async function getRecordingTrends(timeRange = '30d') {
  try {
    const daysAgo = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysAgo);

    const { data, error } = await supabase
      .from('recordings')
      .select('created_at, duration_seconds, status')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true });

    if (error) throw error;

    // Group by day
    const trendsByDay = {};
    data.forEach(record => {
      const day = record.created_at.split('T')[0];
      if (!trendsByDay[day]) {
        trendsByDay[day] = {
          count: 0,
          totalDuration: 0,
          completed: 0,
          error: 0,
        };
      }
      trendsByDay[day].count++;
      trendsByDay[day].totalDuration += record.duration_seconds || 0;
      if (record.status === 'completed') trendsByDay[day].completed++;
      if (record.status === 'error') trendsByDay[day].error++;
    });

    return trendsByDay;
  } catch (error) {
    logger.error('[Analytics] Failed to get recording trends', { error: error.message });
    throw error;
  }
}

/**
 * Get report generation statistics
 */
async function getReportStats() {
  try {
    const { data, error } = await supabase
      .from('report_metadata')
      .select('generation_status, ai_processing_time_ms, pdf_generation_time_ms, created_at');

    if (error) throw error;

    const stats = {
      total: data.length,
      completed: data.filter(r => r.generation_status === 'completed').length,
      processing: data.filter(r => r.generation_status === 'processing').length,
      error: data.filter(r => r.generation_status === 'error').length,
      avgAiTime: 0,
      avgPdfTime: 0,
    };

    const completedReports = data.filter(r => r.generation_status === 'completed');
    if (completedReports.length > 0) {
      stats.avgAiTime = Math.round(
        completedReports.reduce((sum, r) => sum + (r.ai_processing_time_ms || 0), 0) / completedReports.length
      );
      stats.avgPdfTime = Math.round(
        completedReports.reduce((sum, r) => sum + (r.pdf_generation_time_ms || 0), 0) / completedReports.length
      );
    }

    return stats;
  } catch (error) {
    logger.error('[Analytics] Failed to get report stats', { error: error.message });
    throw error;
  }
}

/**
 * Get storage usage statistics
 */
async function getStorageStats() {
  try {
    const { data: recordings, error: recError } = await supabase
      .from('recordings')
      .select('file_size_bytes');

    if (recError) throw recError;

    const { data: reports, error: repError } = await supabase
      .from('report_metadata')
      .select('pdf_file_size_bytes');

    if (repError) throw repError;

    const audioStorage = recordings.reduce((sum, r) => sum + (r.file_size_bytes || 0), 0);
    const pdfStorage = reports.reduce((sum, r) => sum + (r.pdf_file_size_bytes || 0), 0);

    return {
      audioStorageBytes: audioStorage,
      pdfStorageBytes: pdfStorage,
      totalStorageBytes: audioStorage + pdfStorage,
      audioStorageMB: Math.round(audioStorage / (1024 * 1024) * 100) / 100,
      pdfStorageMB: Math.round(pdfStorage / (1024 * 1024) * 100) / 100,
      totalStorageMB: Math.round((audioStorage + pdfStorage) / (1024 * 1024) * 100) / 100,
    };
  } catch (error) {
    logger.error('[Analytics] Failed to get storage stats', { error: error.message });
    throw error;
  }
}

/**
 * Get top active doctors
 */
async function getTopDoctors(limit = 10) {
  try {
    const { data, error } = await supabase.rpc('get_top_doctors', { limit_count: limit });

    if (error) throw error;

    return data || [];
  } catch (error) {
    // If function doesn't exist, fall back to manual query
    logger.warn('[Analytics] RPC function not available, using fallback');

    const { data, error: queryError } = await supabase
      .from('recordings')
      .select('doctor_id, doctors(full_name, email)')
      .limit(1000);

    if (queryError) throw queryError;

    // Group and count manually
    const doctorCounts = {};
    data.forEach(record => {
      const doctorId = record.doctor_id;
      if (!doctorCounts[doctorId]) {
        doctorCounts[doctorId] = {
          doctor_id: doctorId,
          full_name: record.doctors?.full_name || 'Unknown',
          email: record.doctors?.email || '',
          recording_count: 0,
        };
      }
      doctorCounts[doctorId].recording_count++;
    });

    return Object.values(doctorCounts)
      .sort((a, b) => b.recording_count - a.recording_count)
      .slice(0, limit);
  }
}

module.exports = {
  getSystemStats,
  getDoctorActivity,
  getRecordingTrends,
  getReportStats,
  getStorageStats,
  getTopDoctors,
};
