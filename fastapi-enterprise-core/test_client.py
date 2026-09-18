import requests

class RemoteLogger:
    def __init__(self, server_url, api_key, service_name):
        self.server_url = f"{server_url}/api/v1/logging_app/ingest"
        self.headers = {"x-api-key": api_key}
        self.service_name = service_name

    def log(self, message, level="INFO"):
        payload = {
            "level": level,
            "message": message,
            "service_name": self.service_name
        }
        try:
            response = requests.post(self.server_url, json=payload, headers=self.headers)
            if response.status_code == 200:
                print("✅ Success! Log sent.")
                return True
            else:
                print(f"❌ Failed! Server returned {response.status_code}: {response.text}")
                return False
        except Exception as e:
            print(f"❌ Error connecting to server: {e}")
            return False

# --- RUN THE TEST ---
if __name__ == "__main__":
    # Make sure this API Key matches what is in your .env file!
    logger = RemoteLogger("http://127.0.0.1:8000", "pn_key_Qt6sZvzK-KdM1tImJY_zZMyJrrjjEB1lJpSYNjrn33E", "Test-Machine")
    print("Attempting to send log...")
    logger.log("Hello, this is a test from the client script!")