import json
import subprocess
import re

def main():
    # Run the existing get_data.py script to get the raw records
    # We know it filters for March 2026 and Expense already
    cmd = "python3 /Users/eugene/MyProjects/CoinLover/get_data.py"
    result = subprocess.run(cmd, capture_output=True, text=True, shell=True)
    
    if result.returncode != 0:
        print(f"Error: {result.stderr}")
        return

    data = json.loads(result.stdout)
    records = data.get("records", [])
    total_usd = data.get("total_usd", 0.0)

    # Calculate categories
    categories = {}
    for r in records:
        tag = r.get("Tag") or "📦 Остальное"
        # Normalize tag names to be consistent if needed, but here we just use them as is
        # Actually, let's keep them as they are in the sheet
        amount = r.get("Amount_USD", 0.0)
        categories[tag] = round(categories.get(tag, 0.0) + amount, 2)

    # Sort categories by value descending for better visibility, though not strictly required
    # But wait, the user asked for {название: сумма} object. 
    # Usually keys in objects are not sorted, but it's fine.

    # Latest operations (top 10 by date, assuming they are chronological)
    # The get_data.py seems to return them in order of appearance in sheet
    # Let's sort them by date (DD.MM.YY) to be sure
    def parse_date_to_sort(date_str):
        try:
            d, m, y = date_str.split('.')
            if len(y) == 2: y = "20" + y
            return f"{y}-{m}-{d}"
        except:
            return "0000-00-00"

    sorted_records = sorted(records, key=lambda x: parse_date_to_sort(x["Date"]), reverse=True)
    
    latest_ops = []
    for r in sorted_records[:10]:
        latest_ops.append({
            "date": r["Date"],
            "tag": r["Tag"],
            "comment": r["Comment"],
            "amount_usd": r["Amount_USD"]
        })

    output = {
        "total_usd": total_usd,
        "categories": categories,
        "latest_ops": latest_ops
    }

    print(json.dumps(output, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    main()
