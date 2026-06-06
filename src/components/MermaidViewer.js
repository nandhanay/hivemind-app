import React, { useRef, useMemo, useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Modal, Text, Share, Alert, ScrollView } from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { sanitizeMermaidCode, parseMermaidToText } from '../utils/mermaidUtils';

/**
 * Renders a Mermaid.js diagram in a WebView with zoom and fullscreen modal support.
 * @param {object} props
 * @param {string} props.code — Mermaid diagram source code
 * @param {number} [props.height] — Container height (default 300)
 */
export default function MermaidViewer({ code, height = 300 }) {
  const { colors, isDarkMode } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Reset error state if flowchart code changes (e.g. edited by user)
  useEffect(() => {
    setHasError(false);
  }, [code]);

  // Sanitize the code before sending it to the WebView
  const sanitizedCode = useMemo(() => sanitizeMermaidCode(code), [code]);

  const getHtml = (isFullscreen) => {
    const theme = isDarkMode ? 'dark' : 'default';
    const bg = isDarkMode ? '#1A1A1A' : '#FFFFFF';
    const textColor = isDarkMode ? '#FFFFFF' : '#1A1A1A';
    
    // For fullscreen view, allow users to pinch-zoom and scroll freely in natural size (no maxWidth constraint)
    const viewport = isFullscreen
      ? '<meta name="viewport" content="width=device-width, initial-scale=1.0, minimum-scale=0.5, maximum-scale=5.0, user-scalable=yes">'
      : '<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">';

    const useMaxWidth = !isFullscreen;

    return `<!DOCTYPE html>
<html>
<head>
  ${viewport}
  <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
  <style>
    body {
      margin: 0;
      padding: ${isFullscreen ? '32px' : '16px'};
      background: ${bg};
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      overflow: auto;
    }
    #diagram {
      width: ${isFullscreen ? 'auto' : '100%'};
      min-width: ${isFullscreen ? '600px' : 'auto'};
      text-align: center;
    }
    .mermaid { color: ${textColor}; }
  </style>
  <script>
    // Global error listener to report WebView syntax/loading failures back to React Native
    window.onerror = function(message, url, line) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', error: message }));
      }
      return true;
    };
  </script>
</head>
<body>
  <div id="diagram" class="mermaid">
${sanitizedCode}
  </div>
  <script>
    mermaid.initialize({
      startOnLoad: true,
      theme: '${theme}',
      parseError: function(err, hash) {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', error: String(err) }));
        }
      },
      themeVariables: {
        primaryColor: '${colors.primary}',
        primaryTextColor: '${textColor}',
        primaryBorderColor: '${colors.primary}',
        lineColor: '${colors.textSecondary}',
        secondaryColor: '${colors.surfaceHighlight}',
        tertiaryColor: '${colors.shimmer}',
        background: '${bg}',
        mainBkg: '${bg}',
      },
      flowchart: { useMaxWidth: ${useMaxWidth}, htmlLabels: true },
    });
  </script>
</body>
</html>`;
  };

  const embeddedHtml = useMemo(() => getHtml(false), [sanitizedCode, colors, isDarkMode]);
  const fullscreenHtml = useMemo(() => getHtml(true), [sanitizedCode, colors, isDarkMode]);

  const handleMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'error') {
        setHasError(true);
      }
    } catch (err) {
      // ignore
    }
  };

  const handleShareDiagram = async () => {
    try {
      await Share.share({
        message: `📊 HiveMind Study Flowchart Diagram:\n\n\`\`\`mermaid\n${sanitizedCode}\n\`\`\``,
        title: 'Study Flowchart Diagram',
      });
    } catch (e) {
      Alert.alert('Error', 'Failed to share diagram: ' + e.message);
    }
  };

  if (!code) return null;

  // Fallback rendering UI when Mermaid has parsing/syntax errors
  if (hasError) {
    const steps = parseMermaidToText(sanitizedCode);
    return (
      <View style={[styles.container, { height, borderColor: `${colors.danger}44`, backgroundColor: `${colors.danger}08` }]}>
        <ScrollView contentContainerStyle={styles.fallbackScroll} showsVerticalScrollIndicator={true}>
          <View style={styles.errorHeader}>
            <Ionicons name="alert-circle-outline" size={20} color={colors.danger} />
            <Text style={[styles.errorTitle, { color: colors.text }]}>Flowchart rendering issue. Flow details:</Text>
          </View>
          {steps.length === 0 ? (
            <Text style={[styles.rawCodeText, { color: colors.textSecondary }]}>
              {sanitizedCode}
            </Text>
          ) : (
            steps.map((step, idx) => (
              <View key={idx} style={styles.stepRow}>
                <Ionicons name="play" size={10} color={colors.primary} style={{ marginTop: 4 }} />
                <Text style={[styles.stepText, { color: colors.text }]}>{step}</Text>
              </View>
            ))
          )}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { height, borderColor: colors.glassBorder }]}>
      <WebView
        source={{ html: embeddedHtml }}
        style={styles.webview}
        scrollEnabled={false}
        javaScriptEnabled={true}
        onMessage={handleMessage}
        originWhitelist={['*']}
      />
      
      {/* Expand button in embedded view */}
      <TouchableOpacity
        style={[styles.expandButton, { backgroundColor: `${colors.background}EE`, borderColor: colors.glassBorder }]}
        onPress={() => setModalVisible(true)}
      >
        <Ionicons name="expand-outline" size={18} color={colors.text} />
      </TouchableOpacity>

      {/* Fullscreen Zoomable View Modal */}
      <Modal visible={modalVisible} animationType="fade" transparent={false}>
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          {/* Modal Header */}
          <View style={[styles.modalHeader, { borderBottomColor: colors.glassBorder }]}>
            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.headerBtn}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            
            <Text style={[styles.modalTitle, { color: colors.text }]}>Flowchart Viewer</Text>
            
            <TouchableOpacity onPress={handleShareDiagram} style={styles.headerBtn}>
              <Ionicons name="share-social-outline" size={22} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {/* Fullscreen WebView */}
          <View style={styles.fullscreenWebviewContainer}>
            <WebView
              source={{ html: fullscreenHtml }}
              style={styles.fullscreenWebview}
              scrollEnabled={true}
              javaScriptEnabled={true}
              scalesPageToFit={true}
              onMessage={handleMessage}
              originWhitelist={['*']}
            />
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  expandButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerBtn: {
    padding: 6,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  fullscreenWebviewContainer: {
    flex: 1,
  },
  fullscreenWebview: {
    flex: 1,
  },
  // Fallback styles
  fallbackScroll: {
    padding: 16,
  },
  errorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
    paddingLeft: 4,
  },
  stepText: {
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  rawCodeText: {
    fontFamily: 'Courier',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
  },
});
