import gspread, os
from google.oauth2.service_account import Credentials

def main():
    creds_path = "/Users/eugene/MyProjects/CoinLover/google-credentials.json"
    scopes = ["https://www.googleapis.com/auth/spreadsheets"]
    creds = Credentials.from_service_account_file(creds_path, scopes=scopes)
    client = gspread.authorize(creds)
    sheet_id = "1IQCs35RQlMMQsGB-CRczJeuRqa8WIxW4Sy_kjZyHP2M"
    
    try:
        sh = client.open_by_key(sheet_id)
        worksheet = sh.worksheet("Template_Configs")
        rows = worksheet.get_all_values()
        for idx, row in enumerate(rows[:50]):
            print(f"{idx:02d}: {row}")
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    main()
