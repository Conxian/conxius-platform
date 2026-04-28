from playwright.sync_api import sync_playwright
import time
import os

def run_verification():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1280, 'height': 1200})
        page = context.new_page()

        # Navigate to Overview page (Static export might be at different path or served)
        # For now, we assume the server is running on 3000 if we started it
        try:
            page.goto("http://localhost:3000/overview")
            time.sleep(5)
            page.screenshot(path="verification_overview.png")
            print("Screenshot saved to verification_overview.png")
        except Exception as e:
            print(f"Error during verification: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    run_verification()
