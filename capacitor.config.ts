import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.cleanteam.nexus',
  appName: 'NEXUS',
  webDir: 'public',
  server: {
    url: 'https://nexus.xn--mk1bu44c',
    cleartext: true
  },
  plugins: {
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#ffffff',
      overlaysWebView: false
    }
  }
};

export default config;
