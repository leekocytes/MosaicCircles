import { useCallback, useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  useColorScheme,
  GestureResponderEvent,
  Animated,
  Text,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  Platform,
  SafeAreaView,
  Pressable,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

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
  const newHue =
    (360 + current.h + (Math.random() > 0.5 ? hueShift : -hueShift)) % 360;

  // More subtle saturation changes
  const saturationShift = Math.floor(Math.random() * 20) - 10; // -10 to +10
  const newSaturation = Math.max(70, Math.min(95, current.s + saturationShift));

  // More subtle lightness changes
  const lightnessShift = Math.floor(Math.random() * 20) - 10; // -10 to +10
  const newLightness = Math.max(40, Math.min(60, current.l + lightnessShift));

  return `hsl(${newHue}, ${newSaturation}%, ${newLightness}%)`;
};

// Colors based on design system
const COLORS = {
  primary: '#8A2BE2', // Futuristic purple
  secondary: '#4B0082', // Indigo
  darkText: {
    primary: Platform.OS === 'android' ? 'rgba(0, 0, 0, 0.87)' : '#000000',
    secondary: Platform.OS === 'android' ? 'rgba(0, 0, 0, 0.54)' : '#757575',
  },
  lightText: {
    primary: '#FFFFFF',
    secondary: 'rgba(255, 255, 255, 0.7)',
  },
  background: {
    light: '#FFFFFF',
    dark: '#121212',
  },
  statusBar: {
    light: 'dark-content',
    dark: 'light-content',
  },
};

// Touch target sizes based on platform
const TOUCH_TARGET = Platform.OS === 'ios' ? 44 : 48;

// Standard margins
const STANDARD_MARGIN = Platform.OS === 'ios' ? 16 : 16;

