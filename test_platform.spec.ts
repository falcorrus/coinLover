import { test, expect, devices } from '@playwright/test';

test('print Capacitor platform on Desktop', async ({ page }) => {
  await page.goto('https://coinlover.ru/');
  const platform = await page.evaluate(() => {
    // Access Capacitor from window or evaluate it
    return (window as any).Capacitor?.getPlatform() || 'not-found';
  });
  console.log('Capacitor platform on Desktop:', platform);
});

test('print Capacitor platform on mobile Chrome', async ({ page, context }) => {
  await context.clearCookies();
  // Set viewport and user agent manually to simulate Android mobile Chrome
  await page.setViewportSize({ width: 393, height: 851 });
  await page.goto('https://coinlover.ru/');
  
  const platform = await page.evaluate(() => {
    return (window as any).Capacitor?.getPlatform() || 'not-found';
  });
  console.log('Capacitor platform on mobile Chrome:', platform);
  
  const isNative = await page.evaluate(() => {
    const isStandalone = (window as any).__IS_PWA__ || window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    const isNativeApp = (window as any).Capacitor?.getPlatform() !== "web";
    return { isStandalone, isNativeApp };
  });
  console.log('Parsed states:', isNative);
});
