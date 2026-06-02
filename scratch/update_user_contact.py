import os
import sys
import gspread
from google.oauth2.service_account import Credentials

def main():
    creds_path = os.path.expanduser("~/.gemini/configs/keys/ga-projects-key.json")
    if not os.path.exists(creds_path):
        print(f"Error: Creds file not found at {creds_path}")
        sys.exit(1)
        
    creds = Credentials.from_service_account_file(creds_path, scopes=["https://www.googleapis.com/auth/spreadsheets"])
    client = gspread.authorize(creds)
    
    sheet_id = "1IQCs35RQlMMQsGB-CRczJeuRqa8WIxW4Sy_kjZyHP2M"
    try:
        sh = client.open_by_key(sheet_id)
        worksheet = sh.worksheet("Users")
        
        # Обновляем ячейку B2 (вторая строка, колонка Contact)
        worksheet.update_acell("B2", "ekirshin@gmail.com")
        print("Successfully updated cell B2 to 'ekirshin@gmail.com'")
        
        # Выведем строку 2 для проверки
        row2 = worksheet.row_values(2)
        print(f"Updated row 2: {row2}")
    except Exception as e:
        print(f"Exception: {e}")

if __name__ == "__main__":
    main()
