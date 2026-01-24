# LumenPay Mobile (React Native CLI)

A non-custodial Stellar payment app built with React Native CLI.

## Prerequisites

- Node.js 18+
- React Native CLI
- For iOS: Xcode 15+, CocoaPods
- For Android: Android Studio, JDK 17+

## Setup

### 1. Install Dependencies

```bash
cd "mobile new"
npm install
# or
yarn install
```

### 2. iOS Setup

```bash
cd ios
pod install
cd ..
```

### 3. Android Setup

Make sure you have Android Studio installed with:
- Android SDK
- Android SDK Platform
- Android Virtual Device

## Running the App

### iOS

```bash
npm run ios
# or
npx react-native run-ios
```

### Android

```bash
npm run android
# or
npx react-native run-android
```

### Start Metro Bundler

```bash
npm start
```

## Project Structure

```
src/
├── App.tsx                 # Main app entry
├── navigation/             # React Navigation setup
│   ├── RootNavigator.tsx   # Stack navigator
│   ├── TabNavigator.tsx    # Bottom tabs
│   └── types.ts            # Navigation types
├── screens/                # Screen components
│   ├── SplashScreen.tsx
│   ├── WalletSetupScreen.tsx
│   ├── tabs/
│   │   ├── HomeScreen.tsx
│   │   └── HistoryScreen.tsx
│   ├── pay/
│   │   ├── ScanScreen.tsx
│   │   ├── AmountScreen.tsx
│   │   ├── ConfirmScreen.tsx
│   │   └── SuccessScreen.tsx
│   └── kyc/
│       └── KYCVerifyScreen.tsx
├── components/             # Reusable components
│   └── ui/
│       ├── BackgroundGradient.tsx
│       └── GlassView.tsx
├── lib/                    # Core libraries
│   ├── config.ts           # App configuration
│   ├── stellar.ts          # Stellar SDK utilities
│   ├── diditKyc.ts         # KYC integration
│   ├── api/
│   │   ├── authApi.ts      # Authentication API
│   │   └── paymentApi.ts   # Payment API
│   └── lumenvault/         # Secure wallet management
│       ├── SecureStorage.ts
│       ├── KeyManager.ts
│       ├── BiometricAuth.ts
│       └── LumenVault.ts
└── hooks/                  # Custom hooks
    └── useBiometrics.ts
```

## Key Dependencies

### Navigation
- `@react-navigation/native` - Core navigation
- `@react-navigation/native-stack` - Stack navigator
- `@react-navigation/bottom-tabs` - Tab navigator

### UI & Animation
- `react-native-reanimated` - High-performance animations
- `react-native-gesture-handler` - Gesture handling
- `react-native-linear-gradient` - Gradient backgrounds
- `lucide-react-native` - Icons

### Security
- `react-native-keychain` - Secure storage & biometrics
- `@stellar/stellar-sdk` - Stellar blockchain

### Camera
- `react-native-vision-camera` - QR code scanning

## Migration from Expo

This project was migrated from Expo. Key changes:

| Expo Module | React Native CLI Alternative |
|-------------|------------------------------|
| `expo-router` | `@react-navigation/*` |
| `expo-secure-store` | `react-native-keychain` |
| `expo-local-authentication` | `react-native-keychain` (biometrics) |
| `expo-camera` | `react-native-vision-camera` |
| `expo-linear-gradient` | `react-native-linear-gradient` |
| `expo-linking` | React Native `Linking` API |

## Environment Variables

Create a `.env` file in the root:

```env
API_URL=http://localhost:3001/api
```

## Building for Production

### iOS

```bash
npx react-native build-ios --mode Release
```

### Android

```bash
cd android
./gradlew assembleRelease
```

## Troubleshooting

### Metro Bundler Issues

```bash
npx react-native start --reset-cache
```

### iOS Build Issues

```bash
cd ios
pod deintegrate
pod install
cd ..
```

### Android Build Issues

```bash
cd android
./gradlew clean
cd ..
```

## License

MIT
