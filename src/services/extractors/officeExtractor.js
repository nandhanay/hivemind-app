/**
 * Office Document Text Extractor — Native JavaScript
 *
 * Extracts text from DOCX, PPTX, DOC, and PPT files using jszip + regex.
 * Runs entirely in React Native / Hermes — NO WebView, NO CDN dependencies.
 *
 * Supported formats:
 *   - DOCX: ZIP → word/document.xml → <w:t> tags
 *   - PPTX: ZIP → ppt/slides/slideN.xml → <a:t> tags + speaker notes
 *   - DOC/PPT: Binary OLE fallback → printable ASCII extraction
 */
import JSZip from 'jszip';

// ─── DOCX Extraction ──────────────────────────────────────

/**
 * Extract text from a DOCX file.
 * @param {string} base64String - Base64-encoded DOCX file contents
 * @returns {Promise<{ text: string, metadata: object }>}
 */
export async function extractDocx(base64String) {
  console.log('[DOC_PIPELINE] DOCX extractor: starting');

  try {
    const zip = await JSZip.loadAsync(base64String, { base64: true });
    console.log('[DOC_PIPELINE] DOCX extractor: ZIP archive loaded');

    // Read main document body
    const docFile = zip.file('word/document.xml');
    if (!docFile) {
      throw new Error('word/document.xml not found in DOCX archive');
    }

    const xmlContent = await docFile.async('string');
    console.log('[DOC_PIPELINE] DOCX extractor: document.xml read, length:', xmlContent.length);

    let fullText = '';

    // Split into paragraphs by <w:p> tags
    const paragraphs = xmlContent.split(/<w:p[\s>]/);

    for (const para of paragraphs) {
      // Check for heading style
      const styleMatch = para.match(/<w:pStyle\s+w:val="([^"]+)"/);
      const isHeading = styleMatch && /^Heading/i.test(styleMatch[1]);
      const headingLevel = isHeading
        ? parseInt(styleMatch[1].replace(/\D/g, ''), 10) || 1
        : 0;

      // Extract all <w:t> text runs in this paragraph
      const textRuns = [];
      const tMatches = para.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g);
      for (const m of tMatches) {
        if (m[1]) textRuns.push(m[1]);
      }

      if (textRuns.length === 0) continue;

      const lineText = textRuns.join('');

      if (isHeading) {
        const prefix = '#'.repeat(Math.min(headingLevel, 6));
        fullText += `\n${prefix} ${lineText}\n`;
      } else {
        fullText += lineText + '\n';
      }
    }

    // Extract tables
    const tableMatches = xmlContent.matchAll(/<w:tbl>([\s\S]*?)<\/w:tbl>/g);
    for (const tableMatch of tableMatches) {
      const tableXml = tableMatch[1];
      const rows = tableXml.split(/<w:tr[\s>]/);

      fullText += '\n[Table]\n';
      for (const row of rows) {
        const cells = [];
        const cellMatches = row.matchAll(/<w:tc>([\s\S]*?)<\/w:tc>/g);
        for (const cellMatch of cellMatches) {
          const cellText = [];
          const cellTMatches = cellMatch[1].matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g);
          for (const ct of cellTMatches) {
            if (ct[1]) cellText.push(ct[1]);
          }
          cells.push(cellText.join(''));
        }
        if (cells.length > 0) {
          fullText += '| ' + cells.join(' | ') + ' |\n';
        }
      }
      fullText += '\n';
    }

    const cleanText = fullText.trim();
    console.log('[DOC_PIPELINE] DOCX extractor: completed. Characters extracted:', cleanText.length);

    return {
      text: cleanText,
      metadata: {
        fileType: 'docx',
        charCount: cleanText.length,
        pageCount: 1,
      },
    };
  } catch (zipError) {
    // If JSZip fails, this might be a legacy .doc file
    console.warn('[DOC_PIPELINE] DOCX extractor: JSZip failed, attempting binary fallback:', zipError.message);
    return extractLegacyBinary(base64String, 'doc');
  }
}

// ─── PPTX Extraction ──────────────────────────────────────

/**
 * Extract text from a PPTX file.
 * @param {string} base64String - Base64-encoded PPTX file contents
 * @returns {Promise<{ text: string, metadata: object }>}
 */
