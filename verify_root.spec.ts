import { test, expect } from '@playwright/test';

test('verify root page for new visitor', async ({ page, context }) => {
  // Clear any existing localStorage and cookies for the domain
  await context.clearCookies();
  
  // Navigate to https://coinlover.ru/
  console.log('Navigating to https://coinlover.ru/ ...');
  const response = await page.goto('https://coinlover.ru/', { waitUntil: 'networkidle' });
  
  console.log('Status code:', response?.status());
  console.log('Final URL:', page.url());
  
  // Take a screenshot of the loaded page
  await page.screenshot({ path: '/Users/eugene/MyProjects/CoinLover/screenshots/new_visitor_view.png', fullPage: true });
  console.log('Screenshot saved to screenshots/new_visitor_view.png');
  
  // Print page title and body content snippet
  const title = await page.title();
  console.log('Page Title:', title);
  
  const textContent = await page.evaluate(() => document.body.innerText);
  console.log('Text content length:', textContent.length);
  console.log('Snippet:', textContent.substring(0, 500));
});
