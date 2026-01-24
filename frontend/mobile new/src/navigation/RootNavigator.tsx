import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';

// Screens
import SplashScreen from '../screens/SplashScreen';
import WalletSetupScreen from '../screens/WalletSetupScreen';
import TabNavigator from './TabNavigator';

// Pay flow screens
import ScanScreen from '../screens/pay/ScanScreen';
import AmountScreen from '../screens/pay/AmountScreen';
import ConfirmScreen from '../screens/pay/ConfirmScreen';
import SuccessScreen from '../screens/pay/SuccessScreen';

// KYC screens
import KYCVerifyScreen from '../screens/kyc/KYCVerifyScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Splash"
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: 'transparent' },
        animation: 'fade',
      }}>
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen name="WalletSetup" component={WalletSetupScreen} />
      <Stack.Screen name="Main" component={TabNavigator} />

      {/* Pay Flow */}
      <Stack.Screen name="Scan" component={ScanScreen} />
      <Stack.Screen name="Amount" component={AmountScreen} />
      <Stack.Screen name="Confirm" component={ConfirmScreen} />
      <Stack.Screen name="Success" component={SuccessScreen} />

      {/* KYC */}
      <Stack.Screen name="KYCVerify" component={KYCVerifyScreen} />
    </Stack.Navigator>
  );
}
