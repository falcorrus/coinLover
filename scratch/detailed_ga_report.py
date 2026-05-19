import os
from google.analytics.data_v1beta import BetaAnalyticsDataClient, types

PROPERTY_ID = "526908433" # CoinLover
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = os.path.expanduser("~/.gemini/configs/keys/ga-projects-key.json")

def run_detailed_report():
    client = BetaAnalyticsDataClient()
    
    # 1. Events Report
    event_request = types.RunReportRequest(
        property=f"properties/{PROPERTY_ID}",
        dimensions=[types.Dimension(name="eventName")],
        metrics=[types.Metric(name="eventCount"), types.Metric(name="totalUsers")],
        date_ranges=[types.DateRange(start_date="today", end_date="today")],
    )
    
    # 2. Source Report
    source_request = types.RunReportRequest(
        property=f"properties/{PROPERTY_ID}",
        dimensions=[types.Dimension(name="sessionSource")],
        metrics=[types.Metric(name="sessions")],
        date_ranges=[types.DateRange(start_date="today", end_date="today")],
    )

    # 3. Country Report
    country_request = types.RunReportRequest(
        property=f"properties/{PROPERTY_ID}",
        dimensions=[types.Dimension(name="country")],
        metrics=[types.Metric(name="totalUsers")],
        date_ranges=[types.DateRange(start_date="today", end_date="today")],
    )

    try:
        print("\n🔥 ДЕТАЛЬНЫЙ ОТЧЕТ COINLOVER (СЕГОДНЯ)")
        
        print("\n--- СОБЫТИЯ ---")
        response = client.run_report(event_request)
        print(f"{'Event Name':<25} {'Count':<10} {'Users':<10}")
        for row in response.rows:
            print(f"{row.dimension_values[0].value:<25} {row.metric_values[0].value:<10} {row.metric_values[1].value:<10}")

        print("\n--- ИСТОЧНИКИ ---")
        response = client.run_report(source_request)
        for row in response.rows:
            print(f"{row.dimension_values[0].value:<25} {row.metric_values[0].value:<10} sessions")

        print("\n--- ГЕОГРАФИЯ ---")
        response = client.run_report(country_request)
        for row in response.rows:
            print(f"{row.dimension_values[0].value:<25} {row.metric_values[0].value:<10} users")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    run_detailed_report()
