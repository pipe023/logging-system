from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # Core App Settings
    PROJECT_NAME: str
    SECRET_KEY: str
    DATABASE_URL: str
    ENVIRONMENT: str = "development"
    DOMAIN: str
    
    # Auth Settings
    SUPER_ADMIN_USERNAME: str
    SUPER_ADMIN_PASSWORD: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # Security Settings (Required for MFA Secret Encryption)
    FERNET_KEY: str
    
    # Logging Settings
    INGEST_API_KEY: str = "default-secret-key"

    # This configuration handles both the .env file and the 'extra' fields
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

# Initialize the settings once
settings = Settings()