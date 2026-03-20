import gspread, os
from google.oauth2.service_account import Credentials

def main():
    creds_path = os.path.expanduser("~/.gemini/configs/keys/ga-projects-key.json")
    scopes = ["https://www.googleapis.com/auth/spreadsheets.readonly"]
    creds = Credentials.from_service_account_file(creds_path, scopes=scopes)
    client = gspread.authorize(creds)
    sheet_id = "1IQCs35RQlMMQsGB-CRczJeuRqa8WIxW4Sy_kjZyHP2M"
    sheet = client.open_by_key(sheet_id).worksheet("Transactions")
    headers = sheet.row_values(1)
    print(headers)

if __name__ == "__main__":
    main()
