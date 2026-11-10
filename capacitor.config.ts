import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.aurum.goldterminal',
  appName: '金衡 AURUM',
  webDir: 'dist',
  backgroundColor: '#07080a',
  android: {
    allowMixedContent: false,
    backgroundColor: '#07080a',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 900,
      launchAutoHide: true,
      backgroundColor: '#07080a',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    SystemBars: {
      insetsHandling: 'css',
      style: 'DARK',
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#07080a',
      overlaysWebView: false,
    },
  },
};

export default config;
