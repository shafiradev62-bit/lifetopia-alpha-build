import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.lifetopia.pixelfarm',
  appName: 'Pixel Farm Life',
  webDir: 'dist/public',
  bundledWebRuntime: false,
  plugins: {
    SplashScreen: {
      launchShowDuration: 3000,
      launchAutoHide: true,
      backgroundColor: "#000000",
      showSpinner: true,
      androidSpinnerStyle: "large",
      iosSpinnerStyle: "small",
      spinnerColor: "#FFD700",
      splashFullScreen: true,
      splashImmersive: true,
    },
  },
};

export default config;
