import uuid
import re
from datetime import datetime, timedelta, timezone
from sqlalchemy import Column, String, DateTime, JSON
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from app.core.database import Base

# Define Philippine Standard Time (UTC+8)
PH_TIMEZONE = timezone(timedelta(hours=8))

class LogEntry(Base):
    __tablename__ = "logs"

    # Dialect-agnostic UUID handling: uses native UUID on Postgres, CHAR(36) string on SQLite
    id = Column(
        PG_UUID(as_uuid=True), 
        primary_key=True, 
        default=uuid.uuid4, 
        index=True,
    )
    
    # Permanently default to Philippine Standard Time (UTC+8)
    timestamp = Column(DateTime(timezone=True), default=lambda: datetime.now(PH_TIMEZONE), index=True)
    
    # Severity and source strings
    level = Column(String(10), nullable=False, index=True)        # INFO, ERROR, WARN
    service_name = Column(String(50), default="fastapi-app", index=True)
    machine_id = Column(String(100), nullable=True, index=True)  # For machine health tracking
    environment = Column(String(20), default="production", index=True)
    
    # Message data
    message = Column(String, nullable=False)
    module = Column(String(100))                                 # python file/module name
    
    # HTTP and Tracing fields
    trace_id = Column(String(36), nullable=True, index=True)     # For request correlation
    method = Column(String(10), nullable=True)                   # GET, POST, DELETE, PATCH
    path = Column(String(255), nullable=True)                    # /todos, /login
    client_ip = Column(String(45), nullable=True)                # IPv4 or IPv6 string
    user_id = Column(String(50), nullable=True, index=True)      # Current user string ID
    username = Column(String(100), nullable=True, index=True)    # Dedicated username field for reports
    
    # Telemetry and flexible payloads
    metrics = Column(JSON, nullable=True)                        # Stores CPU, memory, and disk usage
    exception_details = Column(String, nullable=True)            # Python stack trace text
    extra_attributes = Column(JSON, nullable=True)               # Extra unstructured string dicts

    def __init__(self, **kwargs):
        # Automatically parse and resolve username if not explicitly supplied
        uname = kwargs.get("username")
        msg = kwargs.get("message", "")
        met = kwargs.get("metrics")

        if not uname or str(uname).lower() in ("null", "none", ""):
            # 1. Fallback: Parse username/user from message body via regex
            if msg:
                match = re.search(r"(?:username|user|actor|account)[:=]?\s*([^\s,]+)", msg, re.IGNORECASE)
                if match:
                    uname = match.group(1)

            # 2. Fallback: Check if metrics dictionary contains user identity keys
            if not uname and isinstance(met, dict):
                for k in ('username', 'user', 'account', 'actor'):
                    if k in met and met[k]:
                        uname = met[k]
                        break

            # 3. Fallback: Check if user_id functions as a readable name string instead of UUID
            if not uname:
                raw_uid = kwargs.get("user_id")
                if raw_uid and str(raw_uid).lower() not in ("null", "none", ""):
                    if len(str(raw_uid)) <= 36 and "-" not in str(raw_uid):
                        uname = raw_uid

        kwargs["username"] = uname if uname and str(uname).lower() not in ("null", "none", "") else None
        super().__init__(**kwargs)