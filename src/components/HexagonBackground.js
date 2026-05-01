import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Polygon, Defs, Pattern, Rect } from 'react-native-svg';
import { Colors } from '../theme/colors';

export default function HexagonBackground() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width="100%" height="100%">
        <Defs>
          <Pattern id="hexagons" width="60" height="103.92" patternUnits="userSpaceOnUse">
            {/* Base pattern for a vertical seamless hexagon grid */}
            <Polygon points="30,0 60,17.32 60,51.96 30,69.28 0,51.96 0,17.32" fill="none" stroke={Colors.primary} strokeWidth="1" strokeOpacity="0.05" />
            <Polygon points="0,51.96 30,69.28 30,103.92 0,121.24 -30,103.92 -30,69.28" fill="none" stroke={Colors.primary} strokeWidth="1" strokeOpacity="0.05" />
            <Polygon points="60,51.96 90,69.28 90,103.92 60,121.24 30,103.92 30,69.28" fill="none" stroke={Colors.primary} strokeWidth="1" strokeOpacity="0.05" />
          </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#hexagons)" />
      </Svg>
    </View>
  );
}
