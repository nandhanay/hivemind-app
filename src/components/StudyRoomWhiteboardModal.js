import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  PanResponder,
  Dimensions,
  Alert,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import Svg, { Polyline, Rect } from 'react-native-svg';
import { useTheme } from '../theme/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { addWhiteboardStroke, clearWhiteboardStrokes, subscribeWhiteboardStrokes } from '../firebase/services/studyRoomService';

const COLORS = ['#FBC02D', '#FFFFFF', '#64B5F6', '#81C784', '#CE93D8', '#FF8A65'];

function encodePoints(pts) {
  return pts.map(([x, y]) => `${Math.round(x)}:${Math.round(y)}`).join('|');
}

function decodePoints(s) {
  if (!s || typeof s !== 'string') return [];
  return s.split('|').map((pair) => {
    const [x, y] = pair.split(':').map(Number);
    return [Number.isNaN(x) ? 0 : x, Number.isNaN(y) ? 0 : y];
  });
}

function pointsToSvgString(pts) {
  return pts.map(([x, y]) => `${x},${y}`).join(' ');
}

const StrokeLayer = React.memo(function SL({ strokes, boardW, boardH, bg }) {
  return (
    <Svg width={boardW} height={boardH} style={StyleSheet.absoluteFill}>
      <Rect x={0} y={0} width={boardW} height={boardH} fill={bg} opacity={0.94} />
      {strokes.map((s) => {
        if (s.kind === 'text') return null;
        const pts = decodePoints(s.path);
        if (pts.length < 2) return null;
        const opacity = s.tool === 'highlighter' ? 0.35 : 1;
        return (
          <Polyline
            key={s.id}
            points={pointsToSvgString(pts)}
            fill="none"
            stroke={s.color || '#FBC02D'}
            strokeWidth={s.width || 3}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={opacity}
          />
        );
      })}
    </Svg>
  );
});

