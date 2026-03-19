from playwright.sync_api import sync_playwright
import time

def run():
    with sync_playwright() as p:
        # Запускаем браузер
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Массив для хранения пойманных запросов GA
        captured_requests = []

        # Слушаем сетевые запросы
        page.on("request", lambda request: captured_requests.append(request.url) if "google-analytics.com/g/collect" in request.url else None)

        print("Navigating to http://localhost:3000...")
        try:
            page.goto("http://localhost:3000", wait_until="networkidle")
            
            # Даем время скриптам GA инициализироваться и отправить первый хит
            time.sleep(5)

            # Проверяем наличие скриптов в DOM
            scripts = page.evaluate("() => Array.from(document.querySelectorAll('script')).map(s => s.src)")
            
            ids_to_check = ["G-X63WEFC7X3", "G-LG9JX54LWC", "G-8X16CXTT7F"]
            
            print("\n--- Проверка скриптов в DOM ---")
            for ga_id in ids_to_check:
                found = any(ga_id in s for s in scripts)
                status = "✅ Найдено" if found else "❌ НЕ НАЙДЕНО"
                print(f"ID {ga_id}: {status}")

            print("\n--- Проверка сетевых запросов (Network Hits) ---")
            for ga_id in ids_to_check:
                # Проверяем, есть ли запрос, содержащий конкретный ID (параметр tid=...)
                hit_found = any(f"tid={ga_id}" in url for url in captured_requests)
                status = "✅ Отправлен" if hit_found else "❌ НЕ ОТПРАВЛЕН"
                print(f"ID {ga_id}: {status}")

            if not captured_requests:
                print("\n⚠️ Запросы на google-analytics.com не зафиксированы.")
            else:
                print(f"\nВсего перехвачено GA запросов: {len(captured_requests)}")

        except Exception as e:
            print(f"Ошибка при выполнении теста: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    run()
