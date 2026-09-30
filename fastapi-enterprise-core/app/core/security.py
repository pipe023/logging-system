# app/core/security.py
import jwt
import bcrypt
import secrets
import hashlib
from datetime import datetime, timedelta, timezone
from typing import Optional
from cryptography.fernet import Fernet
from app.core.config import settings

SECRET_KEY = settings.SECRET_KEY
ALGORITHM = "HS256"

# --- FERNET ENCRYPTION (FOR MFA SECRETS) ---
# Ensure you add FERNET_KEY to your settings/config. 
# Generate one using: Fernet.generate_key()
try:
    cipher_suite = Fernet(settings.FERNET_KEY.encode())
except (ValueError, TypeError) as exc:
    raise ValueError(
        "FERNET_KEY must be a URL-safe Base64-encoded 32-byte key. "
        "Restore the existing encryption key, or generate one with "
        "Fernet.generate_key() for a new installation."
    ) from exc

def encrypt_secret(secret: str) -> str:
    """Encrypts a sensitive string (like a TOTP secret) before database storage."""
    return cipher_suite.encrypt(secret.encode()).decode()

def decrypt_secret(encrypted_secret: str) -> str:
    """Decrypts a sensitive string when validating a user code."""
    return cipher_suite.decrypt(encrypted_secret.encode()).decode()

# --- API KEY FUNCTIONS ---
def generate_api_key_pair() -> tuple[str, str]:
    """Generates a raw key for the user and its SHA-256 hash for storage."""
    raw_key = secrets.token_urlsafe(32)
    key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
    return raw_key, key_hash

# --- EXISTING AUTH FUNCTIONS ---
def verify_password(plain_password: str, hashed_password: str) -> bool:
    password_bytes = plain_password[:72].encode('utf-8')
    hash_bytes = hashed_password.encode('utf-8')
    return bcrypt.checkpw(password_bytes, hash_bytes)

def get_password_hash(password: str) -> str:
    password_bytes = password[:72].encode('utf-8')
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password_bytes, salt).decode('utf-8')

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        
    token_type = to_encode.get("type", "access")
    
    to_encode.update({"exp": expire, "type": token_type})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def create_refresh_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
