/**
 * Document Processor — Central Pipeline Coordinator
 *
 * Single entry point for the entire document ingestion workflow:
 *   Pick File → Validate → Upload to Storage → Extract Text → Save Clean Text
 *   → AI Generation (Notes, Summary, Flashcards, Quiz, Revision) → Save Results
 *
 * Usage:
 *   const result = await processDocument(userId, fileAsset, {
 *     subject, topic, pdfExtractorRef, onProgress,
 *   });
 *   // result = { success: true, noteId: '...' } or { success: false, error: '...', step: '...' }
 */
import * as FileSystem from 'expo-file-system/legacy';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase/config';
import { addNote, updateNote } from '../firebase/services/notesService';
import { addFlashcards } from '../firebase/services/flashcardService';
import { createQuiz } from '../firebase/services/quizService';
import { generateContent } from './aiService';
import { extractDocx, extractPptx, extractLegacyBinary } from './extractors/officeExtractor';

// ─── Allowed MIME types and extensions ─────────────────────

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const ALLOWED_EXTENSIONS = ['.pdf', '.ppt', '.pptx', '.doc', '.docx'];

// ─── Main Pipeline ────────────────────────────────────────

/**
 * Process a document file through the full pipeline.
 *
 * @param {string} userId - Current user ID
 * @param {object} fileAsset - File asset from DocumentPicker (has uri, name, mimeType, size)
 * @param {object} options
 * @param {string}  options.subject - Subject for organizing the note
 * @param {string}  options.topic - Topic for organizing the note
 * @param {object}  options.pdfExtractorRef - React ref to PDFExtractorWebView component
 * @param {function} options.onProgress - Callback: (statusMessage: string) => void
 * @returns {Promise<{ success: boolean, noteId?: string, error?: string, step?: string }>}
 */
export async function processDocument(userId, fileAsset, options = {}) {
  const { subject = '', topic = '', pdfExtractorRef, onProgress } = options;
  const progress = (msg) => {
    console.log(`[DOC_PIPELINE] ${msg}`);
    if (onProgress) onProgress(msg);
  };

  try {
    // ─── Step 1/5: Validate ─────────────────────────────
    progress('Step 1/5: Validating file...');
    console.log('[DOC_PIPELINE] File selected:', JSON.stringify({
      uri: fileAsset.uri,
      name: fileAsset.name,
      mimeType: fileAsset.mimeType,
      size: fileAsset.size,
    }));

    const validation = validateFile(fileAsset);
    if (!validation.valid) {
      return { success: false, error: validation.error, step: 'validate' };
    }

    const { fileType, extractorType } = validation;
    console.log(`[DOC_PIPELINE] File validated: type=${fileType}, extractor=${extractorType}`);

    // ─── Step 2/5: Read file from URI ───────────────────
    progress('Step 2/5: Reading file from device...');

    let base64Data;
    try {
      base64Data = await FileSystem.readAsStringAsync(fileAsset.uri, {
        encoding: 'base64',
      });
    } catch (readErr) {
      console.error('[DOC_PIPELINE] FileSystem.readAsStringAsync failed:', readErr);
      return { success: false, error: `Failed to read file from device: ${readErr.message}`, step: 'read' };
    }

    if (!base64Data || base64Data.length === 0) {
      return { success: false, error: 'File read returned empty data', step: 'read' };
    }

    console.log(`[DOC_PIPELINE] File read success. Base64 length: ${base64Data.length}`);

    // ─── Step 3/5: Extract text ─────────────────────────
    progress('Step 3/5: Extracting text from document...');

    let extractionResult;
    try {
      extractionResult = await extractText(extractorType, base64Data, pdfExtractorRef, progress);
    } catch (extractErr) {
      console.error('[DOC_PIPELINE] Extraction failed:', extractErr);
      return { success: false, error: `Text extraction failed: ${extractErr.message}`, step: 'extract' };
    }

    const { text: cleanText, metadata: extractMeta } = extractionResult;
    console.log(`[DOC_PIPELINE] Extraction success. Characters: ${extractMeta.charCount}, Pages/Slides: ${extractMeta.pageCount}`);

    if (!cleanText || cleanText.trim().length === 0) {
      return { success: false, error: 'No readable text found in document. The file may be image-only or corrupted.', step: 'extract' };
    }

    // Free base64 from memory now that extraction is done
    base64Data = null;

    // ─── Step 4/5: Save metadata + clean text to Firestore
    progress('Step 4/5: Saving to database...');

    const noteData = {
      title: fileAsset.name,
      content: cleanText,
      contentType: fileType,
      subject,
      topic: topic || fileAsset.name.replace(/\.[^/.]+$/, '').substring(0, 50),
      sourceType: 'upload',
      createdByAI: true,
      pdfUrl: '',
      pdfName: fileAsset.name,
      hasAIContent: false,
    };

    const saveResult = await addNote(userId, noteData);
    if (!saveResult.success) {
      console.error('[DOC_PIPELINE] Firestore save failed:', saveResult.error);
      return { success: false, error: `Database save failed: ${saveResult.error}`, step: 'save' };
    }

    const noteId = saveResult.id;
    console.log(`[DOC_PIPELINE] Firestore save success. Note ID: ${noteId}`);

    // ─── Step 5/5: AI generation pipeline ───────────────
    progress('Step 5/5: Generating study materials with AI...');

    try {
      await runAIPipeline(userId, noteId, cleanText, noteData, progress);
    } catch (aiErr) {
      console.error('[DOC_PIPELINE] AI pipeline failed:', aiErr);
      // Note is already saved with clean text — AI failure is non-fatal
      return {
        success: true,
        noteId,
        warning: `Document processed but AI generation failed: ${aiErr.message}`,
      };
    }

    progress('Complete!');
    console.log('[DOC_PIPELINE] ✅ Full pipeline completed successfully. Note ID:', noteId);

    return { success: true, noteId };

  } catch (err) {
    console.error('[DOC_PIPELINE] Unexpected pipeline error:', err);
    return { success: false, error: err.message || 'Unknown error', step: 'unknown' };
  }
}

