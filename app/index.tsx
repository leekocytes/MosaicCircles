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
  Alert,
  AppState,
  Image,
  Modal,
  ScrollView,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Line } from 'react-native-svg';

type Tile = {
  id: number;
  value: number;
  isMatched: boolean;
  isMerging: boolean;
  position: {
    x: number;
    y: number;
  };
  scale: Animated.Value;
  opacity: Animated.Value;
};

type GameState = 'idle' | 'countdown' | 'playing' | 'gameover';

// Game configuration constants
const GAME_DURATION = 90; // Game duration in seconds
const GRID_SIZE = 4; // 4x4 grid
const TILE_MARGIN = 8; // Space between tiles
const BASE_SCORE_PER_MERGE = 10;
const COMBO_MULTIPLIER = 1.5; // Score multiplier for combos

// Color based design system
const COLORS = {
  primary: '#8A2BE2', // Futuristic purple
  secondary: '#4B0082', // Indigo
  accent: '#FF5722', // Attention color for UI elements
  success: '#4CAF50', // For successful actions
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
  tileColors: {
    2: '#EEE4DA',
    4: '#EDE0C8',
    8: '#F2B179',
    16: '#F59563',
    32: '#F67C5F',
    64: '#F65E3B',
    128: '#EDCF72',
    256: '#EDCC61',
    512: '#EDC850',
    1024: '#EDC53F',
    2048: '#EDC22E',
  },
  tileFonts: {
    2: '#776E65',
    4: '#776E65',
    8: '#F9F6F2',
    16: '#F9F6F2',
    32: '#F9F6F2',
    64: '#F9F6F2',
    128: '#F9F6F2',
    256: '#F9F6F2',
    512: '#F9F6F2',
    1024: '#F9F6F2',
    2048: '#F9F6F2',
  }
};

// Touch target sizes based on platform
const TOUCH_TARGET = Platform.OS === 'ios' ? 44 : 48;

// Standard margins
const STANDARD_MARGIN = Platform.OS === 'ios' ? 16 : 16;

// Get color for tile based on value
const getTileColor = (value: number): string => {
  return COLORS.tileColors[value as keyof typeof COLORS.tileColors] || '#CDC1B4';
};

// Get font color for tile based on value
const getTileFontColor = (value: number): string => {
  return COLORS.tileFonts[value as keyof typeof COLORS.tileFonts] || '#776E65';
};

