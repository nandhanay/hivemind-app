import React, { useRef, useMemo, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Modal, Text, Share, Alert } from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { SafeAreaView } from 'react-native-safe-area-context';

/**
 * Renders a Mermaid.js diagram in a WebView with zoom and fullscreen modal support.
 * @param {object} props
 * @param {string} props.code — Mermaid diagram source code
 * @param {number} [props.height] — Container height (default 300)
 */
export default function MermaidViewer({ code, height = 300 }) {
  const { colors, isDarkMode } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);

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
</head>
<body>
  <div id="diagram" class="mermaid">
${code}
  </div>
  <script>
    mermaid.initialize({
      startOnLoad: true,
      theme: '${theme}',
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

  const embeddedHtml = useMemo(() => getHtml(false), [code, colors, isDarkMode]);
  const fullscreenHtml = useMemo(() => getHtml(true), [code, colors, isDarkMode]);

  const handleShareDiagram = async () => {
    try {
      await Share.share({
        message: `📊 HiveMind Study Flowchart Diagram:\n\n\`\`\`mermaid\n${code}\n\`\`\``,
        title: 'Study Flowchart Diagram',
      });
    } catch (e) {
      Alert.alert('Error', 'Failed to share diagram: ' + e.message);
    }
  };

  if (!code) return null;

  return (
    <View style={[styles.container, { height, borderColor: colors.glassBorder }]}>
      <WebView
        source={{ html: embeddedHtml }}
        style={styles.webview}
        scrollEnabled={false}
        javaScriptEnabled={true}
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
});