// ─── Validation ───────────────────────────────────────────

function validateFile(fileAsset) {
  if (!fileAsset || !fileAsset.uri) {
    return { valid: false, error: 'No file selected' };
  }

  if (!fileAsset.name) {
    return { valid: false, error: 'File has no name' };
  }

  // Check file size (15 MB limit)
  if (fileAsset.size && fileAsset.size > 15 * 1024 * 1024) {
    return { valid: false, error: 'File too large. Please upload a file smaller than 15MB.' };
  }

  const nameLower = fileAsset.name.toLowerCase();
  const mimeLower = (fileAsset.mimeType || '').toLowerCase();

  // Determine file type from extension and MIME
  let fileType = '';
  let extractorType = '';

  if (nameLower.endsWith('.pdf') || mimeLower === 'application/pdf') {
    fileType = 'pdf';
    extractorType = 'pdf';
  } else if (nameLower.endsWith('.pptx') || mimeLower === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') {
    fileType = 'pptx';
    extractorType = 'pptx';
  } else if (nameLower.endsWith('.ppt') || mimeLower === 'application/vnd.ms-powerpoint') {
    fileType = 'ppt';
    extractorType = 'pptx'; // Use PPTX extractor with binary fallback
  } else if (nameLower.endsWith('.docx') || mimeLower === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    fileType = 'docx';
    extractorType = 'docx';
  } else if (nameLower.endsWith('.doc') || mimeLower === 'application/msword') {
    fileType = 'doc';
    extractorType = 'docx'; // Use DOCX extractor with binary fallback
  } else {
    return {
      valid: false,
      error: `Unsupported format: "${fileAsset.name}". Supported: PDF, PPT, PPTX, DOC, DOCX`,
    };
  }

  return { valid: true, fileType, extractorType };
}

// ─── Upload to Firebase Storage ───────────────────────────

