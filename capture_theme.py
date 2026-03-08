from playwright.sync_api import sync_playwright
import os

def capture_light_theme():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Create a context with predefined localStorage
        context = browser.new_context(
            viewport={'width': 390, 'height': 844}, # iPhone size
            user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1"
        )
        page = context.new_page()
        
        # Go to page and set theme
        try:
            page.goto('http://localhost:3000')
            page.evaluate("window.localStorage.setItem('coinlover_theme', 'light')")
            page.evaluate("window.localStorage.setItem('coinlover_demo', 'true')") # Use demo for data
            page.reload()
            page.wait_for_load_state('networkidle')
            
            # Wait a bit for animations
            page.wait_for_timeout(2000)
            
            # Save screenshot
            output_path = '/Users/eugene/MyProjects/CoinLover/Design/current_light_theme.png'
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            page.screenshot(path=output_path)
            print(f"Screenshot saved to {output_path}")
        except Exception as e:
            print(f"Error capturing screenshot: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    capture_light_theme()
