import gspread, json, os, re
from google.oauth2.service_account import Credentials

def parse_date(date_str):
    date_str = str(date_str).strip()
    m1 = re.match(r'^(\d{1,2})\.(\d{1,2})\.(\d{2}|\d{4})$', date_str)
    if m1:
        d, m, y = m1.groups()
        if len(y) == 2: y = "20" + y
        return {"year": int(y), "month": int(m), "day": int(d)}
    m2 = re.match(r'^(\d{1,2})/(\d{1,2})/(\d{4})', date_str)
    if m2:
        m, d, y = m2.groups()
        return {"year": int(y), "month": int(m), "day": int(d)}
    return None

def main():
    creds_path = os.path.expanduser("~/.gemini/configs/keys/ga-projects-key.json")
    scopes = ["https://www.googleapis.com/auth/spreadsheets.readonly"]
    creds = Credentials.from_service_account_file(creds_path, scopes=scopes)
    client = gspread.authorize(creds)
    sheet_id = "1IQCs35RQlMMQsGB-CRczJeuRqa8WIxW4Sy_kjZyHP2M"
    sheet = client.open_by_key(sheet_id).worksheet("Transactions")
    data = sheet.get_all_records()
    
    results = []
    total_usd = 0.0
    
    for row in data:
        # Headers: date, type, src, dst, tag, s_amt, s_curr, t_amt, t_curr, " base_amt ", comment, id
        date_str = str(row.get("date", ""))
        row_type = str(row.get("type", "")).lower()
        tag = str(row.get("tag", "")).lower()
        comment = str(row.get("comment", "")).lower()
        
        # Based on the original script logic, but with new headers
        # It seems " base_amt " is the USD equivalent (or base currency)
        amount_usd_raw = str(row.get(" base_amt ", "0")).strip()
        
        parsed_date = parse_date(date_str)
        
        # Filtering for March 2026 and Expense
        if parsed_date and parsed_date["year"] == 2026 and parsed_date["month"] == 3 and "expense" in row_type:
            try:
                # Remove dollar sign and other non-numeric chars except . and ,
                amount_clean = re.sub(r'[^\d.,]', '', amount_usd_raw).replace(",", ".")
                parsed_amount = float(amount_clean) if amount_clean else 0.0
            except ValueError:
                parsed_amount = 0.0
                
            results.append({
                "Date": date_str,
                "Type": row.get("type", ""),
                "Tag": row.get("tag", ""),
                "Comment": row.get("comment", ""),
                "Amount_USD": parsed_amount
            })
            total_usd += parsed_amount

    output = {
        "total_usd": round(total_usd, 2),
        "records_count": len(results),
        "records": results
    }
    print(json.dumps(output, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    main()
