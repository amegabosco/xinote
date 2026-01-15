/**
 * AI Content Extraction Service
 * Extracts structured medical report data from transcriptions using OpenAI GPT-4
 */

const OpenAI = require('openai');
const logger = require('../utils/logger');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Extract structured content from medical transcription
 * @param {string} transcription - The medical transcription text
 * @param {string} examType - Type of medical examination
 * @param {string} language - Language of the transcription (default: 'fr')
 * @returns {Promise<Object>} Structured report data
 */
async function extractMedicalContent(transcription, examType = '', language = 'fr') {
  const startTime = Date.now();

  try {
    logger.info('[AI] Starting content extraction', {
      examType,
      transcriptionLength: transcription.length,
      language
    });

    const systemPrompt = buildSystemPrompt(language);
    const userPrompt = buildUserPrompt(transcription, examType, language);

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3, // Low temperature for medical accuracy
      max_tokens: 2000
    });

    const content = JSON.parse(response.choices[0].message.content);
    const processingTime = Date.now() - startTime;

    logger.info('[AI] Content extraction completed', {
      processingTime,
      observationsCount: content.observations?.length || 0,
      hasAnalysis: !!content.analysis_summary,
      hasConclusion: !!content.medical_conclusion
    });

    // Validate extracted content
    validateExtractedContent(content);

    return {
      observations: content.observations || [],
      analysis_summary: content.analysis_summary || '',
      medical_conclusion: content.medical_conclusion || '',
      extracted_medical_terms: content.extracted_medical_terms || [],
      processing_time_ms: processingTime,
      tokens_used: response.usage.total_tokens,
      model: response.model
    };

  } catch (error) {
    logger.error('[AI] Content extraction failed', {
      error: error.message,
      stack: error.stack
    });
    throw new Error(`AI extraction failed: ${error.message}`);
  }
}

/**
 * Build system prompt based on language
 */
function buildSystemPrompt(language) {
  const prompts = {
    fr: `Vous êtes un assistant médical expert qui extrait et structure les informations de transcriptions médicales.

Votre rôle:
- Analyser les transcriptions médicales dictées par des médecins
- Extraire les observations clés, l'analyse et la conclusion
- Maintenir la terminologie médicale exacte
- Structurer les informations de manière claire et professionnelle
- Respecter les normes médicales françaises

Règles importantes:
- Ne jamais inventer ou ajouter d'informations non présentes dans la transcription
- Conserver la terminologie médicale exacte
- Formater les observations en phrases complètes
- Utiliser un langage médical professionnel
- Si des informations sont manquantes, indiquer "Information non disponible dans la transcription"`,

    en: `You are an expert medical assistant that extracts and structures information from medical transcriptions.

Your role:
- Analyze medical transcriptions dictated by doctors
- Extract key observations, analysis, and conclusion
- Maintain exact medical terminology
- Structure information clearly and professionally
- Respect medical standards

Important rules:
- Never invent or add information not present in the transcription
- Preserve exact medical terminology
- Format observations as complete sentences
- Use professional medical language
- If information is missing, indicate "Information not available in transcription"`
  };

  return prompts[language] || prompts.fr;
}

/**
 * Build user prompt based on language
 */
function buildUserPrompt(transcription, examType, language) {
  const prompts = {
    fr: `Extrayez les informations structurées de cette transcription médicale:

Transcription: "${transcription}"
Type d'examen: ${examType || 'Non spécifié'}

Retournez un objet JSON avec:
1. "observations": Tableau de points d'observation détaillés (5-15 items selon le contenu)
   - Chaque observation doit être une phrase complète
   - Inclure les détails anatomiques, mesures, et constats
   - Maintenir l'ordre logique de l'examen

2. "analysis_summary": Un paragraphe synthétisant les principales découvertes
   - Résumer les observations importantes
   - Mettre en évidence les éléments normaux et anormaux
   - Contexte médical global

3. "medical_conclusion": Paragraphe de conclusion finale avec diagnostic/recommandation
   - Interprétation médicale globale
   - Diagnostic différentiel si applicable
   - Recommandations ou suivi si mentionné

4. "extracted_medical_terms": Tableau des termes médicaux clés trouvés dans la transcription

Format JSON strict requis.`,

    en: `Extract structured information from this medical transcription:

Transcription: "${transcription}"
Exam Type: ${examType || 'Not specified'}

Return a JSON object with:
1. "observations": Array of detailed observation bullet points (5-15 items based on content)
   - Each observation must be a complete sentence
   - Include anatomical details, measurements, and findings
   - Maintain logical exam order

2. "analysis_summary": One paragraph synthesizing main findings
   - Summarize important observations
   - Highlight normal and abnormal elements
   - Global medical context

3. "medical_conclusion": Final conclusion paragraph with diagnosis/recommendation
   - Overall medical interpretation
   - Differential diagnosis if applicable
   - Recommendations or follow-up if mentioned

4. "extracted_medical_terms": Array of key medical terms found in transcription

Strict JSON format required.`
  };

  return prompts[language] || prompts.fr;
}

/**
 * Validate extracted content structure
 */
function validateExtractedContent(content) {
  if (!content || typeof content !== 'object') {
    throw new Error('Invalid content structure returned by AI');
  }

  if (!Array.isArray(content.observations)) {
    throw new Error('Observations must be an array');
  }

  if (typeof content.analysis_summary !== 'string') {
    throw new Error('Analysis summary must be a string');
  }

  if (typeof content.medical_conclusion !== 'string') {
    throw new Error('Medical conclusion must be a string');
  }

  // Warn if content seems too short
  if (content.observations.length < 2) {
    logger.warn('[AI] Very few observations extracted', {
      count: content.observations.length
    });
  }

  if (content.analysis_summary.length < 50) {
    logger.warn('[AI] Analysis summary seems too short', {
      length: content.analysis_summary.length
    });
  }
}

/**
 * Test the AI extraction service with sample data
 */
async function testExtraction() {
  const sampleTranscription = `
De l'avent barité. Nom du patient: Kokoroko Lalibon, âge de 2 ans, sexe masculin.
Médecin prescripteur: docteur Hila. Indication: ballonnement.
Technique: Réalisation de l'abdomen sans préparation puis l'avent barité en double contraste.
Résultat: Cliché d'abdomen sans préparation. Absence de lésions visibles spontanément dans la cavité abdominale.
Après opacification: progression convenable de la colonne barité jusqu'au bas fonciocale sans obstacle observé.
Franchissement de la valvule de bourrin avec une inondation déscrite.
Le cadre colique apparaît normal avec un aspect discrètement tortué du sigmoïde sans véritable boucle individualisée.
Le calibre est normal de même que le relief austral. Absence d'anomalie de plage intermarginale. Absence de processus.
  `;

  try {
    const result = await extractMedicalContent(sampleTranscription, 'Radiographie', 'fr');
    logger.info('[AI] Test extraction successful', { result });
    return result;
  } catch (error) {
    logger.error('[AI] Test extraction failed', { error: error.message });
    throw error;
  }
}

module.exports = {
  extractMedicalContent,
  testExtraction
};
