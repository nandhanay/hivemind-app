import React, { useRef, useEffect } from 'react';
import { WebView } from 'react-native-webview';

const PDF_JS_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Document Extractor & OCR</title>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/tesseract.js/4.1.1/tesseract.min.js"></script>
</head>
<body>
  <script>
    // Configure PDF.js worker
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

    function sendProgress(percent, page, total) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'progress',
          percent: percent,
          page: page,
          total: total
        }));
      }
    }

    function sendSuccess(content, metadata) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'success',
          content: content,
          metadata: metadata
        }));
      }
    }

    function sendError(err) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'error',
          error: err
        }));
      }
    }

    function sendLog(msg) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'log',
          message: msg
        }));
      }
    }

    // Binary ASCII characters extraction fallback (for legacy OLE .doc and .ppt formats)
    function extractStringsFromBinary(bytes) {
      let text = "";
      let currentWord = [];
      for (let i = 0; i < bytes.length; i++) {
        const charCode = bytes[i];
        // Only grab printable ASCII and standard spaces/tabs/newlines
        if ((charCode >= 32 && charCode <= 126) || charCode === 10 || charCode === 13 || charCode === 9) {
          currentWord.push(String.fromCharCode(charCode));
        } else {
          if (currentWord.length >= 4) {
            text += currentWord.join("") + " ";
          }
          currentWord = [];
        }
      }
      if (currentWord.length >= 4) {
        text += currentWord.join("");
      }
      return text.replace(/\s+/g, ' ').trim();
    }

    window.addEventListener('message', async (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'extract') {
          const base64 = data.base64;
          const fileType = data.fileType || 'pdf';
          
          sendLog("Initializing extraction sandbox for format: " + fileType);

          if (!base64) {
            throw new Error("base64 is undefined in WebView extraction handler");
          }

          // Convert base64 back to Uint8Array
          const binaryString = atob(base64);
          const len = binaryString.length;
          const bytes = new Uint8Array(len);
          for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }

          let fullText = "";
          let pageCount = 0;
          let imagesProcessed = 0;

          if (fileType === 'pdf') {
            // PDF page text and page OCR pipeline
            const loadingTask = pdfjsLib.getDocument({ data: bytes });
            const pdf = await loadingTask.promise;
            pageCount = pdf.numPages;
            sendLog("Loaded PDF. Total pages: " + pageCount);

            for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
              sendProgress(Math.round(((pageNum - 0.5) / pageCount) * 100), pageNum, pageCount);
              sendLog("Processing PDF page " + pageNum + " of " + pageCount);

              const page = await pdf.getPage(pageNum);
              const textContent = await page.getTextContent();
              let pageText = textContent.items.map(item => item.str).join(' ');

              // Run OCR on scanned PDF pages or low text density pages
              if (pageText.trim().length < 150) {
                sendLog("Low character density (" + pageText.trim().length + ") on page " + pageNum + ". Triggering OCR...");
                try {
                  const viewport = page.getViewport({ scale: 1.5 });
                  const canvas = document.createElement('canvas');
                  const context = canvas.getContext('2d');
                  canvas.height = viewport.height;
                  canvas.width = viewport.width;
                  await page.render({ canvasContext: context, viewport: viewport }).promise;

                  // Perform OCR
                  const ocrResult = await Tesseract.recognize(canvas, 'eng');
                  const ocrText = ocrResult.data.text.trim();
                  if (ocrText) {
                    sendLog("OCR extracted " + ocrText.length + " characters from page " + pageNum);
                    pageText = (pageText + "\n\n[Scanned Page OCR]\n" + ocrText).trim();
                    imagesProcessed++;
                  } else {
                    sendLog("OCR returned empty text on page " + pageNum);
                  }
                } catch (ocrErr) {
                  sendLog("OCR rendering or text recognition failed on page " + pageNum + ": " + String(ocrErr));
                }
              }

              fullText += pageText + "\n\n";
              sendProgress(Math.round((pageNum / pageCount) * 100), pageNum, pageCount);
            }

            sendSuccess(fullText, {
              charCount: fullText.length,
              pageCount: pageCount,
              imagesProcessed: imagesProcessed,
              fileType: 'pdf'
            });

          } else if (fileType === 'pptx' || fileType === 'ppt') {
            // PPTX slides, speaker notes, and image OCR pipeline
            try {
              sendLog("Loading PPTX ZIP archive...");
              const zip = await JSZip.loadAsync(bytes);
              
              const slideFiles = [];
              zip.forEach((relativePath, file) => {
                if (relativePath.startsWith("ppt/slides/slide") && relativePath.endsWith(".xml")) {
                  const numMatch = relativePath.match(/slide(\d+)\.xml/);
                  if (numMatch) {
                    slideFiles.push({
                      path: relativePath,
                      num: parseInt(numMatch[1], 10),
                      file: file
                    });
                  }
                }
              });

              slideFiles.sort((a, b) => a.num - b.num);
              pageCount = slideFiles.length;
              sendLog("Found " + pageCount + " slides inside PPTX.");

              if (pageCount === 0) {
                throw new Error("No slides found in the PPTX document.");
              }

              const parser = new DOMParser();

              for (let i = 0; i < pageCount; i++) {
                const slideInfo = slideFiles[i];
                const slideNum = slideInfo.num;
                sendProgress(Math.round(((i + 0.5) / pageCount) * 50), i + 1, pageCount);
                sendLog("Parsing slide XML: " + slideNum);

                const xmlText = await slideInfo.file.async("string");
                const xmlDoc = parser.parseFromString(xmlText, "text/xml");
                const tElements = xmlDoc.getElementsByTagName("a:t");
                const slideText = Array.from(tElements).map(el => el.textContent).filter(Boolean).join(" ");

                fullText += "--- Slide " + slideNum + " ---\n" + slideText + "\n";

                // Get speaker notes
                const notesPath = "ppt/notesSlides/notesSlide" + slideNum + ".xml";
                const notesFile = zip.file(notesPath);
                if (notesFile) {
                  sendLog("Parsing speaker notes for slide " + slideNum);
                  const notesXml = await notesFile.async("string");
                  const notesDoc = parser.parseFromString(notesXml, "text/xml");
                  const notesTElements = notesDoc.getElementsByTagName("a:t");
                  const notesText = Array.from(notesTElements).map(el => el.textContent).filter(Boolean).join(" ");
                  if (notesText.trim()) {
                    fullText += "[Speaker Notes]: " + notesText + "\n";
                  }
                }
                fullText += "\n";
              }

              // Extract image attachments inside PPTX
              sendLog("Checking for PPTX media image files...");
              const mediaFiles = [];
              zip.forEach((relativePath, file) => {
                if (relativePath.startsWith("ppt/media/") && /\.(png|jpe?g|webp|gif)$/i.test(relativePath)) {
                  mediaFiles.push(file);
                }
              });

              sendLog("Found " + mediaFiles.length + " media images. Running OCR...");
              let ocrText = "";
              for (let i = 0; i < mediaFiles.length; i++) {
                const file = mediaFiles[i];
                const progressPercent = 50 + Math.round(((i + 1) / mediaFiles.length) * 50);
                sendProgress(progressPercent, i + 1, mediaFiles.length);

                try {
                  sendLog("Running OCR on image " + (i + 1) + " of " + mediaFiles.length + ": " + file.name);
                  const base64Img = await file.async("base64");
                  let mime = "image/png";
                  if (file.name.endsWith(".jpg") || file.name.endsWith(".jpeg")) mime = "image/jpeg";
                  else if (file.name.endsWith(".webp")) mime = "image/webp";
                  else if (file.name.endsWith(".gif")) mime = "image/gif";
                  
                  const dataUrl = "data:" + mime + ";base64," + base64Img;
                  const result = await Tesseract.recognize(dataUrl, 'eng');
                  const text = result.data.text.trim();
                  if (text) {
                    sendLog("OCR extracted text from " + file.name);
                    ocrText += "\n[Image OCR Text: " + file.name.substring(file.name.lastIndexOf('/') + 1) + "]\n" + text + "\n";
                    imagesProcessed++;
                  }
                } catch (ocrErr) {
                  sendLog("OCR failed on PowerPoint image " + file.name + ": " + String(ocrErr));
                }
              }

              if (ocrText) {
                fullText += "\n=== EXTRACTED TEXT FROM EMBEDDED IMAGES (OCR) ===\n" + ocrText;
              }

              sendSuccess(fullText, {
                charCount: fullText.length,
                pageCount: pageCount,
                imagesProcessed: imagesProcessed,
                fileType: 'pptx'
              });

            } catch (pptxErr) {
              sendLog("PPTX zip extraction failed. Attempting binary text extraction fallback (for legacy PPT): " + pptxErr.message);
              const text = extractStringsFromBinary(bytes);
              sendSuccess(text, {
                charCount: text.length,
                pageCount: 1,
                imagesProcessed: 0,
                fileType: 'pptx'
              });
            }

          } else if (fileType === 'docx' || fileType === 'doc') {
            // DOCX headings, paragraphs, formatted tables, and OCR pipeline
            try {
              sendLog("Extracting DOCX body content...");
              const htmlResult = await mammoth.convertToHtml({ arrayBuffer: bytes.buffer });
              const html = htmlResult.value;
              sendLog("DOCX body parsed to HTML.");

              const docParser = new DOMParser();
              const doc = docParser.parseFromString(html, "text/html");
              
              let contentText = "";
              doc.body.childNodes.forEach(node => {
                if (node.nodeType === Node.ELEMENT_NODE) {
                  if (/^H[1-6]$/.test(node.tagName)) {
                    contentText += "\n# " + node.textContent.trim() + "\n";
                  } else if (node.tagName === 'P') {
                    contentText += node.textContent.trim() + "\n";
                  } else if (node.tagName === 'TABLE') {
                    contentText += "\n[Table]\n";
                    const rows = Array.from(node.querySelectorAll('tr'));
                    rows.forEach(tr => {
                      const cells = Array.from(tr.querySelectorAll('td, th'))
                        .map(td => td.textContent.trim())
                        .join(' | ');
                      contentText += "| " + cells + " |\n";
                    });
                    contentText += "\n";
                  } else if (node.tagName === 'UL' || node.tagName === 'OL') {
                    Array.from(node.querySelectorAll('li')).forEach(li => {
                      contentText += "• " + li.textContent.trim() + "\n";
                    });
                  } else {
                    const txt = node.textContent.trim();
                    if (txt) contentText += txt + "\n";
                  }
                }
              });

              fullText = contentText.trim();
              pageCount = 1;

              // OCR on DOCX embedded images
              sendLog("Checking for DOCX media image files...");
              const zip = await JSZip.loadAsync(bytes);
              const mediaFiles = [];
              zip.forEach((relativePath, file) => {
                if (relativePath.startsWith("word/media/") && /\.(png|jpe?g|webp|gif)$/i.test(relativePath)) {
                  mediaFiles.push(file);
                }
              });

              sendLog("Found " + mediaFiles.length + " DOCX media images. Running OCR...");
              let ocrText = "";
              for (let i = 0; i < mediaFiles.length; i++) {
                const file = mediaFiles[i];
                const progressPercent = 50 + Math.round(((i + 1) / mediaFiles.length) * 50);
                sendProgress(progressPercent, i + 1, mediaFiles.length);

                try {
                  sendLog("Running OCR on image " + (i + 1) + " of " + mediaFiles.length + ": " + file.name);
                  const base64Img = await file.async("base64");
                  let mime = "image/png";
                  if (file.name.endsWith(".jpg") || file.name.endsWith(".jpeg")) mime = "image/jpeg";
                  else if (file.name.endsWith(".webp")) mime = "image/webp";
                  else if (file.name.endsWith(".gif")) mime = "image/gif";
                  
                  const dataUrl = "data:" + mime + ";base64," + base64Img;
                  const result = await Tesseract.recognize(dataUrl, 'eng');
                  const text = result.data.text.trim();
                  if (text) {
                    sendLog("OCR extracted text from DOCX image " + file.name);
                    ocrText += "\n[Image OCR Text: " + file.name.substring(file.name.lastIndexOf('/') + 1) + "]\n" + text + "\n";
                    imagesProcessed++;
                  }
                } catch (ocrErr) {
                  sendLog("OCR failed on DOCX image " + file.name + ": " + String(ocrErr));
                }
              }

              if (ocrText) {
                fullText += "\n\n=== EXTRACTED TEXT FROM EMBEDDED IMAGES (OCR) ===\n" + ocrText;
              }

              sendSuccess(fullText, {
                charCount: fullText.length,
                pageCount: pageCount,
                imagesProcessed: imagesProcessed,
                fileType: 'docx'
              });

            } catch (docxErr) {
              sendLog("DOCX standard conversion failed. Attempting binary text extraction fallback (for legacy DOC): " + docxErr.message);
              const text = extractStringsFromBinary(bytes);
              sendSuccess(text, {
                charCount: text.length,
                pageCount: 1,
                imagesProcessed: 0,
                fileType: 'docx'
              });
            }
          }

        }
      } catch (err) {
        sendLog("Extraction Sandbox critical error: " + String(err));
        sendError(err.message || String(err));
      }
    });
  </script>
