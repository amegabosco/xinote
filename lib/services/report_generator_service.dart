import 'dart:io';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:path_provider/path_provider.dart';
import '../models/report_metadata.dart';
import '../utils/app_logger.dart';
import 'xinote_api_service.dart';

/// Report Generator Service
/// Handles medical report generation, status tracking, and PDF downloads
class ReportGeneratorService {
  static const String _tag = 'ReportGeneratorService';
  static const String baseUrl = XinoteApiService.baseUrl;

  /// Make authenticated API request
  static Future<Map<String, dynamic>> _makeRequest(
    String method,
    String endpoint, {
    Map<String, dynamic>? body,
  }) async {
    try {
      final headers = <String, String>{
        'Content-Type': 'application/json',
      };

      // Get auth headers
      final doctorId = await XinoteApiService.getDoctorId();
      if (doctorId != null) {
        headers['x-doctor-id'] = doctorId;
      }

      final uri = Uri.parse('$baseUrl/api/v1$endpoint');

      http.Response response;
      if (method == 'POST') {
        response = await http.post(
          uri,
          headers: headers,
          body: body != null ? jsonEncode(body) : null,
        );
      } else {
        response = await http.get(uri, headers: headers);
      }

      if (response.statusCode == 200 || response.statusCode == 201) {
        return jsonDecode(response.body);
      } else {
        final error = jsonDecode(response.body);
        throw Exception(error['error']?['message'] ?? 'Request failed: ${response.statusCode}');
      }
    } catch (e) {
      logger.error('API request failed: $e');
      rethrow;
    }
  }

  /// Request report generation for a recording
  ///
  /// [recordingId] - UUID of the recording to generate report for
  /// Returns [ReportMetadata] with report_id and initial status
  static Future<ReportMetadata> generateReport(String recordingId) async {
    try {
      logger.info('Requesting report generation for recording: $recordingId');

      final response = await _makeRequest(
        'POST',
        '/reports/generate',
        body: {'recording_id': recordingId},
      );

      if (response['success'] == true) {
        final reportData = response['data'];
        logger.info('Report generation started: ${reportData['report_id']}');

        return ReportMetadata.fromJson(reportData);
      } else {
        final errorMsg = response['error']?['message'] ?? 'Unknown error';
        throw Exception(errorMsg);
      }
    } catch (e, stackTrace) {
      logger.error('Failed to generate report: $e', e, stackTrace);
      throw Exception('Échec de la génération du rapport: $e');
    }
  }

  /// Check report generation status
  ///
  /// [reportId] - Report ID (format: R-MMDDHHMM-XXXXXX)
  /// Returns [ReportMetadata] with current status
  static Future<ReportMetadata> getReportStatus(String reportId) async {
    try {
      logger.info('Checking status for report: $reportId');

      final response = await _makeRequest('GET', '/reports/$reportId/status');

      if (response['success'] == true) {
        final reportData = response['data'];
        return ReportMetadata.fromJson(reportData);
      } else {
        final errorMsg = response['error']?['message'] ?? 'Unknown error';
        throw Exception(errorMsg);
      }
    } catch (e, stackTrace) {
      logger.error('Failed to get report status: $e', e, stackTrace);
      throw Exception('Échec de la récupération du statut: $e');
    }
  }

  /// Poll report status until completion or error
  ///
  /// [reportId] - Report ID to poll
  /// [maxAttempts] - Maximum number of polling attempts (default: 60)
  /// [intervalSeconds] - Seconds between polls (default: 2)
  /// Returns [ReportMetadata] when completed or throws on error/timeout
  static Future<ReportMetadata> pollUntilComplete(
    String reportId, {
    int maxAttempts = 60,
    int intervalSeconds = 2,
  }) async {
    logger.info('Polling report status: $reportId (max attempts: $maxAttempts)');

    for (int attempt = 1; attempt <= maxAttempts; attempt++) {
      final report = await getReportStatus(reportId);

      logger.info('Poll attempt $attempt: ${report.status}');

      if (report.isCompleted) {
        logger.info('Report completed: $reportId');
        return report;
      }

      if (report.hasError) {
        final errorMsg = report.errorMessage ?? 'Unknown error';
        logger.error('Report generation failed: $errorMsg');
        throw Exception('Génération échouée: $errorMsg');
      }

      if (report.isCancelled) {
        throw Exception('La génération du rapport a été annulée');
      }

      // Still processing, wait before next poll
      await Future.delayed(Duration(seconds: intervalSeconds));
    }

    // Timeout
    throw Exception('Délai d\'attente dépassé pour la génération du rapport');
  }

