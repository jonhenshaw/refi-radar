import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.jonhenshaw.refiradar',
  appName: 'Refi Radar',
  webDir: 'apps/web/dist',
  ios: {
    contentInset: 'automatic',
    scheme: 'RefiRadar',
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      backgroundColor: '#05070A',
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#05070A',
    },
  },
};

export default config;
