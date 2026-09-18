from sqlalchemy.orm import Session
from datetime import datetime
from app.models.user import User
from app.schemas.users import UserCreate, UserUpdate
from app.core.security import get_password_hash
from app.core.security import verify_password
from app.core.logger import logger
import secrets
import hashlib
from sqlalchemy.orm.attributes import flag_modified
from app.services.system import get_user_by_id

def update_user_profile(db: Session, user: User, profile_data: dict):
    """Updates a user's profile information with a safe allow-list."""
    
    db_user = db.query(User).filter(User.id == user.id).first()
    if not db_user:
        return None
    
    allowed_fields = ["email", "full_name", "date_of_birth", "phone_number"]
    
    for key, value in profile_data.items():
        if key in allowed_fields:
            # FIX: Parse the ISO string into a Python Date object
            if key == "date_of_birth" and isinstance(value, str):
                try:
                    # Grabs just the "YYYY-MM-DD" part of the string
                    date_string = value.split("T")[0] 
                    value = datetime.strptime(date_string, "%Y-%m-%d").date()
                except ValueError:
                    # If they send a badly formatted date, skip or handle it
                    pass 
                    
            setattr(db_user, key, value)

    db.commit()
    db.refresh(db_user)
    return db_user

def change_user_password(db: Session, user: User, old_pwd: str, new_pwd: str):
    """Allows a user to voluntarily change their own password and clears the restriction flag."""
    
    if not verify_password(old_pwd, user.hashed_password):
        return False
        
    user.hashed_password = get_password_hash(new_pwd)
    user.requires_password_change = False # 🔓 Unlock their account!
    
    db.commit()
    db.refresh(user)
    return True

def delete_own_account(db: Session, user: User):
    """Allows a user to soft-delete their own account."""
    user = get_user_by_id(db, user.id)
    if not user:
        return None
        
    user.is_deleted = True
    user.is_active = False
    
    db.commit()
    db.refresh(user)
    return user
