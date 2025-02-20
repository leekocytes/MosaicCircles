import { useCallback, useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  useColorScheme,
  GestureResponderEvent,
  Animated,
  Text,
} from 'react-native';

type Circle = {
  id: number;
  x: number;
  y: number;
  opacity: Animated.Value;
  scale: Animated.Value;
  color: string;
};

type HSL = {
  h: number;
  s: number;
  l: number;
};

const parseHSL = (hslString: string): HSL => {
  const matches = hslString.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
  if (!matches) return { h: 0, s: 70, l: 50 };
  return {
    h: parseInt(matches[1], 10),
    s: parseInt(matches[2], 10),
    l: parseInt(matches[3], 10),
  };
};

const getNextColor = (prevColor: string): string => {
  const current = parseHSL(prevColor);
  
  // Smaller hue shifts for more gradual transitions
  const isLargeShift = Math.random() > 0.7; // Reduce frequency of large shifts
  
  // More subtle hue shifts
  const hueShift = isLargeShift
    ? Math.floor(Math.random() * 60) + 30 // Large shift: 30-90 degrees
    : Math.floor(Math.random() * 30) + 15; // Small shift: 15-45 degrees
  
  // Randomly decide whether to add or subtract the hue shift
  const newHue = (360 + current.h + (Math.random() > 0.5 ? hueShift : -hueShift)) % 360;
  
  // More subtle saturation changes
  const saturationShift = Math.floor(Math.random() * 20) - 10; // -10 to +10
  const newSaturation = Math.max(70, Math.min(95, current.s + saturationShift));
  
  // More subtle lightness changes
  const lightnessShift = Math.floor(Math.random() * 20) - 10; // -10 to +10
  const newLightness = Math.max(40, Math.min(60, current.l + lightnessShift));
  
  return `hsl(${newHue}, ${newSaturation}%, ${newLightness}%)`;
};

export default function App() {
  const colorScheme = useColorScheme();
  const [circles, setCircles] = useState<Circle[]>([]);
  const lastColorRef = useRef(`hsl(${Math.floor(Math.random() * 360)}, 85%, 50%)`);
  const isDark = colorScheme === 'dark';

  const handleTouch = useCallback((event: GestureResponderEvent) => {
    const { pageX, pageY } = event.nativeEvent;
    const opacity = new Animated.Value(1);
    const scale = new Animated.Value(0);

    // Generate the next color based on the last color
    const nextColor = getNextColor(lastColorRef.current);
    lastColorRef.current = nextColor;

    const newCircle: Circle = {
      id: Date.now(),
      x: pageX,
      y: pageY,
      opacity,
      scale,
      color: nextColor,
    };

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: 2000, // Increased duration for more gradual fade
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 3,
        duration: 2000, // Increased duration for more gradual scaling
        useNativeDriver: true,
      }),
    ]).start(() => {
      setCircles((prev) => prev.filter((circle) => circle.id !== newCircle.id));
    });

    setCircles((prev) => [...prev, newCircle]);
  }, []);

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: isDark ? '#000' : '#fff' },
      ]}
      onStartShouldSetResponder={() => true}
      onResponderStart={handleTouch}
    >
      <Text 
        style={[
          styles.backgroundText,
          { color: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)' }
        ]}
      >
        Mosaic Circles
      </Text>
      {circles.map((circle) => (
        <Animated.View
          key={circle.id}
          pointerEvents="none"
          style={[
            styles.circle,
            {
              left: circle.x - 50,
              top: circle.y - 50,
              borderColor: circle.color,
              opacity: circle.opacity,
              transform: [
                { scale: circle.scale }
              ],
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  circle: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    backgroundColor: 'transparent',
  },
  backgroundText: {
    position: 'absolute',
    width: '100%',
    textAlign: 'center',
    fontSize: 24,
    fontFamily: 'Inter',
    fontWeight: '700',
    top: 200,
    letterSpacing: -0.5,
    pointerEvents: 'none',
  },
});