# Development Guide for MosaicCircles

## Build Commands
- Development: `npm run dev` (starts Expo development server)
- iOS: `npm run ios` (builds and runs on iOS simulator/device)
- Android: `npm run android` (builds and runs on Android emulator/device)
- Web build: `npm run build:web` (exports for web platform)

## Lint Commands
- Lint code: `npm run lint` (runs Expo linting)

## Code Style Guidelines
- **Formatting**: Use 2-space indentation, single quotes, and trailing commas
- **Imports**: Group imports by external libraries first, then internal modules
- **Naming**: Use PascalCase for components, camelCase for variables/functions
- **TypeScript**: Enforce strict type checking, avoid `any` when possible
- **Components**: Prefer functional components with hooks over class components
- **Error Handling**: Use try/catch blocks for async operations with appropriate error logging

## Project Structure
- Expo Router for navigation in `app/` directory
- React components in component-specific files
- Use TypeScript interfaces to define props and state types

## UX Design

### Visual Design
- Modern, minimalist design optimized for mobile screens
- Primary accent color: Futuristic purple (#8A2BE2)
- Secondary colors: 
  - System background colors (use platform defaults)
  - Dark text: (#000000 at 87% opacity for Android, #000000 for iOS)
  - Light text: (#FFFFFF at 100% for primary, 70% for secondary)
- Native font families (SF Pro for iOS, Roboto for Android)
- Gradient usage:
  - Primary gradient: Purple to indigo (#8A2BE2 to #4B0082, 135° angle)
  - Apply to: Feature cards, action buttons, and section headers
  - Keep subtle: 10-20% opacity for backgrounds, 100% for CTAs
  - Maximum one gradient per screen view

### Platform Adaptation
- Follow platform-specific patterns:
  - iOS: Large titles, rounded corners (12pt), SF symbols
  - Android: Material Design icons, subtle shadows, Material 3 components
- Respect platform navigation patterns:
  - iOS: Left-edge swipe for back
  - Android: System back button support
- Dynamic type support (iOS) and scalable text (Android)

### Interaction Design
- Touch feedback:
  - iOS: Subtle transparency changes
  - Android: Ripple effects
- Gesture support:
  - Pull-to-refresh
  - Swipe actions
  - Pinch-to-zoom where applicable
- Haptic feedback for important actions
- Loading states with platform-native spinners

### Layout
- Safe area insets respect:
  - iOS notch and Dynamic Island
  - Android status bar and navigation
- Standard mobile margins (16pt iOS, 16dp Android)
- Touch targets minimum:
  - 44x44pt (iOS)
  - 48x48dp (Android)
- Bottom navigation/tab bar height: 49pt iOS, 56dp Android

### Accessibility
- Dynamic Type (iOS) and Large Text (Android)
- Sufficient color contrast (minimum 4.5:1)
- Clear touch targets with adequate spacing
- Support system dark mode on both platforms