export default function StudyRoomWhiteboardModal({ visible, onClose, roomId, userId, isDarkMode }) {
  const { colors, Typography } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const [strokes, setStrokes] = useState([]);
  const [tool, setTool] = useState('draw');
  const [color, setColor] = useState(COLORS[0]);
  const [width, setWidth] = useState(3);
  const [layout, setLayout] = useState({ w: 320, h: 220 });
  const currentRef = useRef([]);

  useEffect(() => {
    if (!visible || !roomId) return undefined;
    return subscribeWhiteboardStrokes(roomId, setStrokes);
  }, [visible, roomId]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (e) => {
          const { locationX, locationY } = e.nativeEvent;
          currentRef.current = [[locationX, locationY]];
        },
        onPanResponderMove: (e) => {
          const { locationX, locationY } = e.nativeEvent;
          const last = currentRef.current[currentRef.current.length - 1];
          const dx = Math.abs(locationX - last[0]);
          const dy = Math.abs(locationY - last[1]);
          if (dx + dy > 1.5) currentRef.current.push([locationX, locationY]);
        },
        onPanResponderRelease: async () => {
          const pts = currentRef.current;
          currentRef.current = [];
          if (pts.length < 2) return;
          const path = encodePoints(pts);
          if (path.length > 4000) return;
          let strokeColor = color;
          let w = width;
          if (tool === 'erase') {
            strokeColor = colors.background;
            w = 14;
          } else if (tool === 'highlighter') {
            w = 16;
          }
          await addWhiteboardStroke(roomId, {
            kind: 'path',
            path,
            color: strokeColor,
            width: w,
            tool,
            createdBy: userId || '',
          });
        },
      }),
    [color, width, tool, roomId, userId, colors.background]
  );

  const hPct = expanded ? 0.9 : 0.42;
  const winH = Dimensions.get('window').height;

  const onClear = () => {
    Alert.alert('Clear hive board?', 'Removes strokes for everyone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: () => clearWhiteboardStrokes(roomId) },
    ]);
  };

  const addTextLabel = () => {
    if (Platform.OS === 'ios') {
      Alert.prompt('Hive note', '', async (text) => {
        const t = (text || '').trim();
        if (!t) return;
        await addWhiteboardStroke(roomId, {
          kind: 'text',
          path: encodePoints([[layout.w / 2, layout.h / 2]]),
          text: t.slice(0, 80),
          color,
          width: 1,
          tool: 'text',
          x: layout.w / 2,
          y: layout.h / 2,
          createdBy: userId || '',
        });
      });
    } else {
      Alert.alert('Hive note', 'Text labels: use iOS or draw for now on Android.');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={[styles.overlay, { paddingTop: expanded ? 36 : 80 }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <BlurView intensity={28} tint="dark" style={[styles.sheet, { height: winH * hPct, borderColor: colors.glassBorder }]}>
          <View style={styles.sheetHeader}>
            <Text style={[Typography.h3, { color: colors.text }]}>Hive canvas</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity onPress={() => setExpanded((e) => !e)} style={styles.iconHit}>
                <Ionicons name={expanded ? 'contract-outline' : 'expand-outline'} size={22} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose} style={styles.iconHit}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
          </View>
          <Text style={[Typography.caption, { color: colors.textSecondary, marginBottom: 8 }]}>
            Draw together — synced live.
          </Text>
          <View
            style={[styles.board, { borderColor: colors.glassBorder }]}
            onLayout={(e) => {
              const { width: w, height: h } = e.nativeEvent.layout;
              if (w > 0 && h > 0) setLayout({ w, h });
            }}
            {...panResponder.panHandlers}
          >
            <StrokeLayer strokes={strokes} boardW={layout.w} boardH={layout.h} bg={colors.surface} />
            {strokes
              .filter((s) => s.kind === 'text' && s.text)
              .map((s) => (
                <View
                  key={s.id}
                  style={[
                    styles.textStamp,
                    {
                      left: Math.min(s.x || 0, layout.w - 120),
                      top: Math.max(8, (s.y || 0) - 20),
                      borderColor: colors.primary,
                      backgroundColor: colors.shimmer,
                    },
                  ]}
                  pointerEvents="none"
                >
                  <Text style={{ color: colors.text, fontSize: 12, fontWeight: '700' }} numberOfLines={2}>
                    {s.text}
                  </Text>
                </View>
              ))}
          </View>
          <View style={styles.toolbar}>
            <TouchableOpacity onPress={() => setTool('draw')} style={[styles.tchip, tool === 'draw' && { borderColor: colors.primary }]}>
              <Ionicons name="brush-outline" size={18} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setTool('highlighter')} style={[styles.tchip, tool === 'highlighter' && { borderColor: colors.primary }]}>
              <Ionicons name="color-filter-outline" size={18} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setTool('erase')} style={[styles.tchip, tool === 'erase' && { borderColor: colors.danger }]}>
              <Ionicons name="backspace-outline" size={18} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity onPress={addTextLabel} style={styles.tchip}>
              <Ionicons name="text-outline" size={18} color={colors.text} />
            </TouchableOpacity>
            {COLORS.map((c) => (
              <TouchableOpacity key={c} onPress={() => setColor(c)} style={[styles.colorDot, { backgroundColor: c, borderColor: color === c ? colors.text : 'transparent' }]} />
            ))}
            <TouchableOpacity onPress={onClear} style={[styles.tchip, { marginLeft: 'auto', borderColor: colors.danger }]}>
              <Ionicons name="trash-outline" size={18} color={colors.danger} />
            </TouchableOpacity>
          </View>
        </BlurView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { marginHorizontal: 12, marginBottom: 18, borderRadius: 22, borderWidth: 1, overflow: 'hidden', padding: 14 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  iconHit: { padding: 6 },
  board: { flex: 1, minHeight: 160, borderRadius: 16, borderWidth: 1, overflow: 'hidden', marginBottom: 10 },
  textStamp: { position: 'absolute', maxWidth: 140, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, borderWidth: 1 },
  toolbar: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  tchip: { padding: 8, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', marginRight: 6, marginBottom: 6 },
  colorDot: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, marginRight: 6, marginBottom: 6 },
});
