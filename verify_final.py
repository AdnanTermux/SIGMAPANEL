import requests
import time

BASE_URL = "http://localhost:8000"

def check():
    try:
        r = requests.get(f"{BASE_URL}/health")
        print(f"Health: {r.status_code} - {r.json()}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check()
