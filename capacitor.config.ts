import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.looksmax.app',
  appName: 'Looksmax',
  webDir: 'out',
  server: {
    url: 'http://192.168.1.33:3000',
    cleartext: true
  }
};

export default config;
