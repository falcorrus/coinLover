import sys
from main import fetch_rate

def test_fetch_rate():
    print("Testing BestChange fetch_rate...")
    url = "https://www.bestchange.com/tether-trc20-to-tinkoff.html"
    rate = fetch_rate(url)
    
    if rate is None:
        print("❌ Error: Could not fetch rate!")
        sys.exit(1)
    
    if not isinstance(rate, (int, float)):
        print(f"❌ Error: Rate is not a number! Got: {rate}")
        sys.exit(1)
        
    print(f"✅ Success! Current rate: {rate}")
    return True

if __name__ == "__main__":
    test_fetch_rate()
