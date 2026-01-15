/**
 * PDF Generation Service
 * Generates professional PDF medical reports using Puppeteer
 */

const puppeteer = require('puppeteer');
const logger = require('../utils/logger');
const path = require('path');
const fs = require('fs').promises;

/**
 * Generate PDF from report data
 * @param {Object} reportData - Complete report data
 * @returns {Promise<Buffer>} PDF buffer
 */
async function generatePDF(reportData) {
  const startTime = Date.now();
  let browser = null;

  try {
    logger.info('[PDF] Starting PDF generation', {
      reportId: reportData.reportId,
      patientId: reportData.patientId
    });

    // Generate HTML from template
    const html = await generateHTML(reportData);

    // Launch Puppeteer
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    });

    const page = await browser.newPage();
    await page.setContent(html, {
      waitUntil: 'networkidle0'
    });

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        bottom: '20mm',
        left: '15mm',
        right: '15mm'
      },
      displayHeaderFooter: false,
      preferCSSPageSize: true
    });

    await browser.close();
    browser = null;

    const processingTime = Date.now() - startTime;

    logger.info('[PDF] PDF generation completed', {
      reportId: reportData.reportId,
      processingTime,
      pdfSize: pdfBuffer.length
    });

    return pdfBuffer;

  } catch (error) {
    logger.error('[PDF] PDF generation failed', {
      error: error.message,
      stack: error.stack
    });

    if (browser) {
      await browser.close();
    }

    throw new Error(`PDF generation failed: ${error.message}`);
  }
}

/**
 * Generate HTML from report data
 */
