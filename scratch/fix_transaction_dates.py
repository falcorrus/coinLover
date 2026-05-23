import os
import sys
import re
from datetime import datetime, timedelta, timezone
import gspread
from google.oauth2.service_account import Credentials

def parse_iso_to_local(date_str, offset_hours=-3):
    # Matches patterns like 2026-05-23T12:00:00.000Z or 2026-05-23T12:00:00Z
    iso_pattern = re.compile(r"^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?$")
    match = iso_pattern.match(date_str.strip())
    if not match:
        return None
    
    # Parse elements
    year, month, day, hour, minute, second = map(int, match.groups()[:6])
    
    # We assume the ISO date stored is in UTC (Z)
    utc_dt = datetime(year, month, day, hour, minute, second, tzinfo=timezone.utc)
    
    # Convert to local time by adding/subtracting offset
    local_dt = utc_dt + timedelta(hours=offset_hours)
    
    # Format to "DD.MM.YYYY HH:mm"
    return local_dt.strftime("%d.%m.%Y %H:%M")

def fix_sheet_dates(sh, sheet_name, offset_hours=-3):
    try:
        worksheet = sh.worksheet(sheet_name)
    except gspread.exceptions.WorksheetNotFound:
        print(f"Sheet '{sheet_name}' not found. Skipping.")
        return
        
    print(f"\nProcessing sheet: {sheet_name}")
    
    # Get all values
    all_values = worksheet.get_all_values()
    if not all_values:
        print("Empty sheet.")
        return
        
    headers = [h.strip().lower() for h in all_values[0]]
    
    # Find "date" or "дата" column index
    date_aliases = ["date", "дата", "день", "day"]
    date_col_idx = -1
    for alias in date_aliases:
        if alias in headers:
            date_col_idx = headers.index(alias)
            break
            
    if date_col_idx == -1:
        print("Error: Date column not found in headers:", all_values[0])
        return
        
    print(f"Found Date column at index {date_col_idx} (1-based index: {date_col_idx + 1})")
    
    updates = []
    cells_to_update = []
    
    for row_idx, row in enumerate(all_values[1:], start=2):
        if len(row) <= date_col_idx:
            continue
            
        raw_date = row[date_col_idx]
        if not raw_date:
            continue
            
        fixed_date = parse_iso_to_local(raw_date, offset_hours)
        if fixed_date:
            print(f"Row {row_idx}: '{raw_date}' -> '{fixed_date}'")
            # Create a cell object to update
            cell = gspread.Cell(row=row_idx, col=date_col_idx + 1, value=fixed_date)
            cells_to_update.append(cell)
            updates.append((row_idx, raw_date, fixed_date))
            
    if cells_to_update:
        print(f"Updating {len(cells_to_update)} cells in '{sheet_name}'...")
        worksheet.update_cells(cells_to_update, value_input_option="USER_ENTERED")
        print(f"Successfully updated '{sheet_name}'!")
    else:
        print(f"No ISO dates found in '{sheet_name}'. Everything is in correct format.")

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
        
        # Process both sheets
        fix_sheet_dates(sh, "Transactions", offset_hours=-3)
        fix_sheet_dates(sh, "Transactions-demo", offset_hours=-3)
        
    except Exception as e:
        print(f"Exception occurred: {e}")

if __name__ == "__main__":
    main()
