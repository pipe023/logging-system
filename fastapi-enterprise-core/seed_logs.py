import requests
import random
import time
import os
from dotenv import load_dotenv

load_dotenv()

class RemoteLogger:
    def __init__(self, server_url, service_name):
        self.server_url = f"{server_url}/api/v1/logging_app/ingest"
        self.service_name = service_name

    def log(self, message, level, api_key):
        headers = {"x-api-key": api_key, "Content-Type": "application/json"}
        payload = {
            "level": level,
            "message": message,
            "service_name": self.service_name
        }
        try:
            response = requests.post(self.server_url, json=payload, headers=headers)
            if response.status_code == 200:
                print(f"✅ Sent: {level} | {message}")
            else:
                print(f"❌ Failed: {response.status_code} - {response.text}")
        except Exception as e:
            print(f"❌ Connection Error: {e}")

if __name__ == "__main__":
    # Define your user mapping
    user_pool = [
        {"id": "Admin", "key": os.getenv("SUPER_ADMIN_API_KEY")},
        {"id": "User1", "key": os.getenv("NEW_USER_API_KEY")}
    ]
    
    # Filter out users without keys
    valid_users = [u for u in user_pool if u["key"]]

    if not valid_users:
        print("Error: No API keys found in .env.")
        exit(1)

    logger = RemoteLogger("http://127.0.0.1:8000", "Analytics-Generator")
    
    levels = ["INFO", "WARNING", "ERROR"]
    services = ["auth-service", "payment-gateway", "data-worker"]
    messages = ["Login success", "Connection timed out", "Task completed"]

    print("Generating 50 logs...")
    for _ in range(50):
        # 1. Randomly pick a user
        user = random.choice(valid_users)
        
        # 2. Log using that user's key (The backend will assign the correct user_id)
        logger.log(
            message=f"[{random.choice(services)}] {random.choice(messages)}",
            level=random.choice(levels),
            api_key=user["key"]
        )
        time.sleep(0.2)

    print("Done!")