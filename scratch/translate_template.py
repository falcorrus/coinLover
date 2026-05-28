import gspread
import os
from google.oauth2.service_account import Credentials

def translate_tags(tags_str, tag_map):
    if not tags_str:
        return ""
    tags = [t.strip() for t in tags_str.split(",")]
    translated = [tag_map.get(t, t) for t in tags]
    return ", ".join(translated)

def main():
    creds_path = "/Users/eugene/MyProjects/CoinLover/google-credentials.json"
    scopes = ["https://www.googleapis.com/auth/spreadsheets"]
    creds = Credentials.from_service_account_file(creds_path, scopes=scopes)
    client = gspread.authorize(creds)
    sheet_id = "1IQCs35RQlMMQsGB-CRczJeuRqa8WIxW4Sy_kjZyHP2M"
    
    replacements = {
        "Сбер": "Sber",
        "Наличка": "Cash",
        "Магазины": "Shops",
        "Транспорт": "Transport",
        "Квартира": "Apartment",
        "Спорт": "Sports",
        "Кафе": "Cafes",
        "Крипта": "Crypto",
        "Биржа": "Exchange",
        "Корректировки": "Adjustments",
    }
    
    tag_replacements = {
        "еда": "food",
        "вещи": "clothes",
        "аренда": "rent",
        "коммуналка": "utilities",
        "доходы": "income",
        "Транзит": "Transit",
        "FF": "FF"
    }

    try:
        sh = client.open_by_key(sheet_id)
        src_sheet = sh.worksheet("Template_Configs")
        rows = src_sheet.get_all_values()
        
        translated_rows = []
        
        # Определим, в какой секции мы находимся, чтобы корректно обрабатывать строки
        current_section = None
        
        for idx, row in enumerate(rows):
            # Копируем строку, чтобы не мутировать исходную
            new_row = list(row)
            
            # Проверим секции
            if len(new_row) > 0:
                first_cell = new_row[0].strip()
                if "=== WALLETS ===" in first_cell:
                    current_section = "WALLETS"
                elif "=== CATEGORIES ===" in first_cell:
                    current_section = "CATEGORIES"
                elif "=== INCOMES ===" in first_cell:
                    current_section = "INCOMES"
            
            # Если это строка данных (не заголовок секции, не шапка таблицы и не пустая строка)
            # Шапки таблиц начинаются с ID
            if len(new_row) > 1 and new_row[0].startswith("acc-") and current_section == "WALLETS":
                # Переводим имя кошелька
                name = new_row[1]
                new_row[1] = replacements.get(name, name)
            elif len(new_row) > 1 and new_row[0].startswith("cat-") and current_section == "CATEGORIES":
                # Переводим имя категории
                name = new_row[1]
                new_row[1] = replacements.get(name, name)
                # Переводим теги (индекс 4)
                if len(new_row) > 4:
                    new_row[4] = translate_tags(new_row[4], tag_replacements)
            elif len(new_row) > 1 and new_row[0].startswith("inc-") and current_section == "INCOMES":
                # Переводим имя дохода
                name = new_row[1]
                new_row[1] = replacements.get(name, name)
                # Переводим теги (индекс 4)
                if len(new_row) > 4:
                    new_row[4] = translate_tags(new_row[4], tag_replacements)
            
            translated_rows.append(new_row)
            print(f"Row {idx:02d} processed: {new_row}")
            
        # Теперь найдем или создадим лист Template_Configs_EN
        try:
            dest_sheet = sh.worksheet("Template_Configs_EN")
            print("Worksheet Template_Configs_EN already exists. Clearing it...")
            dest_sheet.clear()
        except gspread.exceptions.WorksheetNotFound:
            print("Creating new worksheet Template_Configs_EN...")
            # Создадим с таким же размером (хотя бы приблизительно)
            dest_sheet = sh.add_worksheet(title="Template_Configs_EN", rows=len(translated_rows) + 10, cols=10)
            
        # Записываем переведенные строки
        dest_sheet.update(range_name=f"A1:G{len(translated_rows)}", values=translated_rows)
        print("Template_Configs_EN successfully updated with translated content!")
        
    except Exception as e:
        print("Error during translation:", e)

if __name__ == "__main__":
    main()
