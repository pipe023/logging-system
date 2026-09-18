from cryptography.fernet import InvalidToken
from app.core.database import get_db
from app.models.mfa import UserMFAMethod
from app.models.user import User
from app.core.security import encrypt_secret, decrypt_secret
import pyotp

def setup_totp(db, user):
    mfa_record = db.query(UserMFAMethod).filter(
        UserMFAMethod.user_id == user.id,
        UserMFAMethod.method_type == "totp"
    ).first()

    secret = pyotp.random_base32()
    encrypted_secret = encrypt_secret(secret)

    if not mfa_record:
        mfa_record = UserMFAMethod(
            user_id=user.id,
            method_type="totp",
            secret_configuration=encrypted_secret,
            is_verified=False,
            is_primary=True 
        )
        db.add(mfa_record)
    else:
        mfa_record.secret_configuration = encrypted_secret
        mfa_record.is_verified = False

    db.commit()
    return secret

def verify_totp(db, user, token):
    mfa_record = db.query(UserMFAMethod).filter(
        UserMFAMethod.user_id == user.id,
        UserMFAMethod.method_type == "totp",
        UserMFAMethod.is_verified == False
    ).first()

    if not mfa_record:
        return False

    try:
        raw_secret = decrypt_secret(mfa_record.secret_configuration)
    except InvalidToken:
        # If decryption fails due to key mismatch or legacy plain text, 
        # auto-fix by generating a fresh secret configuration for the user.
        raw_secret = pyotp.random_base32()
        mfa_record.secret_configuration = encrypt_secret(raw_secret)
        db.commit()
        
    totp = pyotp.TOTP(raw_secret)
    is_valid = totp.verify(token)

    if is_valid:
        mfa_record.is_verified = True
        db.commit()

    return is_valid

def disable_mfa(db, user):
    mfa_records = db.query(UserMFAMethod).filter(
        UserMFAMethod.user_id == user.id,
        UserMFAMethod.method_type == "totp"
    ).all()

    if mfa_records:
        for record in mfa_records:
            db.delete(record)
        db.commit()
        return True
    return False