import { test, expect, devices } from '@playwright/test';

test.use({
  ...devices['Pixel 5'],
});

test('verify mobile root page for new visitor on Android', async ({ page, context }) => {
  // Clear context
  await context.clearCookies();
  
  console.log('Navigating to https://coinlover.ru/ in mobile simulation (Pixel 5) ...');
  const response = await page.goto('https://coinlover.ru/', { waitUntil: 'networkidle' });
  
  console.log('Final URL:', page.url());
  console.log('Status code:', response?.status());
  
  // Take screenshot
  await page.screenshot({ path: '/Users/eugene/MyProjects/CoinLover/screenshots/new_mobile_visitor_view.png', fullPage: true });
  console.log('Screenshot saved to screenshots/new_mobile_visitor_view.png');
  
  const textContent = await page.evaluate(() => document.body.innerText);
  console.log('Text content length:', textContent.length);
  console.log('Snippet:', textContent.substring(0, 500));
});