function Mosaic2048Game() {
  const colorScheme = useColorScheme();
  const { width: SCREEN_WIDTH } = Dimensions.get('window');
  const TILE_SIZE = useMemo(() => {
    return (SCREEN_WIDTH - (STANDARD_MARGIN * 2) - (TILE_MARGIN * (GRID_SIZE + 1))) / GRID_SIZE;
  }, [SCREEN_WIDTH]);
  
  const [grid, setGrid] = useState<(Tile | null)[][]>(Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null)));
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [gameState, setGameState] = useState<GameState>('idle');
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [highScore, setHighScore] = useState(0);
  const [countdown, setCountdown] = useState(3);
  const [mergeStreak, setMergeStreak] = useState(0);
  const [lastMergeTime, setLastMergeTime] = useState(0);
  const [showInstructions, setShowInstructions] = useState(false);
  
  const isDark = colorScheme === 'dark';
  const { user, logout, loading } = useAuth();
  const router = useRouter();
  const sidebarAnimation = useRef(new Animated.Value(0)).current;
  const gameTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const tileIdCounter = useRef(0);
  
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
  
  // Function to create a new tile
  const createTile = useCallback((x: number, y: number, value: number = 2): Tile => {
    const id = Date.now() + tileIdCounter.current++;
    return {
      id,
      value,
      isMatched: false,
      isMerging: false,
      position: { x, y },
      scale: new Animated.Value(0),
      opacity: new Animated.Value(1)
    };
  }, []);

  // Function to get empty cells in the grid
  const getEmptyCells = useCallback(() => {
    const emptyCells: {x: number, y: number}[] = [];
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        if (grid[y][x] === null) {
          emptyCells.push({x, y});
        }
      }
    }
    return emptyCells;
  }, [grid]);

  // Add a new tile to the grid
  const addRandomTile = useCallback(() => {
    const emptyCells = getEmptyCells();
    if (emptyCells.length === 0) return;
    
    const randomIndex = Math.floor(Math.random() * emptyCells.length);
    const cell = emptyCells[randomIndex];
    const value = Math.random() < 0.9 ? 2 : 4; // 90% chance for 2, 10% chance for 4
    
    const newTile = createTile(cell.x, cell.y, value);
    
    // Update grid and tiles state atomically to maintain consistency
    setGrid(prevGrid => {
      const newGrid = [...prevGrid.map(row => [...row])];
      
      // Double-check that the cell is still empty before placing the tile
      if (newGrid[cell.y][cell.x] !== null) {
        console.warn('Attempted to place tile in non-empty cell!');
        return prevGrid; // Don't update grid if cell is now occupied
      }
      
      newGrid[cell.y][cell.x] = newTile;
      return newGrid;
    });
    
    setTiles(prevTiles => [...prevTiles, newTile]);
    
    // Animate the new tile
    Animated.spring(newTile.scale, {
      toValue: 1,
      speed: 12,
      bounciness: 8,
      useNativeDriver: true
    }).start();
    
    return newTile;
  }, [createTile, getEmptyCells]);

  // Function to check if the board is full
  const isBoardFull = useCallback(() => {
    return getEmptyCells().length === 0;
  }, [getEmptyCells]);

  // Function to check if any moves are possible
  const hasAvailableMoves = useCallback(() => {
    // If board isn't full, moves are possible
    if (!isBoardFull()) return true;
    
    // Check for adjacent tiles with same value
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const tile = grid[y][x];
        if (!tile) continue;
        
        // Check right and bottom neighbors
        if (x < GRID_SIZE - 1 && grid[y][x+1] && grid[y][x+1]!.value === tile.value) return true;
        if (y < GRID_SIZE - 1 && grid[y+1][x] && grid[y+1][x]!.value === tile.value) return true;
      }
    }
    
    return false;
  }, [grid, isBoardFull]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (gameTimerRef.current) clearInterval(gameTimerRef.current);
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, []);
  
  // Reset game if user switches away and comes back while in countdown
  useEffect(() => {
    const appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        if (gameState === 'countdown') {
          if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
          setGameState('idle');
        }
      }
    });
    
    return () => {
      appStateSubscription.remove();
    };
  }, [gameState]);
  
  // Game timer countdown
  useEffect(() => {
    if (gameState === 'playing') {
      gameTimerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            endGame();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        if (gameTimerRef.current) clearInterval(gameTimerRef.current);
      };
    }
  }, [gameState]);
  
  const startCountdown = () => {
    setGameState('countdown');
    setCountdown(3);
    
    // Play initial haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    countdownTimerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownTimerRef.current!);
          startGame();
          return 0;
        }
        
        // Play countdown sound
        Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success
        );
        
        return prev - 1;
      });
    }, 1000);
  };
  
  const startGame = () => {
    // Clear existing state
    setGameState('playing');
    setGrid(Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null)));
    setTiles([]);
    setScore(0);
    setMergeStreak(0);
    setTimeLeft(GAME_DURATION);
    
    // Add initial tiles
    setTimeout(() => {
      addRandomTile();
      addRandomTile();
      
      // Play game start sound with stronger haptic
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Add a slight delay and second haptic for better feedback
      setTimeout(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      }, 150);
    }, 200);
  };
  
  const endGame = () => {
    setGameState('gameover');
    if (gameTimerRef.current) clearInterval(gameTimerRef.current);
    
    // Update high score if needed
    if (score > highScore) {
      setHighScore(score);
    }
    
    // Play game over sound
    Haptics.notificationAsync(
      Haptics.NotificationFeedbackType.Error
    );
  };
  
  const resetGame = () => {
    setGameState('idle');
    setGrid(Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null)));
    setTiles([]);
  };

  // Process a swipe gesture
  const handleSwipe = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
    // Ignore if sidebar is open or game is not playing
    if (isSidebarOpen || gameState !== 'playing') return;
    
    // Create a copy of the grid for processing
    const gridCopy = grid.map(row => [...row]);
    let moved = false;
    let mergedTiles: Tile[] = [];
    
    // Time for calculating combo
    const currentTime = Date.now();
    const timeSinceLastMerge = currentTime - lastMergeTime;
    let newMergeStreak = mergeStreak;
    
    // Calculate if this merge is part of a streak (less than 2 seconds between moves)
    if (timeSinceLastMerge < 2000) {
      newMergeStreak++;
    } else {
      newMergeStreak = 0;
    }
    
    // Reset isMatched flag on all tiles to allow merging on each new swipe
    gridCopy.forEach(row => {
      row.forEach(tile => {
        if (tile) {
          tile.isMatched = false;
        }
      });
    });
    
    // Matrix transposition helper (for handling up/down the same as left/right)
    const transpose = (matrix: (Tile | null)[][]) => {
      const rows = matrix.length;
      const cols = matrix[0].length;
      const result = Array(cols).fill(null).map(() => Array(rows).fill(null));
      
      for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
          result[j][i] = matrix[i][j];
        }
      }
      
      return result;
    };
    
    // Flip matrix horizontally (for handling right the same as left)
    const flipHorizontally = (matrix: (Tile | null)[][]) => {
      return matrix.map(row => [...row].reverse());
    };
    
    // Process one row in left direction
    const moveRowLeft = (row: (Tile | null)[]) => {
      // Remove nulls and create a new array with tiles
      const tiles = row.filter(tile => tile !== null) as Tile[];
      const resultRow = Array(GRID_SIZE).fill(null);
      let resultIdx = 0;
      
      // Process tiles
      for (let i = 0; i < tiles.length; i++) {
        const currentTile = tiles[i];
        
        // If we can merge with the previous tile
        if (i > 0 && tiles[i-1].value === currentTile.value && !tiles[i-1].isMatched) {
          // Mark the previous tile as matched
          tiles[i-1].isMatched = true;
          tiles[i-1].isMerging = true;
          
          // Double the value
          tiles[i-1].value *= 2;
          
          // Calculate score with combo multiplier
          const mergeValue = tiles[i-1].value;
          const comboMultiplier = Math.pow(COMBO_MULTIPLIER, newMergeStreak);
          const points = Math.floor(BASE_SCORE_PER_MERGE * mergeValue * comboMultiplier);
          
          // Add to score
          setScore(prevScore => prevScore + points);
          
          // Add to merged tiles array
          mergedTiles.push(tiles[i-1]);
          
          // Remove current tile by not adding it to result
          moved = true;
        } else {
          // Just move the tile
          if (resultIdx !== i || row[resultIdx] !== currentTile) {
            moved = true;
          }
          
          resultRow[resultIdx] = currentTile;
          resultIdx++;
        }
      }
      
      return resultRow;
    };
    
    // Safely process rows (handle null values)
    const safeProcessRow = (row: (Tile | null)[]) => {
      if (!row || row.length === 0) return Array(GRID_SIZE).fill(null);
      return moveRowLeft(row);
    };
    
    // Safely flip horizontally (handle null values)
    const safeFlipHorizontally = (row: (Tile | null)[]) => {
      if (!row || row.length === 0) return Array(GRID_SIZE).fill(null);
      return [...row].reverse();
    };
    
    // Process grid based on direction
    if (direction === 'left') {
      for (let i = 0; i < GRID_SIZE; i++) {
        if (gridCopy[i]) {
          gridCopy[i] = safeProcessRow(gridCopy[i]);
        }
      }
    } else if (direction === 'right') {
      for (let i = 0; i < GRID_SIZE; i++) {
        if (gridCopy[i]) {
          gridCopy[i] = safeFlipHorizontally(safeProcessRow(safeFlipHorizontally(gridCopy[i])));
        }
      }
    } else if (direction === 'up') {
      const transposed = transpose(gridCopy);
      for (let i = 0; i < GRID_SIZE; i++) {
        if (transposed[i]) {
          transposed[i] = safeProcessRow(transposed[i]);
        }
      }
      for (let i = 0; i < GRID_SIZE; i++) {
        for (let j = 0; j < GRID_SIZE; j++) {
          if (transposed[j]) {
            gridCopy[i][j] = transposed[j][i];
          }
        }
      }
    } else if (direction === 'down') {
      const transposed = transpose(gridCopy);
      for (let i = 0; i < GRID_SIZE; i++) {
        if (transposed[i]) {
          transposed[i] = safeFlipHorizontally(safeProcessRow(safeFlipHorizontally(transposed[i])));
        }
      }
      for (let i = 0; i < GRID_SIZE; i++) {
        for (let j = 0; j < GRID_SIZE; j++) {
          if (transposed[j]) {
            gridCopy[i][j] = transposed[j][i];
          }
        }
      }
    }
    
    // If nothing moved, don't update state
    if (!moved) return;
    
    // Update streak timer
    if (mergedTiles.length > 0) {
      // Play merge haptic feedback
      Haptics.impactAsync(
        mergedTiles.some(tile => tile.value >= 8) 
          ? Haptics.ImpactFeedbackStyle.Heavy 
          : Haptics.ImpactFeedbackStyle.Medium
      );
      
      setLastMergeTime(currentTime);
      setMergeStreak(newMergeStreak);
    } else {
      // Play move haptic feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    // Update grid and animate merged tiles
    setGrid(gridCopy);
    
    // Animate merged tiles
    mergedTiles.forEach(tile => {
      Animated.sequence([
        Animated.timing(tile.scale, {
          toValue: 1.2,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(tile.scale, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start(() => {
        tile.isMerging = false;
      });
    });
    
    // Add a new random tile after a short delay
    setTimeout(() => {
      addRandomTile();
      
      // Check if game is over
      setTimeout(() => {
        if (!hasAvailableMoves()) {
          endGame();
        }
      }, 300);
    }, 300);
  }, [grid, isSidebarOpen, gameState, mergeStreak, lastMergeTime, addRandomTile, hasAvailableMoves]);
  
  // Handle touch gestures on the board
  const handleTouchStart = useRef({ x: 0, y: 0 });
  const handleTouchMove = useRef({ x: 0, y: 0 });
  const isSwiping = useRef(false);
  
  const onTouchStart = useCallback((event: GestureResponderEvent) => {
    if (gameState !== 'playing') return;
    
    const { pageX, pageY } = event.nativeEvent;
    handleTouchStart.current = { x: pageX, y: pageY };
    handleTouchMove.current = { x: pageX, y: pageY };
    isSwiping.current = false;
  }, [gameState]);
  
  const onTouchMove = useCallback((event: GestureResponderEvent) => {
    if (gameState !== 'playing') return;
    
    const { pageX, pageY } = event.nativeEvent;
    handleTouchMove.current = { x: pageX, y: pageY };
  }, [gameState]);
  
  const onTouchEnd = useCallback(() => {
    if (gameState !== 'playing' || isSwiping.current) return;
    
    const dx = handleTouchMove.current.x - handleTouchStart.current.x;
    const dy = handleTouchMove.current.y - handleTouchStart.current.y;
    
    // Minimum swipe distance to trigger action
    const MIN_SWIPE = 40;
    
    if (Math.abs(dx) < MIN_SWIPE && Math.abs(dy) < MIN_SWIPE) return;
    
    isSwiping.current = true;
    
    if (Math.abs(dx) > Math.abs(dy)) {
      // Horizontal swipe
      handleSwipe(dx > 0 ? 'right' : 'left');
    } else {
      // Vertical swipe
      handleSwipe(dy > 0 ? 'down' : 'up');
    }
  }, [gameState, handleSwipe]);

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
    
    // Pause game without ending it
    let wasPlaying = false;
    if (gameState === 'playing') {
      wasPlaying = true;
      if (gameTimerRef.current) clearInterval(gameTimerRef.current);
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
    
    // If we're closing the sidebar and were playing before, restart the timer
    if (isSidebarOpen && wasPlaying) {
      gameTimerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            endGame();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    
    setIsSidebarOpen(!isSidebarOpen);
  };
  
  const getInitial = (email: string | null) => {
    if (!email) return '?';
    return email.charAt(0).toUpperCase();
  };
  
  // Render lines between connected circles
  // Render the game board grid with tiles
  const renderGameBoard = () => {
    const tileSize = TILE_SIZE;
    return (
      <View style={styles.gameBoard}>
        {/* Grid background */}
        <View style={styles.gridBackground}>
          {Array(GRID_SIZE).fill(null).map((_, rowIndex) => (
            <View key={`row-${rowIndex}`} style={styles.gridRow}>
              {Array(GRID_SIZE).fill(null).map((_, colIndex) => (
                <View 
                  key={`cell-${rowIndex}-${colIndex}`} 
                  style={[
                    styles.gridCell,
                    {
                      width: tileSize,
                      height: tileSize,
                    }
                  ]} 
                />
              ))}
            </View>
          ))}
        </View>
        
        {/* Tiles */}
        {tiles.map(tile => {
          // Find the tile in the grid to get its current position
          let found = false;
          let gridX = 0;
          let gridY = 0;
          
          // Find the current position
          for (let y = 0; y < GRID_SIZE; y++) {
            for (let x = 0; x < GRID_SIZE; x++) {
              if (grid[y][x] && grid[y][x]!.id === tile.id) {
                // Update the tile's value from the grid to ensure consistency
                if (tile.value !== grid[y][x]!.value) {
                  tile.value = grid[y][x]!.value;
                }
                gridX = x;
                gridY = y;
                found = true;
                break;
              }
            }
            if (found) break;
          }
          
          if (!found) return null; // Tile not in grid anymore
          
          // Calculate tile position
          const top = STANDARD_MARGIN + TILE_MARGIN + (tileSize + TILE_MARGIN) * gridY;
          const left = STANDARD_MARGIN + TILE_MARGIN + (tileSize + TILE_MARGIN) * gridX;
          
          return (
            <Animated.View
              key={tile.id}
              style={[
                styles.tile,
                {
                  top,
                  left,
                  backgroundColor: getTileColor(tile.value),
                  width: tileSize,
                  height: tileSize,
                  transform: [{ scale: tile.scale }],
                },
                tile.isMerging && styles.mergingTile
              ]}
            >
              <Text 
                style={[
                  styles.tileText, 
                  { 
                    color: getTileFontColor(tile.value),
                    fontSize: tile.value >= 128 ? 24 : tile.value >= 1024 ? 20 : 30
                  }
                ]}
              >
                {tile.value}
              </Text>
            </Animated.View>
          );
        })}
      </View>
    );
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

  // Instructions Modal Component
  const renderInstructionsModal = () => (
    <Modal
      visible={showInstructions}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowInstructions(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.instructionsContainer, { backgroundColor: theme.background }]}>
          <LinearGradient
            colors={[COLORS.primary, COLORS.secondary]}
            style={styles.instructionsHeader}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.instructionsTitle}>HOW TO PLAY</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowInstructions(false)}
            >
              <MaterialIcons name="close" size={24} color="white" />
            </TouchableOpacity>
          </LinearGradient>
          
          <ScrollView style={styles.instructionsContent}>
            <View style={styles.instructionSection}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Game Objective</Text>
              <Text style={[styles.instructionText, { color: theme.textSecondary }]}>
                Merge tiles with the same number to create higher numbers and earn points. Try to reach the highest score possible before time runs out!
              </Text>
            </View>
            
            <View style={styles.instructionSection}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Basic Controls</Text>
              <View style={styles.instructionItem}>
                <MaterialIcons name="swipe" size={24} color={COLORS.primary} />
                <Text style={[styles.instructionText, { color: theme.textSecondary }]}>Swipe up, down, left, or right to move all tiles on the board</Text>
              </View>
              <View style={styles.instructionItem}>
                <MaterialIcons name="merge-type" size={24} color={COLORS.primary} />
                <Text style={[styles.instructionText, { color: theme.textSecondary }]}>When two tiles with the same number touch, they merge into one with double the value</Text>
              </View>
              <View style={styles.instructionItem}>
                <MaterialIcons name="add-circle" size={24} color={COLORS.primary} />
                <Text style={[styles.instructionText, { color: theme.textSecondary }]}>After each move, a new tile (either 2 or 4) appears on the board</Text>
              </View>
            </View>
            
            <View style={styles.instructionSection}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Scoring System</Text>
              <View style={styles.instructionItem}>
                <MaterialIcons name="trending-up" size={24} color={COLORS.primary} />
                <Text style={[styles.instructionText, { color: theme.textSecondary }]}>Base score: 10 × tile value for each merge</Text>
              </View>
              <View style={styles.instructionItem}>
                <MaterialIcons name="bolt" size={24} color={COLORS.primary} />
                <Text style={[styles.instructionText, { color: theme.textSecondary }]}>Combo streaks: Merging tiles within 2 seconds activates a combo multiplier!</Text>
              </View>
              <View style={styles.instructionItem}>
                <MaterialIcons name="star-rate" size={24} color={COLORS.primary} />
                <Text style={[styles.instructionText, { color: theme.textSecondary }]}>Each combo level multiplies your score by 1.5×</Text>
              </View>
            </View>
            
            <View style={styles.instructionSection}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Time Limit</Text>
              <View style={styles.instructionItem}>
                <MaterialIcons name="timer" size={24} color={COLORS.primary} />
                <Text style={[styles.instructionText, { color: theme.textSecondary }]}>Each game lasts 90 seconds</Text>
              </View>
              <View style={styles.instructionItem}>
                <MaterialIcons name="warning" size={24} color={COLORS.primary} />
                <Text style={[styles.instructionText, { color: theme.textSecondary }]}>Timer turns red when only 5 seconds remain</Text>
              </View>
            </View>
            
            <View style={styles.instructionSection}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Advanced Tips</Text>
              <View style={styles.tipItem}>
                <View style={styles.tipNumber}>
                  <Text style={styles.tipNumberText}>1</Text>
                </View>
                <Text style={[styles.instructionText, { color: theme.textSecondary }]}>Keep your highest number tiles in corners to prevent board lockup</Text>
              </View>
              <View style={styles.tipItem}>
                <View style={styles.tipNumber}>
                  <Text style={styles.tipNumberText}>2</Text>
                </View>
                <Text style={[styles.instructionText, { color: theme.textSecondary }]}>Plan multiple moves ahead to create chains of merges</Text>
              </View>
              <View style={styles.tipItem}>
                <View style={styles.tipNumber}>
                  <Text style={styles.tipNumberText}>3</Text>
                </View>
                <Text style={[styles.instructionText, { color: theme.textSecondary }]}>Focus on building combo streaks for massive score multipliers</Text>
              </View>
              <View style={styles.tipItem}>
                <View style={styles.tipNumber}>
                  <Text style={styles.tipNumberText}>4</Text>
                </View>
                <Text style={[styles.instructionText, { color: theme.textSecondary }]}>Try to maintain a clear pattern on the board (like cascading numbers)</Text>
              </View>
              <View style={styles.tipItem}>
                <View style={styles.tipNumber}>
                  <Text style={styles.tipNumberText}>5</Text>
                </View>
                <Text style={[styles.instructionText, { color: theme.textSecondary }]}>Remember: higher value merges are worth more points!</Text>
              </View>
            </View>
            
            <LinearGradient
              colors={[COLORS.primary, COLORS.secondary]}
              style={styles.startGameButton}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              angle={135}
            >
              <TouchableOpacity 
                style={styles.startButtonTouchable}
                onPress={() => {
                  setShowInstructions(false);
                  startCountdown();
                }}
              >
                <Text style={styles.startButtonText}>Start Game</Text>
              </TouchableOpacity>
            </LinearGradient>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <StatusBar barStyle={theme.statusBar as any} />
      
      {renderInstructionsModal()}
      
      <View
        style={styles.contentContainer}
        onStartShouldSetResponder={() => true}
        onResponderStart={onTouchStart}
        onResponderMove={onTouchMove}
        onResponderRelease={onTouchEnd}
      >
        {/* Game area */}
        <View style={styles.gameArea}>
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

            {/* Game status section */}
            <View style={styles.gameStatus}>
              {gameState === 'playing' && (
                <Text style={[styles.timerText, { color: timeLeft <= 5 ? COLORS.accent : theme.textSecondary }]}>
                  {timeLeft}s
                </Text>
              )}
            </View>
            
            {/* Score display in top right */}
            <View style={styles.scoreContainer}>
              <Text style={[styles.scoreLabel, { color: theme.textSecondary }]}>
                Score: <Text style={styles.scoreValue}>{score}</Text>
              </Text>
            </View>
          </View>

          {/* Game state overlays */}
          {gameState === 'idle' && (
            <View style={styles.gameOverlay}>
              <Text style={[styles.gameTitle, { color: theme.text }]}>
                2048 Merge
              </Text>
              
              <Text style={[styles.gameInstructions, { color: theme.textSecondary }]}>
                Swipe to move tiles. Merge identical tiles{'\n'}
                to create higher numbers and earn points!
              </Text>
              
              {highScore > 0 && (
                <Text style={[styles.highScoreText, { color: theme.textSecondary }]}>
                  High Score: {highScore}
                </Text>
              )}
              
              <Pressable
                style={({ pressed }) => [
                  styles.howToPlayButton,
                  Platform.OS === 'ios' && pressed && { opacity: 0.8 }
                ]}
                onPress={() => setShowInstructions(true)}
                android_ripple={Platform.OS === 'android' ? { color: theme.ripple } : undefined}
              >
                <MaterialIcons name="info-outline" size={20} color={COLORS.primary} />
                <Text style={styles.howToPlayText}>How to Play</Text>
              </Pressable>
              
              <Pressable
                style={({ pressed }) => [
                  styles.startButton,
                  Platform.OS === 'ios' && pressed && { opacity: 0.8 }
                ]}
                onPress={startCountdown}
                android_ripple={Platform.OS === 'android' ? { color: theme.ripple } : undefined}
              >
                <LinearGradient
                  colors={[COLORS.primary, COLORS.secondary]}
                  style={styles.startButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  angle={135}
                >
                  <Text style={styles.startButtonText}>
                    Start Game
                  </Text>
                </LinearGradient>
              </Pressable>
            </View>
          )}
          
          {gameState === 'countdown' && (
            <View style={styles.countdownOverlay}>
              <Text style={styles.countdownText}>
                {countdown}
              </Text>
            </View>
          )}
          
          {gameState === 'gameover' && (
            <View style={styles.gameOverlay}>
              <Text style={[styles.gameOverTitle, { color: theme.text }]}>
                Game Over!
              </Text>
              
              <Text style={[styles.finalScoreText, { color: theme.textSecondary }]}>
                Final Score: {score}
              </Text>
              
              {score === highScore && highScore > 0 && (
                <Text style={[styles.newHighScoreText, { color: COLORS.success }]}>
                  New High Score!
                </Text>
              )}
              
              <Pressable
                style={({ pressed }) => [
                  styles.howToPlayButton,
                  Platform.OS === 'ios' && pressed && { opacity: 0.8 }
                ]}
                onPress={() => setShowInstructions(true)}
                android_ripple={Platform.OS === 'android' ? { color: theme.ripple } : undefined}
              >
                <MaterialIcons name="info-outline" size={20} color={COLORS.primary} />
                <Text style={styles.howToPlayText}>How to Play</Text>
              </Pressable>
              
              <Pressable
                style={({ pressed }) => [
                  styles.restartButton,
                  Platform.OS === 'ios' && pressed && { opacity: 0.8 }
                ]}
                onPress={startCountdown}
                android_ripple={Platform.OS === 'android' ? { color: theme.ripple } : undefined}
              >
                <LinearGradient
                  colors={[COLORS.primary, COLORS.secondary]}
                  style={styles.startButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  angle={135}
                >
                  <Text style={styles.startButtonText}>
                    Play Again
                  </Text>
                </LinearGradient>
              </Pressable>
            </View>
          )}

          {/* Game UI elements - only show when playing */}
          {gameState === 'playing' && (
            <>
              {/* Streak indicator */}
              {mergeStreak > 0 && (
                <View style={styles.streakContainer}>
                  <Text style={[styles.streakText, { color: COLORS.accent }]}>
                    Streak: <Text style={{ fontWeight: '700' }}>{mergeStreak}x</Text>
                  </Text>
                </View>
              )}
              
              {/* Game board */}
              {renderGameBoard()}
            </>
          )}
        </View>
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
          
          <View style={styles.statsContainer}>
            <Text style={[styles.statsTitle, { color: theme.text }]}>Game Stats</Text>
            <View style={styles.statRow}>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>High Score:</Text>
              <Text style={[styles.statValue, { color: theme.text }]}>{highScore}</Text>
            </View>
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

export default Mosaic2048Game;

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
  // Instructions Modal Styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 20,
  },
  instructionsContainer: {
    width: '100%',
    maxHeight: '85%',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  instructionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  instructionsTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  closeButton: {
    padding: 4,
  },
  instructionsContent: {
    padding: 20,
  },
  instructionSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(138, 43, 226, 0.3)',
    paddingBottom: 6,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  instructionText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    fontSize: 16,
    lineHeight: 22,
    flex: 1,
    marginLeft: 10,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  tipNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  tipNumberText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  startGameButton: {
    borderRadius: 8,
    overflow: 'hidden',
    marginTop: 20,
    marginBottom: 10,
    alignSelf: 'center',
  },
  startButtonTouchable: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  howToPlayButton: {
    flexDirection: 'row',
    alignItems: 'center', 
    justifyContent: 'center',
    marginBottom: 16,
    padding: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(138, 43, 226, 0.1)',
  },
  howToPlayText: {
    color: COLORS.primary,
    marginLeft: 6,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  gameArea: {
    flex: 1,
    position: 'relative',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: STANDARD_MARGIN,
    paddingTop: Platform.OS === 'ios' ? 0 : STANDARD_MARGIN,
    zIndex: 10,
  },
  gameStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scoreContainer: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(138, 43, 226, 0.15)', // COLORS.primary with opacity
    minWidth: 120,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  scoreLabel: {
    fontSize: 18,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    fontWeight: '600',
  },
  scoreValue: {
    fontWeight: '700',
  },
  timerText: {
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    fontWeight: '700',
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
  gameOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
    padding: STANDARD_MARGIN * 2,
  },
  gameTitle: {
    fontSize: 32,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  gameInstructions: {
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 32,
  },
  highScoreText: {
    fontSize: 18,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    fontWeight: '600',
    marginBottom: 24,
  },
  startButton: {
    width: '100%',
    maxWidth: 200,
    height: 50,
    borderRadius: 25,
    overflow: 'hidden',
  },
  restartButton: {
    width: '100%',
    maxWidth: 200,
    height: 50,
    borderRadius: 25,
    overflow: 'hidden',
    marginTop: 16,
  },
  startButtonGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  startButtonText: {
    color: COLORS.lightText.primary,
    fontSize: 18,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    fontWeight: '700',
  },
  countdownOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  countdownText: {
    fontSize: 120,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    fontWeight: '800',
    color: COLORS.lightText.primary,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 5,
  },
  gameOverTitle: {
    fontSize: 32,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    fontWeight: '700',
    marginBottom: 24,
  },
  finalScoreText: {
    fontSize: 22,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    fontWeight: '600',
    marginBottom: 16,
  },
  newHighScoreText: {
    fontSize: 20,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    fontWeight: '700',
    marginBottom: 32,
  },
  statsContainer: {
    marginBottom: 32,
    marginTop: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    padding: 16,
    borderRadius: 8,
  },
  statsTitle: {
    fontSize: 18,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    fontWeight: '600',
    marginBottom: 12,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  statValue: {
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    fontWeight: '600',
  },
  // Game board styles
  gameBoard: {
    alignSelf: 'center',
    marginTop: 20,
    position: 'relative',
  },
  gridBackground: {
    backgroundColor: '#BBADA0',
    borderRadius: 8,
    padding: TILE_MARGIN,
  },
  gridRow: {
    flexDirection: 'row',
  },
  gridCell: {
    margin: TILE_MARGIN,
    backgroundColor: 'rgba(238, 228, 218, 0.35)',
    borderRadius: 8,
  },
  tile: {
    position: 'absolute',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 4,
  },
  mergingTile: {
    zIndex: 10,
  },
  tileText: {
    fontSize: 30,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    fontWeight: 'bold',
  },
  streakContainer: {
    position: 'absolute',
    bottom: STANDARD_MARGIN * 2,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 5,
  },
  streakText: {
    fontSize: 22,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    fontWeight: '600',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
});