async function uploadToStorage(userId, fileAsset, progress) {
  // Create blob directly from the file URI
  const response = await fetch(fileAsset.uri);
  const blob = await response.blob();
  const contentType = fileAsset.mimeType || 'application/octet-stream';

  console.log('[DOC_PIPELINE] Upload: blob size=', blob.size, 'contentType=', contentType);

  const storagePath = `users/${userId}/library/${Date.now()}_${fileAsset.name}`;
  const storageRef = ref(storage, storagePath);

  // Metadata is required — Firebase needs to know the content type
  const metadata = { contentType };

  return new Promise((resolve, reject) => {
    const uploadTask = uploadBytesResumable(storageRef, blob, metadata);

    uploadTask.on('state_changed',
      (snapshot) => {
        const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
        progress(`Uploading... ${pct}%`);
      },
      (error) => {
        console.error('[DOC_PIPELINE] Upload error details:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
        reject(error);
      },
      async () => {
        try {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(url);
        } catch (urlErr) {
          reject(urlErr);
        }
      }
    );
  });
}

// ─── Text Extraction Router ──────────────────────────────

async function extractText(extractorType, base64Data, pdfExtractorRef, progress) {
  switch (extractorType) {
    case 'pdf': {
      progress('Extracting PDF text...');
      if (!pdfExtractorRef || !pdfExtractorRef.current) {
        throw new Error('PDF extractor component is not mounted. Please try again.');
      }
      if (!pdfExtractorRef.current.isReady()) {
        // Wait a moment for WebView to finish loading
        console.log('[DOC_PIPELINE] PDF WebView not ready yet, waiting 2s...');
        await delay(2000);
        if (!pdfExtractorRef.current.isReady()) {
          throw new Error('PDF extractor WebView failed to load. Please check your internet connection and try again.');
        }
      }
      return await pdfExtractorRef.current.extract(base64Data);
    }

    case 'docx': {
      progress('Extracting Word document text...');
      return await extractDocx(base64Data);
    }

    case 'pptx': {
      progress('Extracting PowerPoint text...');
      return await extractPptx(base64Data);
    }

    default:
      throw new Error(`Unknown extractor type: ${extractorType}`);
  }
}

// ─── Chunking Constants ──────────────────────────────────

const CHUNK_SIZE_CHARS = 4000;   // ~1000 tokens per chunk — well within TPM limits
const SAFE_SUMMARY_CHARS = 8000; // Max chars for the merged master summary sent to final prompts

// ─── AI Generation Pipeline (Chunked) ────────────────────

/**
 * Full AI pipeline with chunked processing for large documents.
 *
 * Flow:
 *   1. Calculate size & token estimate
 *   2. Split into sentence-aware chunks
 *   3. Summarise each chunk individually
 *   4. Merge chunk summaries into a master summary
 *   5. Generate Notes, Flashcards, Quiz, Revision from master summary ONLY
 *   6. Save all outputs to Firestore
 */
async function runAIPipeline(userId, noteId, textContent, noteData, progress) {
  const charCount = textContent.length;
  const estimatedTokens = Math.ceil(charCount / 4);

  console.log('[DOC_PIPELINE] ── AI Pipeline Start ──');
  console.log(`[DOC_PIPELINE] Document size: ${charCount} chars | ~${estimatedTokens} tokens`);

  // ─── Phase 1: Split into chunks ──────────────────────
  const chunks = splitIntoChunks(textContent, CHUNK_SIZE_CHARS);
  const chunkCount = chunks.length;

  console.log(`[DOC_PIPELINE] Split into ${chunkCount} chunks of ~${CHUNK_SIZE_CHARS} chars each`);

  // ─── Phase 2: Summarise each chunk ───────────────────
  const chunkSummaries = [];

  for (let i = 0; i < chunkCount; i++) {
    const chunkNum = i + 1;
    progress(`Processing chunk ${chunkNum} of ${chunkCount}...`);
    console.log(`[DOC_PIPELINE] Chunk ${chunkNum}/${chunkCount}: ${chunks[i].length} chars | ~${Math.ceil(chunks[i].length / 4)} tokens`);

    const chunkPrompt = `You are a study assistant. Read the following excerpt from a larger document and extract:
1. A concise summary (2-3 sentences).
2. Up to 5 key points or important concepts.

Excerpt (chunk ${chunkNum} of ${chunkCount}):
"""
${chunks[i]}
"""

Return JSON:
{
  "summary": "<2-3 sentence summary>",
  "keyPoints": ["<point 1>", "<point 2>", "<point 3>"]
}

Respond ONLY with valid JSON.`;

    const chunkResult = await generateContent(chunkPrompt, {
      json: true,
      timeout: 30000,
      maxTokens: 512,
    });

    if (chunkResult.success && chunkResult.data) {
      chunkSummaries.push({
        summary: chunkResult.data.summary || '',
        keyPoints: chunkResult.data.keyPoints || [],
      });
      console.log(`[DOC_PIPELINE] Chunk ${chunkNum} summarised. Summary: ${(chunkResult.data.summary || '').length} chars`);
    } else {
      console.warn(`[DOC_PIPELINE] Chunk ${chunkNum} summarisation failed (skipped): ${chunkResult.error}`);
    }

    // Small delay to avoid TPM rate limits
    if (i < chunkCount - 1) {
      await delay(500);
    }
  }

  // ─── Phase 3: Merge chunk summaries ──────────────────
  progress('Merging summaries...');

  const mergedSummaryText = chunkSummaries
    .map((c, i) => `[Section ${i + 1}]\nSummary: ${c.summary}\nKey Points: ${c.keyPoints.join('; ')}`)
    .join('\n\n');

  console.log(`[DOC_PIPELINE] Merged summary: ${mergedSummaryText.length} chars from ${chunkSummaries.length} chunk summaries`);

  // Condense merged summaries into a clean master summary if needed
  let masterSummaryText = mergedSummaryText;
  if (mergedSummaryText.length > SAFE_SUMMARY_CHARS) {
    progress('Condensing master summary...');
    console.log(`[DOC_PIPELINE] Condensing merged summary (${mergedSummaryText.length} chars → target ${SAFE_SUMMARY_CHARS})...`);

    const condensePrompt = `You are a study assistant. Below are summaries of each section of a document. Synthesise them into a single cohesive master summary of the entire document.

Section Summaries:
"""
${mergedSummaryText.substring(0, 12000)}
"""

Return JSON:
{
  "masterSummary": "<cohesive summary of the whole document in 3-5 paragraphs>"
}

Respond ONLY with valid JSON.`;

    const condenseResult = await generateContent(condensePrompt, {
      json: true,
      timeout: 30000,
      maxTokens: 1024,
    });

    if (condenseResult.success && condenseResult.data?.masterSummary) {
      masterSummaryText = condenseResult.data.masterSummary;
      console.log(`[DOC_PIPELINE] Master summary condensed: ${masterSummaryText.length} chars`);
    }
  }

  // Truncate to safe limit for all downstream prompts
  const safeInput = masterSummaryText.substring(0, SAFE_SUMMARY_CHARS);
  console.log(`[DOC_PIPELINE] Final input for generation: ${safeInput.length} chars | ~${Math.ceil(safeInput.length / 4)} tokens`);

  // ─── Phase 4: Generate Notes from master summary ─────
  progress('Generating final notes...');
  console.log('[DOC_PIPELINE] Generating notes from master summary...');

  const notesPrompt = `You are an expert study assistant. Based on the following master summary of a document, generate comprehensive structured study notes.

Master Summary:
"""
${safeInput}
"""

Return JSON:
{
  "sections": [
    { "heading": "<topic heading>", "content": "<detailed explanation, examples, or bullet points>" }
  ],
  "keyTakeaways": ["<core concept 1>", "<core concept 2>", "<core concept 3>"]
}

Respond ONLY with valid JSON.`;

  const notesResult = await generateContent(notesPrompt, { json: true, timeout: 30000, maxTokens: 2048 });
  if (!notesResult.success) throw new Error('Notes generation failed: ' + notesResult.error);

  const aiNotes = {
    sections: notesResult.data?.sections || [],
    keyTakeaways: notesResult.data?.keyTakeaways || [],
  };
  console.log('[DOC_PIPELINE] Notes generated. Sections:', aiNotes.sections.length);
  await delay(300);

  // ─── Phase 5: Generate Summary & Revision ────────────
  progress('Generating revision materials...');
  console.log('[DOC_PIPELINE] Generating summary & revision...');

  const summaryPrompt = `You are an expert study assistant. Based on the master summary below, generate study revision materials.

Master Summary:
"""
${safeInput}
"""

Return JSON:
{
  "summary": "<executive summary in 1-2 paragraphs>",
  "keyPoints": ["<key point 1>", "<key point 2>", "<key point 3>"],
  "studyQuestions": ["<question 1>", "<question 2>", "<question 3>"],
  "mnemonics": ["<memory aid 1>", "<memory aid 2>"],
  "quickFacts": ["<fact 1>", "<fact 2>", "<fact 3>"]
}

Respond ONLY with valid JSON.`;

  const summaryResult = await generateContent(summaryPrompt, { json: true, timeout: 30000, maxTokens: 1024 });
  if (!summaryResult.success) throw new Error('Summary generation failed: ' + summaryResult.error);

  const aiSummary = {
    summary: summaryResult.data?.summary || '',
    keyPoints: summaryResult.data?.keyPoints || [],
  };
  const aiRevision = {
    studyQuestions: summaryResult.data?.studyQuestions || [],
    mnemonics: summaryResult.data?.mnemonics || [],
    quickFacts: summaryResult.data?.quickFacts || [],
  };
  console.log('[DOC_PIPELINE] Summary & revision generated.');
  await delay(300);

  // ─── Phase 6: Generate Flashcards ────────────────────
  progress('Generating flashcards...');
  console.log('[DOC_PIPELINE] Generating flashcards...');

  const flashcardsPrompt = `You are an expert study assistant. Based on the master summary below, generate exactly 10 active recall flashcards.

Master Summary:
"""
${safeInput}
"""

Return JSON:
{
  "flashcards": [
    { "question": "<question>", "answer": "<concise answer>" }
  ]
}

Respond ONLY with valid JSON.`;

  const flashcardsResult = await generateContent(flashcardsPrompt, { json: true, timeout: 30000, maxTokens: 1024 });
  if (!flashcardsResult.success) throw new Error('Flashcards generation failed: ' + flashcardsResult.error);

  const aiFlashcards = flashcardsResult.data?.flashcards || [];
  console.log('[DOC_PIPELINE] Flashcards generated:', aiFlashcards.length);

  const cardsToSave = aiFlashcards.map(c => ({
    question: c.question,
    answer: c.answer,
    type: 'recall',
    difficulty: 'medium',
    subject: noteData.subject,
    topic: noteData.topic,
    createdByAI: true,
    noteId,
  }));
  await addFlashcards(userId, cardsToSave);
  await delay(300);

  // ─── Phase 7: Generate Quiz ──────────────────────────
  progress('Generating quiz...');
  console.log('[DOC_PIPELINE] Generating quiz...');

  const quizPrompt = `You are an expert quiz maker. Based on the master summary below, generate exactly 5 multiple-choice questions. Each must have exactly 4 options and a correctIndex (0-3).

Master Summary:
"""
${safeInput}
"""

Return JSON:
{
  "title": "Quiz: ${noteData.topic}",
  "questions": [
    {
      "question": "<question>",
      "options": ["<A>", "<B>", "<C>", "<D>"],
      "correctIndex": 0,
      "explanation": "<why this answer is correct>"
    }
  ]
}

Respond ONLY with valid JSON.`;

  const quizResult = await generateContent(quizPrompt, { json: true, timeout: 30000, maxTokens: 1024 });
  if (!quizResult.success) throw new Error('Quiz generation failed: ' + quizResult.error);

  const aiQuiz = quizResult.data?.questions || [];
  console.log('[DOC_PIPELINE] Quiz generated. Questions:', aiQuiz.length);

  const quizSaveRes = await createQuiz(userId, {
    title: quizResult.data?.title || `Quiz: ${noteData.topic}`,
    quizType: 'mcq',
    subject: noteData.subject,
    topic: noteData.topic,
    sourceType: 'notes',
    sourceId: noteId,
    questions: aiQuiz.map(q => ({
      question: q.question,
      options: q.options,
      correctIndex: q.correctIndex,
      correctAnswer: q.options?.[q.correctIndex] || '',
      explanation: q.explanation || '',
      difficulty: 'medium',
      type: 'mcq',
    })),
  });
  const quizId = quizSaveRes.success ? quizSaveRes.id : '';
  console.log('[DOC_PIPELINE] Quiz saved. ID:', quizId);

  // ─── Phase 8: Save everything to Firestore ────────────
  progress('Saving all study materials...');

  const updateResult = await updateNote(userId, noteId, {
    aiNotes,
    aiSummary,
    aiFlashcards,
    aiRevision,
    aiQuiz,
    quizId,
    hasAIContent: true,
  });

  if (!updateResult.success) {
    throw new Error('Failed to save AI content: ' + updateResult.error);
  }

  console.log('[DOC_PIPELINE] ✅ AI pipeline complete. Chunks processed:', chunkCount, '| Final input tokens: ~', Math.ceil(safeInput.length / 4));
}

// ─── Sentence-Aware Chunker ───────────────────────────────

/**
 * Split text into chunks of approximately maxChunkSize characters,
 * never cutting mid-sentence.
 * @param {string} text
 * @param {number} maxChunkSize
 * @returns {string[]}
 */
function splitIntoChunks(text, maxChunkSize) {
  // Normalise whitespace
  const normalised = text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();

  if (normalised.length <= maxChunkSize) {
    return [normalised];
  }

  const chunks = [];
  let start = 0;

  while (start < normalised.length) {
    let end = start + maxChunkSize;

    if (end >= normalised.length) {
      // Last chunk — take everything remaining
      chunks.push(normalised.slice(start).trim());
      break;
    }

    // Try to break at a sentence boundary (. ! ?) followed by whitespace
    let breakAt = -1;
    for (let i = end; i > start + maxChunkSize * 0.5; i--) {
      const ch = normalised[i];
      if ((ch === '.' || ch === '!' || ch === '?') && (normalised[i + 1] === ' ' || normalised[i + 1] === '\n')) {
        breakAt = i + 1;
        break;
      }
    }

    // Fallback: break at a paragraph boundary
    if (breakAt === -1) {
      const paraBreak = normalised.lastIndexOf('\n\n', end);
      if (paraBreak > start + maxChunkSize * 0.3) {
        breakAt = paraBreak;
      }
    }

    // Fallback: break at a word boundary (space)
    if (breakAt === -1) {
      const spaceBreak = normalised.lastIndexOf(' ', end);
      if (spaceBreak > start) {
        breakAt = spaceBreak;
      }
    }

    // Last resort: hard cut
    if (breakAt === -1) {
      breakAt = end;
    }

    const chunk = normalised.slice(start, breakAt).trim();
    if (chunk.length > 0) {
      chunks.push(chunk);
    }

    start = breakAt;
  }

  return chunks;
}

// ─── Helpers ──────────────────────────────────────────────

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Extract text only (no AI generation). Used by NoteEditorScreen.
 */
export async function extractTextFromFile(fileAsset, pdfExtractorRef, onProgress) {
  const progress = (msg) => {
    console.log(`[DOC_PIPELINE] ${msg}`);
    if (onProgress) onProgress(msg);
  };

  // Validate
  const validation = validateFile(fileAsset);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // Read file
  progress('Reading file...');
  const base64Data = await FileSystem.readAsStringAsync(fileAsset.uri, {
    encoding: 'base64',
  });

  if (!base64Data) {
    throw new Error('File read returned empty data');
  }

  console.log(`[DOC_PIPELINE] File read. Base64 length: ${base64Data.length}`);

  // Extract
  progress('Extracting text...');
  const result = await extractText(validation.extractorType, base64Data, pdfExtractorRef, progress);

  return result;
}

/**
 * Upload a file to Firebase Storage and return the download URL.
 * Used by NoteEditorScreen for standalone uploads.
 */
export async function uploadFileToStorage(userId, fileAsset) {
  const response = await fetch(fileAsset.uri);
  const blob = await response.blob();

  const storagePath = `users/${userId}/library/${Date.now()}_${fileAsset.name}`;
  const storageRef = ref(storage, storagePath);

  return new Promise((resolve, reject) => {
    const uploadTask = uploadBytesResumable(storageRef, blob);
    uploadTask.on('state_changed', null,
      (error) => reject(error),
      async () => {
        try {
          resolve(await getDownloadURL(uploadTask.snapshot.ref));
        } catch (e) {
          reject(e);
        }
      }
    );
  });
}
