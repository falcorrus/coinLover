import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.reloto.coinlover',
  appName: 'CoinLover',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
