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
        values = worksheet.get_all_values()
        for idx, row in enumerate(values):
            print(f"[{idx}] {row}")
    except Exception as e:
        print(f"Exception: {e}")

if __name__ == "__main__":
    main()
