from fastapi import FastAPI, HTTPException
import requests
from bs4 import BeautifulSoup
from fastapi.middleware.cors import CORSMiddleware
import re

app = FastAPI()

# Разрешаем CORS для запросов с фронтенда
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def fetch_rate(url):
    headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
    try:
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Ищем таблицу с курсами по заголовкам колонок (как в Rub-usdt)
        for table in soup.find_all('table'):
            for tr in table.find_all('tr'):
                row_text = tr.get_text()
                # Проверяем наличие стандартных заголовков BestChange
                if all(k in row_text for k in ["Exchanger", "Give", "Get", "Reserve", "Reviews"]):
                    get_idx = -1
                    # Находим индекс колонки "Get" (то, что мы получаем)
                    cells = tr.find_all(['th', 'td'])
                    for i, cell in enumerate(cells):
                        if "Get" in cell.get_text():
                            get_idx = i
                            break
                    
                    if get_idx != -1:
                        # Берем все строки данных (исключая заголовок)
                        rows = [r for r in table.find_all('tr') if r != tr]
                        # Выбираем 5-ю позицию для фильтрации накруток
                        if len(rows) >= 5:
                            target_row = rows[4]
                        elif len(rows) > 0:
                            target_row = rows[-1]
                        else:
                            continue
                            
                        tds = target_row.find_all('td')
                        if len(tds) > get_idx:
                            val = tds[get_idx].get_text(strip=True)
                            # Ищем число (курс)
                            match = re.search(r'(\d+\.\d+)', val)
                            if not match:
                                # Пробуем найти целое число, если точки нет
                                match = re.search(r'(\d+)', val)
                                
                            if match:
                                return float(match.group(1))
        
        return None
    except Exception as e:
        print(f"Error fetching rate: {e}")
        return None

import os
from pydantic import BaseModel

class LeadRequest(BaseModel):
    contact: str

# Telegram credentials from environment
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TELEGRAM_ADMIN_ID = os.getenv("TELEGRAM_ADMIN_ID")

@app.post("/api/leads")
def create_lead(lead: LeadRequest):
    if not lead.contact:
        raise HTTPException(status_code=400, detail="Contact is required")
    
    # Send to Telegram if credentials are set
    if TELEGRAM_BOT_TOKEN and TELEGRAM_ADMIN_ID:
        try:
            msg = f"🚀 <b>New Lead for CoinLover!</b>\n\nContact: <code>{lead.contact}</code>"
            url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
            requests.post(url, json={
                "chat_id": TELEGRAM_ADMIN_ID,
                "text": msg,
                "parse_mode": "HTML"
            }, timeout=10)
        except Exception as e:
            print(f"Error sending to Telegram: {e}")
            # We don't fail the request if TG fails, just log it
    
    return {"status": "success"}

@app.get("/api/rates/rub")
def get_rub_rate():
    url = "https://www.bestchange.com/tether-trc20-to-tinkoff.html"
    rate = fetch_rate(url)
    
    if rate is None:
        raise HTTPException(status_code=500, detail="Could not fetch RUB rate from BestChange")
        
    return {"currency": "RUB", "rate": rate}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
