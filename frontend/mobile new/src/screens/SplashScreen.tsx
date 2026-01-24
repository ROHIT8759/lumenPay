import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  Easing,
  FadeInUp,
  FadeInDown,
} from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import LinearGradient from 'react-native-linear-gradient';
import { Globe, ShieldCheck, Zap, Wallet, ArrowRight } from 'lucide-react-native';
import { RootStackParamList } from '../navigation/types';
import BackgroundGradient from '../components/ui/BackgroundGradient';
import GlassView from '../components/ui/GlassView';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Splash'>;

const { width } = Dimensions.get('window');

export default function SplashScreen() {
  const navigation = useNavigation<NavigationProp>();

  const glowOpacity = useSharedValue(0);

  useEffect(() => {
    glowOpacity.value = withRepeat(
      withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [glowOpacity]);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const features = [
    { icon: ShieldCheck, title: 'Non-Custodial', desc: 'You own your keys, always.' },
    { icon: Zap, title: 'Lightning Fast', desc: 'Settlement in seconds.' },
    { icon: Wallet, title: 'Universal', desc: 'Pay anyone, anywhere.' },
  ];

  return (
    <BackgroundGradient>
      <View style={styles.container}>
        <Animated.View entering={FadeInUp.delay(200).duration(1000)} style={styles.header}>
          <View style={styles.iconContainer}>
            <Globe color="#00E5FF" size={32} />
          </View>
          <Text style={styles.title}>
            Lumen<Text style={styles.highlight}>Vault</Text>
          </Text>
          <Text style={styles.subtitle}>The Future of Smart Payments</Text>
        </Animated.View>

        <View style={styles.featureContainer}>
          {features.map((feature, index) => (
            <Animated.View
              key={index}
              entering={FadeInDown.delay(400 + index * 100).springify()}
              style={{ marginBottom: 12 }}>
              <GlassView style={styles.featureCard}>
                <View style={styles.featureIcon}>
                  <feature.icon color="#E5E7EB" size={20} />
                </View>
                <View>
                  <Text style={styles.featureTitle}>{feature.title}</Text>
                  <Text style={styles.featureDesc}>{feature.desc}</Text>
                </View>
              </GlassView>
            </Animated.View>
          ))}
        </View>

        <Animated.View entering={FadeInDown.delay(800).springify()} style={styles.footer}>
          <TouchableOpacity onPress={() => navigation.navigate('WalletSetup')}>
            <LinearGradient
              colors={['#00E5FF', '#2979FF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.button}>
              <Animated.View
                style={[
                  StyleSheet.absoluteFill,
                  { backgroundColor: '#fff', opacity: 0.2 },
                  glowStyle,
                ]}
              />
              <Text style={styles.buttonText}>Get Started</Text>
              <ArrowRight color="#fff" size={20} />
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => navigation.navigate('Main', { screen: 'Home' })}>
            <Text style={styles.secondaryButtonText}>I already have a wallet</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </BackgroundGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 80,
    justifyContent: 'space-between',
    paddingBottom: 50,
  },
  header: {
    alignItems: 'center',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0, 229, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.3)',
  },
  title: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
    letterSpacing: -1,
  },
  highlight: {
    color: '#00E5FF',
  },
  subtitle: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  featureContainer: {
    marginTop: 40,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  featureDesc: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  footer: {
    gap: 16,
  },
  button: {
    height: 56,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#00E5FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
  },
  buttonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  secondaryButton: {
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 16,
    color: '#9CA3AF',
  },
});