export default function App() {
  const colorScheme = useColorScheme();
  const [circles, setCircles] = useState<Circle[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const lastColorRef = useRef(
    `hsl(${Math.floor(Math.random() * 360)}, 85%, 50%)`
  );
  const isDark = colorScheme === 'dark';
  const { user, logout, loading } = useAuth();
  const router = useRouter();
  const sidebarAnimation = useRef(new Animated.Value(0)).current;
  
  // Calculate theme-based colors
  const theme = useMemo(() => {
    return {
      background: isDark ? COLORS.background.dark : COLORS.background.light,
      text: isDark ? COLORS.lightText.primary : COLORS.darkText.primary,
      textSecondary: isDark ? COLORS.lightText.secondary : COLORS.darkText.secondary,
      statusBar: isDark ? COLORS.statusBar.dark : COLORS.statusBar.light,
      card: isDark ? '#1E1E1E' : '#F5F5F5',
      ripple: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
    };
  }, [isDark]);

  // Check authentication status and redirect if not logged in
  useEffect(() => {
    const checkAuth = async () => {
      try {
        if (!loading && !user) {
          router.push('/login');
        }
      } catch (error) {
        console.error("Auth error:", error);
      }
    };
    
    checkAuth();
  }, [user, loading, router]);

  const handleTouch = useCallback((event: GestureResponderEvent) => {
    const { pageX, pageY } = event.nativeEvent;
    const opacity = new Animated.Value(1);
    const scale = new Animated.Value(0);

    // Generate the next color based on the last color
    const nextColor = getNextColor(lastColorRef.current);
    lastColorRef.current = nextColor;

    // Trigger haptic feedback when circle is created
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

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

  const handleLogout = async () => {
    try {
      // Platform-specific haptic feedback
      if (Platform.OS === 'ios') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } else {
        // Android haptic feedback
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      
      await logout();
      // No need to navigate - the useEffect will handle this when user becomes null
    } catch (error) {
      console.error('Logout error:', error);
    }
  };
  
  const toggleSidebar = () => {
    // Platform-specific haptic feedback
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      // Android haptic feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    
    const toValue = isSidebarOpen ? 0 : 1;
    
    // Animation curve follows platform conventions
    const config = Platform.OS === 'ios' 
      ? { duration: 300, useNativeDriver: true }
      : { duration: 250, useNativeDriver: true };
      
    Animated.timing(sidebarAnimation, {
      toValue,
      ...config
    }).start();
    
    setIsSidebarOpen(!isSidebarOpen);
  };
  
  const getInitial = (email: string | null) => {
    if (!email) return '?';
    return email.charAt(0).toUpperCase();
  };

  if (loading || !user) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <StatusBar barStyle={theme.statusBar as any} />
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
            Loading...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <StatusBar barStyle={theme.statusBar as any} />
      
      <View
        style={styles.contentContainer}
        onStartShouldSetResponder={() => true}
        onResponderStart={handleTouch}
      >
        {/* Avatar button to open sidebar */}
        <View style={styles.header}>
          <Pressable 
            style={({ pressed }) => [
              styles.avatarButton, 
              // For iOS, show a subtle opacity change on press
              Platform.OS === 'ios' && pressed && { opacity: 0.8 }
            ]} 
            onPress={toggleSidebar}
            // For Android, use ripple effect
            android_ripple={Platform.OS === 'android' ? { color: theme.ripple, borderless: true, radius: TOUCH_TARGET/2 } : undefined}
          >
            {/* Gradient background for avatar */}
            <LinearGradient
              colors={[COLORS.primary, COLORS.secondary]}
              style={styles.avatarGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              angle={135}
            >
              <Text style={styles.avatarText}>{getInitial(user.email)}</Text>
            </LinearGradient>
          </Pressable>
        </View>

        {/* App title */}
        <Text
          style={[
            styles.backgroundText,
            { color: theme.textSecondary },
          ]}
        >
          Mosaic Circles
        </Text>

        {/* Circles generated on touch */}
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
                transform: [{ scale: circle.scale }],
              },
            ]}
          />
        ))}
      </View>
      
      {/* Sidebar with platform-specific styling */}
      <Animated.View style={[
        styles.sidebar,
        { 
          backgroundColor: theme.card,
          transform: [{ 
            translateX: sidebarAnimation.interpolate({
              inputRange: [0, 1],
              outputRange: [-280, 0]
            }) 
          }]
        },
        // Platform-specific sidebar styling
        Platform.OS === 'ios' ? styles.sidebarIOS : styles.sidebarAndroid
      ]}>
        <View style={styles.sidebarContent}>
          <View style={styles.sidebarHeader}>
            <Pressable 
              style={({ pressed }) => [
                styles.closeSidebarButton,
                Platform.OS === 'ios' && pressed && { opacity: 0.7 }
              ]} 
              onPress={toggleSidebar}
              android_ripple={Platform.OS === 'android' ? { color: theme.ripple, borderless: true } : undefined}
            >
              <Ionicons 
                name={Platform.OS === 'ios' ? 'close' : 'close'} 
                size={24} 
                color={theme.text} 
              />
            </Pressable>
          </View>
          
          <View style={styles.userInfoContainer}>
            <LinearGradient
              colors={[COLORS.primary, COLORS.secondary]}
              style={styles.avatarLarge}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              angle={135}
            >
              <Text style={styles.avatarTextLarge}>{getInitial(user.email)}</Text>
            </LinearGradient>
            
            <Text style={[styles.userEmail, { color: theme.text, marginTop: 12 }]}>
              {user.email}
            </Text>
          </View>
          
          <Pressable 
            style={({ pressed }) => [
              styles.logoutButton, 
              { backgroundColor: pressed && Platform.OS === 'ios' ? theme.ripple : 'transparent' },
              pressed && Platform.OS === 'ios' && { backgroundColor: theme.ripple }
            ]} 
            onPress={handleLogout}
            android_ripple={Platform.OS === 'android' ? { color: theme.ripple } : undefined}
          >
            <LinearGradient
              colors={[COLORS.primary, COLORS.secondary]}
              style={styles.logoutButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              angle={135}
            >
              <Ionicons 
                name="log-out-outline" 
                size={20} 
                color={COLORS.lightText.primary} 
              />
              <Text style={styles.logoutText}>Logout</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </Animated.View>
      
      {/* Backdrop overlay when sidebar is open */}
      {isSidebarOpen && (
        <Pressable 
          style={styles.backdrop} 
          onPress={toggleSidebar}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    padding: STANDARD_MARGIN,
    paddingTop: Platform.OS === 'ios' ? 0 : STANDARD_MARGIN,
    zIndex: 10,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userEmail: {
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    fontWeight: '500',
  },
  logoutButton: {
    marginTop: 24,
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: 8,
    alignSelf: 'stretch',
    minHeight: TOUCH_TARGET,
  },
  logoutButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  logoutText: {
    fontSize: 16,
    marginLeft: 8,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    fontWeight: '600',
    color: COLORS.lightText.primary,
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
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    fontWeight: '700',
    top: 200,
    letterSpacing: -0.5,
    pointerEvents: 'none',
  },
  avatarButton: {
    width: TOUCH_TARGET,
    height: TOUCH_TARGET,
    borderRadius: TOUCH_TARGET / 2,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: COLORS.lightText.primary,
    fontSize: 18,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    fontWeight: 'bold',
  },
  sidebar: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 280,
    height: '100%',
    zIndex: 20,
  },
  // iOS specific sidebar styling
  sidebarIOS: {
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  // Android specific sidebar styling
  sidebarAndroid: {
    elevation: 8,
  },
  sidebarContent: {
    flex: 1,
    padding: STANDARD_MARGIN,
    paddingTop: Platform.OS === 'ios' ? 48 : STANDARD_MARGIN * 2,
  },
  sidebarHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: STANDARD_MARGIN,
  },
  closeSidebarButton: {
    minWidth: TOUCH_TARGET,
    minHeight: TOUCH_TARGET,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInfoContainer: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 32,
  },
  avatarLarge: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarTextLarge: {
    color: COLORS.lightText.primary,
    fontSize: 36,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    fontWeight: 'bold',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 15,
  },
});
