import { NavigatorScreenParams } from '@react-navigation/native';

export type TabParamList = {
  Home: undefined;
  History: undefined;
};

export type RootStackParamList = {
  Splash: undefined;
  WalletSetup: undefined;
  Main: NavigatorScreenParams<TabParamList>;
  Scan: undefined;
  Amount: { address: string };
  Confirm: { address: string; amount: string };
  Success: { amount: string };
  KYCVerify: undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList { }
  }
}
