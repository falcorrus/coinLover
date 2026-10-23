import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'coinLover.ru',
  appName: 'CoinLover',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
