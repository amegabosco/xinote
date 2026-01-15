import 'package:flutter/material.dart';
import 'package:open_file/open_file.dart';
import '../models/report_history.dart';
import '../services/report_generator_service.dart';
import '../utils/app_logger.dart';

/// Floating Action Button widget for generating PDF reports
///
/// Usage:
/// ```dart
/// floatingActionButton: GenerateReportButton(
///   recordingId: widget.report.recordingId,
///   patientName: widget.report.patientName,
/// )
/// ```
class GenerateReportButton extends StatefulWidget {
  final String? recordingId;
  final String? patientName;
  final ReportHistory? report;

  const GenerateReportButton({
    super.key,
    this.recordingId,
    this.patientName,
    this.report,
  });

  @override
  State<GenerateReportButton> createState() => _GenerateReportButtonState();
}

class _GenerateReportButtonState extends State<GenerateReportButton> {
  bool _isGenerating = false;

  Future<void> _generateAndViewReport() async {
    // Get recording ID from either direct prop or report
    final recordingId = widget.recordingId ?? widget.report?.reportId;

    if (recordingId == null) {
      _showErrorSnackBar('ID de l\'enregistrement manquant');
      return;
    }

    setState(() => _isGenerating = true);

    try {
      logger.info('Starting report generation for recording: $recordingId');

      // Show loading dialog
      if (mounted) {
        showDialog(
          context: context,
          barrierDismissible: false,
          builder: (context) => const ReportGenerationDialog(),
        );
      }

      // Step 1: Request report generation
      final report = await ReportGeneratorService.generateReport(recordingId);
      logger.info('Report generation initiated: ${report.reportId}');

      // Step 2: Poll until completion (with timeout)
      final completedReport = await ReportGeneratorService.pollUntilComplete(
        report.reportId,
        maxAttempts: 60, // 2 minutes max
        intervalSeconds: 2,
      );

      // Close loading dialog
      if (mounted) Navigator.of(context).pop();

      logger.info('Report completed: ${completedReport.reportId}');

      // Step 3: Download and view PDF
      if (completedReport.pdfUrl != null) {
        await _downloadAndViewPdf(completedReport.reportId, completedReport.pdfUrl!);
      } else {
        throw Exception('PDF URL non disponible');
      }

      // Show success message
      if (mounted) {
        _showSuccessSnackBar('Rapport généré avec succès!');
      }
    } catch (e) {
      // Close loading dialog if still open
      if (mounted && Navigator.canPop(context)) {
        Navigator.of(context).pop();
      }

      logger.error('Report generation failed: $e');
      if (mounted) {
        _showErrorSnackBar('Erreur: ${e.toString()}');
      }
    } finally {
      if (mounted) {
        setState(() => _isGenerating = false);
      }
    }
  }

  Future<void> _downloadAndViewPdf(String reportId, String pdfUrl) async {
    try {
      logger.info('Downloading PDF for report: $reportId');

      // Download (or get from cache)
      final pdfFile = await ReportGeneratorService.getOrDownloadReport(reportId, pdfUrl);

      logger.info('Opening PDF: ${pdfFile.path}');

      // Open PDF with system viewer
      final result = await OpenFile.open(pdfFile.path);

      if (result.type != ResultType.done) {
        throw Exception('Impossible d\'ouvrir le PDF: ${result.message}');
      }
    } catch (e) {
      logger.error('Failed to open PDF: $e');
      rethrow;
    }
  }

  void _showSuccessSnackBar(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            const Icon(Icons.check_circle, color: Colors.white),
            const SizedBox(width: 12),
            Expanded(child: Text(message)),
          ],
        ),
        backgroundColor: Colors.green[600],
        duration: const Duration(seconds: 3),
        action: SnackBarAction(
          label: 'OK',
          textColor: Colors.white,
          onPressed: () {},
        ),
      ),
    );
  }

  void _showErrorSnackBar(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            const Icon(Icons.error_outline, color: Colors.white),
            const SizedBox(width: 12),
            Expanded(child: Text(message)),
          ],
        ),
        backgroundColor: Colors.red[600],
        duration: const Duration(seconds: 5),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return FloatingActionButton.extended(
      onPressed: _isGenerating ? null : _generateAndViewReport,
      backgroundColor: _isGenerating ? Colors.grey : Colors.blue[700],
      icon: _isGenerating
          ? const SizedBox(
              width: 20,
              height: 20,
              child: CircularProgressIndicator(
                color: Colors.white,
                strokeWidth: 2,
              ),
            )
          : const Icon(Icons.picture_as_pdf),
      label: Text(_isGenerating ? 'Génération...' : 'Générer PDF'),
    );
  }
}

/// Loading dialog shown during report generation
class ReportGenerationDialog extends StatelessWidget {
  const ReportGenerationDialog({super.key});

  @override
  Widget build(BuildContext context) {
    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const CircularProgressIndicator(),
            const SizedBox(height: 24),
            const Text(
              'Génération du rapport',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 12),
            Text(
              'Analyse de la transcription...',
              style: TextStyle(
                fontSize: 14,
                color: Colors.grey[600],
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              'Cela peut prendre 10-30 secondes',
              style: TextStyle(
                fontSize: 12,
                color: Colors.grey[500],
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}