async function generateHTML(data) {
  const {
    reportId,
    patientId,
    patientName,
    patientAge,
    patientGender,
    examType,
    observations = [],
    analysisSummary,
    medicalConclusion,
    transcription,
    doctorName,
    structure,
    examDate,
    generationDate
  } = data;

  // Format dates
  const examDateFormatted = formatDate(new Date(examDate));
  const generationDateFormatted = formatDate(new Date(generationDate || Date.now()));

  // Generate observations HTML
  const observationsHTML = observations.map(obs =>
    `<li>${escapeHTML(obs)}</li>`
  ).join('\n');

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Rapport d'examen médical - ${reportId}</title>
  <style>
    @page {
      size: A4;
      margin: 0;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Arial', sans-serif;
      line-height: 1.6;
      color: #2c3e50;
      font-size: 11pt;
      background: white;
    }

    .page {
      width: 100%;
      min-height: 297mm;
      padding: 20mm 15mm;
      background: white;
    }

    .header {
      background-color: #34495e;
      color: white;
      padding: 20px;
      text-align: center;
      margin: -20mm -15mm 20px -15mm;
      page-break-after: avoid;
    }

    .header h1 {
      font-size: 20pt;
      margin-bottom: 5px;
      font-weight: 600;
    }

    .subtitle {
      font-size: 12pt;
      opacity: 0.9;
    }

    .section {
      margin-bottom: 25px;
      page-break-inside: avoid;
    }

    .section-title {
      font-size: 14pt;
      color: #2c3e50;
      border-bottom: 2px solid #3498db;
      padding-bottom: 5px;
      margin-bottom: 12px;
      font-weight: bold;
      page-break-after: avoid;
    }

    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      background-color: #ecf0f1;
      padding: 12px;
      border-radius: 4px;
      margin-bottom: 20px;
    }

    .info-item {
      padding: 4px 0;
    }

    .info-item strong {
      font-weight: 600;
    }

    .exam-table {
      width: 100%;
      background: #34495e;
      color: white;
      border-radius: 4px;
      overflow: hidden;
      margin-bottom: 15px;
    }

    .exam-header {
      padding: 10px 15px;
      font-weight: 600;
      font-size: 12pt;
    }

    .exam-body {
      background: white;
      color: #2c3e50;
    }

    .exam-body ul {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .exam-body li {
      padding: 8px 15px;
      border-bottom: 1px solid #ecf0f1;
    }

    .exam-body li:before {
      content: "• ";
      color: #3498db;
      font-weight: bold;
      margin-right: 8px;
    }

    .exam-body li:last-child {
      border-bottom: none;
    }

    .highlight-box {
      background-color: #e3f2fd;
      border-left: 4px solid #2196f3;
      padding: 15px;
      margin: 10px 0;
      border-radius: 0 4px 4px 0;
    }

    .success-box {
      background-color: #d4edda;
      border-left: 4px solid #28a745;
      padding: 15px;
      margin: 10px 0;
      border-radius: 0 4px 4px 0;
    }

    .transcription-box {
      background-color: #f8f9fa;
      padding: 15px;
      border-radius: 4px;
      font-size: 10pt;
      line-height: 1.5;
      max-height: 400px;
      overflow: hidden;
    }

    .footer-info {
      background-color: #34495e;
      color: white;
      padding: 12px 20px;
      margin: 30px -15mm -20mm -15mm;
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 10px;
      text-align: center;
      font-size: 10pt;
    }

    .footer-section {
      padding: 5px;
    }

    .footer-label {
      font-weight: 600;
      display: block;
      margin-bottom: 3px;
    }

    .page-number {
      text-align: center;
      margin-top: 20px;
      font-size: 9pt;
      color: #7f8c8d;
    }
  </style>
</head>
<body>
  <div class="page">
    <!-- Header -->
    <div class="header">
      <h1>Rapport d'examen médical</h1>
      <div class="subtitle">généré par xiNotes - Version 1.0.0 Adowe</div>
    </div>

    <!-- Patient Information -->
    <div class="section">
      <div class="section-title">1. Informations Patient</div>
      <div class="info-grid">
        <div class="info-item"><strong>ID du patient :</strong> ${escapeHTML(patientId)}</div>
        <div class="info-item"><strong>Nom :</strong> ${escapeHTML(patientName)}</div>
        <div class="info-item"><strong>Âge :</strong> ${escapeHTML(patientAge)}</div>
        <div class="info-item"><strong>Sexe :</strong> ${escapeHTML(patientGender)}</div>
      </div>
    </div>

    <!-- Exam Details -->
    <div class="section">
      <div class="section-title">2. Détails de l'examen</div>
      <div class="exam-table">
        <div class="exam-header">${escapeHTML(examType || 'Examen médical')}</div>
        <div class="exam-body">
          <ul>
            ${observationsHTML || '<li>Aucune observation disponible</li>'}
          </ul>
        </div>
      </div>
    </div>

    <!-- Analysis Results -->
    <div class="section">
      <div class="section-title">3. Résultats de l'analyse</div>
      <div class="highlight-box">
        ${escapeHTML(analysisSummary || 'Analyse en cours...')}
      </div>
    </div>

    <!-- Medical Conclusion -->
    <div class="section">
      <div class="section-title">4. Conclusion médicale</div>
      <div class="success-box">
        ${escapeHTML(medicalConclusion || 'Conclusion à venir...')}
      </div>
    </div>

    <!-- Audio Transcription -->
    <div class="section">
      <div class="section-title">5. Transcription audio</div>
      <div class="transcription-box">
        ${escapeHTML(transcription || 'Transcription non disponible')}
      </div>
    </div>

    <!-- Footer with metadata -->
    <div class="footer-info">
      <div class="footer-section">
        <span class="footer-label">${escapeHTML(structure || 'Structure médicale')}</span>
      </div>
      <div class="footer-section">
        <span class="footer-label">${escapeHTML(doctorName || 'Médecin')}</span>
      </div>
      <div class="footer-section">
        <span class="footer-label">Date de l'examen : ${examDateFormatted}</span>
      </div>
    </div>

    <div class="footer-info" style="margin-top: 10px; background-color: #2c3e50;">
      <div class="footer-section" style="grid-column: 1 / -1;">
        Date de génération du rapport : ${generationDateFormatted}
      </div>
    </div>

    <div class="page-number">Rapport Médical - Page 1 sur 2</div>
  </div>
</body>
</html>`;

  return html;
}

/**
 * Format date to French format (DD/MM/YYYY)
 */
function formatDate(date) {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Escape HTML special characters
 */
function escapeHTML(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/\n/g, '<br>');
}

/**
 * Test PDF generation
 */
async function testPDFGeneration() {
  const testData = {
    reportId: 'R-01151530-TEST01',
    patientId: 'PAT-20250115-1234-TEST',
    patientName: 'Test Patient',
    patientAge: '45 ans',
    patientGender: 'Masculin',
    examType: 'Radiographie',
    observations: [
      'Absence de lésions visibles spontanément dans la cavité abdominale',
      'Progression adéquate du baryte jusqu\'au bas du côlon sans obstacle observé',
      'Aspect normal du cadre colique',
      'Calibre normal et relief normal des anses'
    ],
    analysisSummary: 'Les observations montrent une progression normale sans anomalies significatives.',
    medicalConclusion: 'L\'examen radiologique démontre des résultats normaux, sans anomalies à signaler.',
    transcription: 'Transcription de test pour validation du système de génération de rapports.',
    doctorName: 'Dr. Test',
    structure: 'Hôpital de Test',
    examDate: new Date().toISOString(),
    generationDate: new Date().toISOString()
  };

  try {
    const pdfBuffer = await generatePDF(testData);
    logger.info('[PDF] Test generation successful', { size: pdfBuffer.length });
    return pdfBuffer;
  } catch (error) {
    logger.error('[PDF] Test generation failed', { error: error.message });
    throw error;
  }
}

module.exports = {
  generatePDF,
  testPDFGeneration
};
