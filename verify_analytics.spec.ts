import { test, expect } from '@playwright/test';

test('analytics scripts load and track', async ({ page }) => {
  // Array to collect GA requests
  const gaRequests: string[] = [];
  
  page.on('request', request => {
    const url = request.url();
    if (url.includes('google-analytics.com') || url.includes('googletagmanager.com/gtag/js')) {
      gaRequests.push(url);
    }
  });

  await page.goto('http://localhost:3000');
  
  // Wait for gtag.js to load
  await expect(async () => {
    expect(gaRequests.some(u => u.includes('gtag/js'))).toBeTruthy();
  }).toPass();

  // Check if all 3 IDs are present in the scripts or requests
  const content = await page.content();
  expect(content).toContain('G-X63WEFC7X3');
  expect(content).toContain('G-LG9JX54LWC');
  expect(content).toContain('G-8X16CXTT7F');

  console.log('✅ GA4 scripts loaded with all IDs');
});
