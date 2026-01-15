/// Report Metadata Model
/// Represents a generated medical report with status tracking
class ReportMetadata {
  final String reportId;
  final String recordingId;
  final String status; // processing, completed, error, cancelled
  final String? pdfUrl;
  final int? pdfSizeBytes;
  final DateTime requestedAt;
  final DateTime? completedAt;
  final int? processingTimeMs;
  final String? errorMessage;

  ReportMetadata({
    required this.reportId,
    required this.recordingId,
    required this.status,
    this.pdfUrl,
    this.pdfSizeBytes,
    required this.requestedAt,
    this.completedAt,
    this.processingTimeMs,
    this.errorMessage,
  });

  /// Create ReportMetadata from JSON response
  factory ReportMetadata.fromJson(Map<String, dynamic> json) {
    return ReportMetadata(
      reportId: json['report_id'] ?? '',
      recordingId: json['recording_id'] ?? '',
      status: json['status'] ?? 'processing',
      pdfUrl: json['pdf_url'],
      pdfSizeBytes: json['pdf_size_bytes'],
      requestedAt: json['requested_at'] != null
          ? DateTime.parse(json['requested_at'])
          : DateTime.now(),
      completedAt: json['completed_at'] != null
          ? DateTime.parse(json['completed_at'])
          : null,
      processingTimeMs: json['processing_time_ms'],
      errorMessage: json['error_message'],
    );
  }

  /// Convert to JSON
  Map<String, dynamic> toJson() {
    return {
      'report_id': reportId,
      'recording_id': recordingId,
      'status': status,
      'pdf_url': pdfUrl,
      'pdf_size_bytes': pdfSizeBytes,
      'requested_at': requestedAt.toIso8601String(),
      'completed_at': completedAt?.toIso8601String(),
      'processing_time_ms': processingTimeMs,
      'error_message': errorMessage,
    };
  }

  /// Status check helpers
  bool get isCompleted => status == 'completed';
  bool get isProcessing => status == 'processing';
  bool get hasError => status == 'error';
  bool get isCancelled => status == 'cancelled';

  /// Get user-friendly status display
  String get statusDisplay {
    switch (status) {
      case 'processing':
        return 'Génération en cours...';
      case 'completed':
        return 'Rapport prêt';
      case 'error':
        return 'Erreur';
      case 'cancelled':
        return 'Annulé';
      default:
        return status;
    }
  }

  /// Get status icon
  String get statusIcon {
    switch (status) {
      case 'processing':
        return '⏳';
      case 'completed':
        return '✅';
      case 'error':
        return '❌';
      case 'cancelled':
        return '🚫';
      default:
        return '❓';
    }
  }

  /// Format file size for display
  String get formattedSize {
    if (pdfSizeBytes == null) return 'N/A';

    final bytes = pdfSizeBytes!;
    if (bytes < 1024) return '$bytes B';
    if (bytes < 1024 * 1024) return '${(bytes / 1024).toStringAsFixed(1)} KB';
    return '${(bytes / (1024 * 1024)).toStringAsFixed(2)} MB';
  }

  /// Format processing time for display
  String get formattedProcessingTime {
    if (processingTimeMs == null) return 'N/A';

    final seconds = processingTimeMs! / 1000;
    if (seconds < 60) return '${seconds.toStringAsFixed(1)}s';

    final minutes = seconds / 60;
    return '${minutes.toStringAsFixed(1)}m';
  }

  /// Copy with method for updating fields
  ReportMetadata copyWith({
    String? reportId,
    String? recordingId,
    String? status,
    String? pdfUrl,
    int? pdfSizeBytes,
    DateTime? requestedAt,
    DateTime? completedAt,
    int? processingTimeMs,
    String? errorMessage,
  }) {
    return ReportMetadata(
      reportId: reportId ?? this.reportId,
      recordingId: recordingId ?? this.recordingId,
      status: status ?? this.status,
      pdfUrl: pdfUrl ?? this.pdfUrl,
      pdfSizeBytes: pdfSizeBytes ?? this.pdfSizeBytes,
      requestedAt: requestedAt ?? this.requestedAt,
      completedAt: completedAt ?? this.completedAt,
      processingTimeMs: processingTimeMs ?? this.processingTimeMs,
      errorMessage: errorMessage ?? this.errorMessage,
    );
  }

  @override
  String toString() {
    return 'ReportMetadata(reportId: $reportId, status: $status, pdfUrl: $pdfUrl)';
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;

    return other is ReportMetadata &&
        other.reportId == reportId &&
        other.recordingId == recordingId &&
        other.status == status;
  }

  @override
  int get hashCode {
    return reportId.hashCode ^ recordingId.hashCode ^ status.hashCode;
  }
}