export async function extractPptx(base64String) {
  console.log('[DOC_PIPELINE] PPTX extractor: starting');

  try {
    const zip = await JSZip.loadAsync(base64String, { base64: true });
    console.log('[DOC_PIPELINE] PPTX extractor: ZIP archive loaded');

    // Find and sort slide files
    const slideFiles = [];
    zip.forEach((relativePath, file) => {
      if (relativePath.startsWith('ppt/slides/slide') && relativePath.endsWith('.xml')) {
        const numMatch = relativePath.match(/slide(\d+)\.xml/);
        if (numMatch) {
          slideFiles.push({
            path: relativePath,
            num: parseInt(numMatch[1], 10),
            file,
          });
        }
      }
    });

    slideFiles.sort((a, b) => a.num - b.num);
    const slideCount = slideFiles.length;
    console.log('[DOC_PIPELINE] PPTX extractor: found', slideCount, 'slides');

    if (slideCount === 0) {
      throw new Error('No slides found in PPTX archive');
    }

    let fullText = '';

    for (const slideInfo of slideFiles) {
      const slideNum = slideInfo.num;

      // Extract slide text
      const slideXml = await slideInfo.file.async('string');
      const textRuns = [];
      const tMatches = slideXml.matchAll(/<a:t>([^<]*)<\/a:t>/g);
      for (const m of tMatches) {
        if (m[1]) textRuns.push(m[1]);
      }

      fullText += `--- Slide ${slideNum} ---\n`;
      fullText += textRuns.join(' ') + '\n';

      // Extract speaker notes
      const notesPath = `ppt/notesSlides/notesSlide${slideNum}.xml`;
      const notesFile = zip.file(notesPath);
      if (notesFile) {
        const notesXml = await notesFile.async('string');
        const notesTextRuns = [];
        const notesTMatches = notesXml.matchAll(/<a:t>([^<]*)<\/a:t>/g);
        for (const m of notesTMatches) {
          if (m[1]) notesTextRuns.push(m[1]);
        }
        const notesText = notesTextRuns.join(' ').trim();
        if (notesText) {
          fullText += `[Speaker Notes]: ${notesText}\n`;
        }
      }

      fullText += '\n';
    }

    const cleanText = fullText.trim();
    console.log('[DOC_PIPELINE] PPTX extractor: completed. Characters extracted:', cleanText.length, '| Slides:', slideCount);

    return {
      text: cleanText,
      metadata: {
        fileType: 'pptx',
        charCount: cleanText.length,
        pageCount: slideCount,
      },
    };
  } catch (zipError) {
    // If JSZip fails, this might be a legacy .ppt file
    console.warn('[DOC_PIPELINE] PPTX extractor: JSZip failed, attempting binary fallback:', zipError.message);
    return extractLegacyBinary(base64String, 'ppt');
  }
}

// ─── Legacy Binary Extraction (DOC / PPT) ─────────────────

/**
 * Extract readable ASCII text from a binary OLE file (legacy .doc or .ppt).
 * This is a best-effort fallback for files that are not ZIP-based.
 * @param {string} base64String - Base64-encoded file contents
 * @param {string} fileType - 'doc' or 'ppt'
 * @returns {{ text: string, metadata: object }}
 */
export function extractLegacyBinary(base64String, fileType) {
  console.log(`[DOC_PIPELINE] Legacy binary extractor: starting for ${fileType}`);

  try {
    // Decode base64 to byte array
    // Hermes doesn't have atob, so we decode manually
    const binaryString = base64Decode(base64String);
    const len = binaryString.length;

    let text = '';
    let currentWord = [];

    for (let i = 0; i < len; i++) {
      const charCode = binaryString.charCodeAt(i);
      // Printable ASCII + whitespace characters
      if ((charCode >= 32 && charCode <= 126) || charCode === 10 || charCode === 13 || charCode === 9) {
        currentWord.push(String.fromCharCode(charCode));
      } else {
        if (currentWord.length >= 4) {
          text += currentWord.join('') + ' ';
        }
        currentWord = [];
      }
    }
    if (currentWord.length >= 4) {
      text += currentWord.join('');
    }

    const cleanText = text.replace(/\s+/g, ' ').trim();
    console.log(`[DOC_PIPELINE] Legacy binary extractor: completed. Characters extracted: ${cleanText.length}`);

    return {
      text: cleanText,
      metadata: {
        fileType,
        charCount: cleanText.length,
        pageCount: 1,
      },
    };
  } catch (err) {
    console.error('[DOC_PIPELINE] Legacy binary extractor failed:', err);
    return {
      text: '',
      metadata: { fileType, charCount: 0, pageCount: 0 },
    };
  }
}

// ─── Base64 Decode (Hermes-safe) ──────────────────────────

const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function base64Decode(base64) {
  // Remove padding and whitespace
  const cleaned = base64.replace(/[\s=]/g, '');
  let result = '';

  for (let i = 0; i < cleaned.length; i += 4) {
    const a = BASE64_CHARS.indexOf(cleaned[i]);
    const b = BASE64_CHARS.indexOf(cleaned[i + 1]);
    const c = BASE64_CHARS.indexOf(cleaned[i + 2]);
    const d = BASE64_CHARS.indexOf(cleaned[i + 3]);

    result += String.fromCharCode((a << 2) | (b >> 4));
    if (c !== -1) result += String.fromCharCode(((b & 15) << 4) | (c >> 2));
    if (d !== -1) result += String.fromCharCode(((c & 3) << 6) | d);
  }

  return result;
}
