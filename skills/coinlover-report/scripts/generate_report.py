import sys
import json
import subprocess
from datetime import datetime

def run_command(command):
    try:
        result = subprocess.run(command, capture_output=True, text=True, shell=True)
        if result.returncode != 0:
            print(f"Error running command: {result.stderr}", file=sys.stderr)
            return None
        return result.stdout
    except Exception as e:
        print(f"Exception: {e}", file=sys.stderr)
        return None

def main():
    if len(sys.argv) < 3:
        print("Usage: generate_report.py <year> <month>", file=sys.stderr)
        sys.exit(1)

    year = sys.argv[1]
    month = sys.argv[2]
    
    # Mapping for month names in Russian to numbers if needed (though we'll pass numbers)
    months_ru = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"]
    month_name = months_ru[int(month)-1]

    # Command to get expenses
    script_path = "/Users/eugene/.gemini/commands/finance_tracker.py"
    cmd = f"python3 {script_path} --year {year} --month {month} --type Expense"
    
    output = run_command(cmd)
    if not output:
        print("Failed to get data from finance_tracker.py")
        sys.exit(1)

    try:
        data = json.loads(output)
    except json.JSONDecodeError:
        print(f"Failed to parse JSON output: {output}")
        sys.exit(1)

    total_usd = data.get("total_usd", 0.0)
    records = data.get("records", [])

    # Aggregation by Category (Tag in the sheet seems to be Category)
    categories = {}
    for r in records:
        cat = r.get("Tag") or "📦 Остальное"
        amount = r.get("Amount_USD", 0.0)
        categories[cat] = categories.get(cat, 0.0) + amount

    # Sort categories by amount descending
    sorted_categories = sorted(categories.items(), key=lambda x: x[1], reverse=True)

    # Latest 10 operations
    # Records are usually in chronological order, so we reverse to get latest
    latest_ops = records[::-1][:10]

    # Generate Markdown
    report_date = datetime.now().strftime("%Y-%m-%d")
    
    md = f"""# Отчет по расходам CoinLover ({month_name} {year})
Дата формирования: {report_date}

## Сводка за месяц
**Итого расходов: ${total_usd:,.2f}**

| Категория | Сумма ($) |
| :--- | :--- |
"""
    for cat, val in sorted_categories:
        md += f"| {cat} | ${val:,.2f} |\n"

    md += """
## Последние операции (Топ-10)
"""
    for op in latest_ops:
        date = op.get("Date", "")
        cat = op.get("Tag", "📦 Остальное")
        comment = op.get("Comment", "")
        amount = op.get("Amount_USD", 0.0)
        md += f"- **{date}:** {cat} ({comment}) — ${amount:,.2f}\n"

    md += f"""
---
*Отчет сгенерирован Gemini CLI на основе данных из Google Sheets.*
"""
    print(md)

if __name__ == "__main__":
    main()