</body>
</html>`;

export default function PDFTextExtractor({ base64Data, fileType, onProgress, onSuccess, onError, onLog }) {
  const webViewRef = useRef(null);

  useEffect(() => {
    if (base64Data && webViewRef.current) {
      const timer = setTimeout(() => {
        if (webViewRef.current) {
          webViewRef.current.postMessage(JSON.stringify({
            type: 'extract',
            base64: base64Data,
            fileType: fileType
          }));
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [base64Data, fileType]);

  if (!base64Data) return null;

  return (
    <WebView
      ref={webViewRef}
      source={{ html: PDF_JS_HTML }}
      style={{ width: 0, height: 0, opacity: 0, position: 'absolute' }}
      javaScriptEnabled={true}
      domStorageEnabled={true}
      originWhitelist={['*']}
      onMessage={(event) => {
        try {
          const data = JSON.parse(event.nativeEvent.data);
          if (data.type === 'progress') {
            onProgress && onProgress(data.percent, data.page, data.total);
          } else if (data.type === 'success') {
            onSuccess && onSuccess(data.content, data.metadata);
          } else if (data.type === 'error') {
            onError && onError(data.error);
          } else if (data.type === 'log') {
            console.log("[PDFTextExtractor WebView LOG]", data.message);
            onLog && onLog(data.message);
          }
        } catch (e) {
          console.warn('PDF Extractor message parse failed:', e);
        }
      }}
    />
  );
}
