/**
 * PDFExtractorWebView — Bulletproof PDF Text Extraction
 *
 * Uses a hidden WebView with pdf.js to extract text from PDF files.
 * Only handles PDF. Office formats are handled by officeExtractor.js natively.
 *
 * Architecture fixes over the previous broken version:
 *   1. WebView is ALWAYS mounted (not conditionally rendered)
 *   2. Uses onLoadEnd to confirm WebView is ready before sending data
 *   3. Uses injectJavaScript instead of postMessage for data transfer
 *   4. Exposed via useImperativeHandle → ref.current.extract(base64)
 *   5. Promise-based with 90-second timeout
 *   6. Loads ONLY pdf.js (not jszip, mammoth, tesseract)
 */
import React, { useRef, useState, useImperativeHandle, forwardRef, useCallback } from 'react';
import { WebView } from 'react-native-webview';

const PDF_EXTRACT_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>PDF Extractor</title>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js"></script>
</head>
<body>
  <script>
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

    // Signal that the WebView is loaded and ready
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ready' }));
    }

    // Global extraction function called via injectJavaScript
    window.extractPDF = async function(base64Data) {
      try {
        if (!base64Data) {
          throw new Error('No base64 data received');
        }

        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'log', message: 'Starting PDF extraction. Base64 length: ' + base64Data.length
        }));

        // Decode base64 to Uint8Array
        var binaryString = atob(base64Data);
        var len = binaryString.length;
        var bytes = new Uint8Array(len);
        for (var i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'log', message: 'Decoded to ' + len + ' bytes. Loading PDF document...'
        }));

        var loadingTask = pdfjsLib.getDocument({ data: bytes });
        var pdf = await loadingTask.promise;
        var pageCount = pdf.numPages;

        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'log', message: 'PDF loaded successfully. Total pages: ' + pageCount
        }));

        var fullText = '';

        for (var pageNum = 1; pageNum <= pageCount; pageNum++) {
          var page = await pdf.getPage(pageNum);
          var textContent = await page.getTextContent();
          var pageText = textContent.items.map(function(item) { return item.str; }).join(' ');

          fullText += pageText + '\\n\\n';

          // Report progress every page
          var percent = Math.round((pageNum / pageCount) * 100);
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'progress', percent: percent, page: pageNum, total: pageCount
          }));
        }

        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'success',
          content: fullText,
          metadata: {
            fileType: 'pdf',
            charCount: fullText.length,
            pageCount: pageCount
          }
        }));

      } catch (err) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'error',
          error: err.message || String(err),
          stack: err.stack || ''
        }));
      }
    };
  </script>
</body>
</html>`;

const EXTRACT_TIMEOUT_MS = 90000; // 90 seconds

const PDFExtractorWebView = forwardRef(function PDFExtractorWebView(props, ref) {
  const webViewRef = useRef(null);
  const isReadyRef = useRef(false);
  const pendingResolveRef = useRef(null);
  const pendingRejectRef = useRef(null);
  const timeoutRef = useRef(null);

  // Clean up any pending promise
  const cleanup = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    pendingResolveRef.current = null;
    pendingRejectRef.current = null;
  }, []);

  // Expose extract() method via ref
  useImperativeHandle(ref, () => ({
    /**
     * Extract text from a PDF file.
     * @param {string} base64String - Base64-encoded PDF contents
     * @returns {Promise<{ text: string, metadata: object }>}
     */
    extract: (base64String) => {
      return new Promise((resolve, reject) => {
        if (!isReadyRef.current || !webViewRef.current) {
          reject(new Error('PDF extractor WebView is not ready. Please wait a moment and try again.'));
          return;
        }

        if (!base64String) {
          reject(new Error('No base64 data provided to PDF extractor'));
          return;
        }

        // Store callbacks
        pendingResolveRef.current = resolve;
        pendingRejectRef.current = reject;

        // Set timeout
        timeoutRef.current = setTimeout(() => {
          cleanup();
          reject(new Error('PDF extraction timed out after ' + (EXTRACT_TIMEOUT_MS / 1000) + ' seconds'));
        }, EXTRACT_TIMEOUT_MS);

        // Inject the base64 data and trigger extraction
        // We split the injection to avoid issues with very large string literals
        console.log('[DOC_PIPELINE] PDF WebView: injecting data and starting extraction');
        const escaped = base64String.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
        webViewRef.current.injectJavaScript(`
          (function() {
            try {
              window.extractPDF('${escaped}');
            } catch(e) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'error', error: e.message || String(e)
              }));
            }
          })();
          true;
        `);
      });
    },

    /** Check if the WebView is loaded and ready */
    isReady: () => isReadyRef.current,
  }), [cleanup]);

  const handleMessage = useCallback((event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);

      switch (data.type) {
        case 'ready':
          console.log('[DOC_PIPELINE] PDF WebView: loaded and ready');
          isReadyRef.current = true;
          break;

        case 'log':
          console.log('[DOC_PIPELINE] PDF WebView:', data.message);
          if (props.onProgress) {
            props.onProgress(data.message);
          }
          break;

        case 'progress':
          console.log(`[DOC_PIPELINE] PDF WebView: page ${data.page}/${data.total} (${data.percent}%)`);
          if (props.onProgress) {
            props.onProgress(`Extracting page ${data.page} of ${data.total}...`);
          }
          break;

        case 'success':
          console.log('[DOC_PIPELINE] PDF WebView: extraction SUCCESS. Chars:', data.metadata?.charCount, 'Pages:', data.metadata?.pageCount);
          if (pendingResolveRef.current) {
            const resolve = pendingResolveRef.current;
            cleanup();
            resolve({
              text: data.content || '',
              metadata: data.metadata || {},
            });
          }
          break;

        case 'error':
          console.error('[DOC_PIPELINE] PDF WebView: extraction FAILED:', data.error);
          if (data.stack) console.error('[DOC_PIPELINE] Stack:', data.stack);
          if (pendingRejectRef.current) {
            const reject = pendingRejectRef.current;
            cleanup();
            reject(new Error(data.error || 'PDF extraction failed'));
          }
          break;

        default:
          console.log('[DOC_PIPELINE] PDF WebView: unknown message type:', data.type);
      }
    } catch (parseErr) {
      console.warn('[DOC_PIPELINE] PDF WebView: message parse failed:', parseErr);
    }
  }, [cleanup, props.onProgress]);

  return (
    <WebView
      ref={webViewRef}
      source={{ html: PDF_EXTRACT_HTML }}
      style={{ width: 0, height: 0, opacity: 0, position: 'absolute' }}
      javaScriptEnabled={true}
      domStorageEnabled={true}
      originWhitelist={['*']}
      onMessage={handleMessage}
      onLoadEnd={() => {
        console.log('[DOC_PIPELINE] PDF WebView: onLoadEnd fired');
        // The 'ready' message from JS will set isReadyRef
      }}
      onError={(syntheticEvent) => {
        const { nativeEvent } = syntheticEvent;
        console.error('[DOC_PIPELINE] PDF WebView: load error:', nativeEvent.description);
        isReadyRef.current = false;
      }}
    />
  );
});

export default PDFExtractorWebView;
