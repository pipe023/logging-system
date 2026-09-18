from pydantic import BaseModel, field_validator, model_validator
import re
from typing import Dict, List, Optional
from datetime import datetime

class UserCreate(BaseModel):
    username: str
    password: str
    confirm_password: str
    permissions: Optional[Dict[str, List[str]]] = {}

    @field_validator('password')
    @classmethod
    def validate_password_complexity(cls, v: str):
        if len(v) != 16:
            raise ValueError('Password must be exactly 16 characters long')
        if len(re.findall(r"[A-Z]", v)) < 4:
            raise ValueError('Password must contain at least 4 uppercase letters')
        if len(re.findall(r"[a-z]", v)) < 4:
            raise ValueError('Password must contain at least 4 lowercase letters')
        if len(re.findall(r"\d", v)) < 4:
            raise ValueError('Password must contain at least 4 numbers')
        if len(re.findall(r"[!@#$%^&*(),.?\":{}|<>]", v)) < 4:
            raise ValueError('Password must contain at least 4 special characters (!@#$%^&*)')
        return v
    
    @model_validator(mode='after')
    def verify_passwords_match(self) -> 'UserCreate':
        if self.password != self.confirm_password:
            raise ValueError('Passwords do not match')
        return self

class UserResponse(BaseModel):
    id: str
    username: str
    permissions: dict
    is_active: bool
    created_at: datetime
    is_deleted: bool
    updated_at: datetime
    last_login_at: Optional[datetime] = None
    status_changed_at: Optional[datetime] = None
    requires_password_change: bool
    failed_login_attempts: int
    locked_until: Optional[datetime] = None
    # Changed from EmailStr to str to allow .local and internal domains
    email: Optional[str] = None
    full_name: Optional[str] = None
    date_of_birth: Optional[datetime] = None
    phone_number: Optional[str] = None
    is_totp_enabled: bool
    
    class Config:
        from_attributes = True

class UserUpdate(BaseModel):
    permissions: Optional[dict] = None
    is_active: Optional[bool] = None

class AdminPasswordReset(BaseModel):
    new_password: str

    @field_validator('new_password')
    @classmethod
    def validate_password_complexity(cls, v: str):
        if len(v) != 16:
            raise ValueError('Password must be exactly 16 characters long')
        if len(re.findall(r"[A-Z]", v)) < 4:
            raise ValueError('Password must contain at least 4 uppercase letters')
        if len(re.findall(r"[a-z]", v)) < 4:
            raise ValueError('Password must contain at least 4 lowercase letters')
        if len(re.findall(r"\d", v)) < 4:
            raise ValueError('Password must contain at least 4 numbers')
        if len(re.findall(r"[!@#$%^&*(),.?\":{}|<>]", v)) < 4:
            raise ValueError('Password must contain at least 4 special characters (!@#$%^&*)')
        return v

class UserChangePassword(BaseModel):
    old_password: str
    new_password: str

    @field_validator('new_password')
    @classmethod
    def validate_password_complexity(cls, v: str):
        if len(v) != 16:
            raise ValueError('Password must be exactly 16 characters long')
        if len(re.findall(r"[A-Z]", v)) < 4:
            raise ValueError('Password must contain at least 4 uppercase letters')
        if len(re.findall(r"[a-z]", v)) < 4:
            raise ValueError('Password must contain at least 4 lowercase letters')
        if len(re.findall(r"\d", v)) < 4:
            raise ValueError('Password must contain at least 4 numbers')
        if len(re.findall(r"[!@#$%^&*(),.?\":{}|<>]", v)) < 4:
            raise ValueError('Password must contain at least 4 special characters (!@#$%^&*)')
        return v

class UserProfileUpdate(BaseModel):
    # Change to str if users can also update their profiles with internal .local emails
    email: Optional[str] = None
    full_name: Optional[str] = None
    date_of_birth: Optional[datetime] = None
    phone_number: Optional[str] = None