  /// Download report PDF to local storage
  ///
  /// [reportId] - Report ID
  /// [pdfUrl] - URL of the PDF file
  /// Returns [File] object pointing to downloaded PDF
  static Future<File> downloadReport(String reportId, String pdfUrl) async {
    try {
      logger.info('Downloading report PDF: $reportId');

      // Make HTTP request to download PDF
      final response = await http.get(Uri.parse(pdfUrl));

      if (response.statusCode == 200) {
        // Get reports directory
        final dir = await getApplicationDocumentsDirectory();
        final reportsDir = Directory('${dir.path}/reports');

        // Create reports directory if it doesn't exist
        if (!await reportsDir.exists()) {
          await reportsDir.create(recursive: true);
          logger.info('Created reports directory: ${reportsDir.path}');
        }

        // Save PDF file
        final file = File('${reportsDir.path}/$reportId.pdf');
        await file.writeAsBytes(response.bodyBytes);

        logger.info('Report downloaded: ${file.path} (${response.bodyBytes.length} bytes)');
        return file;
      } else {
        throw Exception('HTTP ${response.statusCode}: ${response.reasonPhrase}');
      }
    } catch (e, stackTrace) {
      logger.error('Failed to download report: $e', e, stackTrace);
      throw Exception('Échec du téléchargement du PDF: $e');
    }
  }

  /// Check if report PDF exists locally
  ///
  /// [reportId] - Report ID to check
  /// Returns [File] if exists, null otherwise
  static Future<File?> getLocalReport(String reportId) async {
    try {
      final dir = await getApplicationDocumentsDirectory();
      final file = File('${dir.path}/reports/$reportId.pdf');

      if (await file.exists()) {
        logger.info('Local report found: $reportId');
        return file;
      }

      return null;
    } catch (e) {
      logger.error('Error checking local report: $e');
      return null;
    }
  }

  /// Get or download report PDF
  ///
  /// Checks local storage first, downloads if not found
  /// [reportId] - Report ID
  /// [pdfUrl] - URL of the PDF file
  /// Returns [File] object
  static Future<File> getOrDownloadReport(String reportId, String pdfUrl) async {
    // Check if already downloaded
    final localFile = await getLocalReport(reportId);
    if (localFile != null) {
      logger.info('Using cached report: $reportId');
      return localFile;
    }

    // Download if not found locally
    logger.info('Report not cached, downloading: $reportId');
    return await downloadReport(reportId, pdfUrl);
  }

  /// Get all reports for current doctor
  ///
  /// [limit] - Maximum number of reports to fetch (default: 50, max: 100)
  /// Returns list of [ReportMetadata]
  static Future<List<ReportMetadata>> getDoctorReports({int limit = 50}) async {
    try {
      logger.info('Fetching doctor reports (limit: $limit)');

      final response = await _makeRequest('GET', '/reports?limit=$limit');

      if (response['success'] == true) {
        final reportsData = response['data']['reports'] as List;
        final reports = reportsData
            .map((json) => ReportMetadata.fromJson(json))
            .toList();

        logger.info('Fetched ${reports.length} reports');
        return reports;
      } else {
        final errorMsg = response['error']?['message'] ?? 'Unknown error';
        throw Exception(errorMsg);
      }
    } catch (e, stackTrace) {
      logger.error('Failed to fetch doctor reports: $e', e, stackTrace);
      throw Exception('Échec de la récupération des rapports: $e');
    }
  }

  /// Delete local report PDF
  ///
  /// [reportId] - Report ID to delete
  /// Returns true if deleted, false if not found
  static Future<bool> deleteLocalReport(String reportId) async {
    try {
      final dir = await getApplicationDocumentsDirectory();
      final file = File('${dir.path}/reports/$reportId.pdf');

      if (await file.exists()) {
        await file.delete();
        logger.info('Deleted local report: $reportId');
        return true;
      }

      return false;
    } catch (e) {
      logger.error('Failed to delete local report: $e');
      return false;
    }
  }

  /// Clear all local report PDFs
  ///
  /// Returns number of files deleted
  static Future<int> clearAllLocalReports() async {
    try {
      final dir = await getApplicationDocumentsDirectory();
      final reportsDir = Directory('${dir.path}/reports');

      if (!await reportsDir.exists()) {
        return 0;
      }

      final files = await reportsDir
          .list()
          .where((entity) => entity is File && entity.path.endsWith('.pdf'))
          .toList();

      int deletedCount = 0;
      for (final file in files) {
        try {
          await file.delete();
          deletedCount++;
        } catch (e) {
          logger.error('Failed to delete file: ${file.path}');
        }
      }

      logger.info('Cleared $deletedCount local report PDFs');
      return deletedCount;
    } catch (e) {
      logger.error('Failed to clear local reports: $e');
      return 0;
    }
  }

  /// Get total size of local report PDFs
  ///
  /// Returns size in bytes
  static Future<int> getLocalReportsSize() async {
    try {
      final dir = await getApplicationDocumentsDirectory();
      final reportsDir = Directory('${dir.path}/reports');

      if (!await reportsDir.exists()) {
        return 0;
      }

      int totalSize = 0;
      await for (final entity in reportsDir.list()) {
        if (entity is File && entity.path.endsWith('.pdf')) {
          final stat = await entity.stat();
          totalSize += stat.size;
        }
      }

      return totalSize;
    } catch (e) {
      logger.error('Failed to calculate local reports size: $e');
      return 0;
    }
  }
}
