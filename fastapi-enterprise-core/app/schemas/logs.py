from pydantic import BaseModel, ConfigDict, field_serializer, Field
from datetime import datetime, timezone
from typing import Optional, Any
from uuid import UUID

# Shared base attributes
class LogBase(BaseModel):
    level: str
    service_name: str = "fastapi-app"
    machine_id: Optional[str] = None  # <--- NEW: Machine source tracking
    environment: str = "production"
    message: str
    module: Optional[str] = None
    trace_id: Optional[str] = None
    http_method: Optional[str] = None
    request_path: Optional[str] = None
    client_ip: Optional[str] = None
    user_id: Optional[str] = None
    metrics: Optional[dict[str, Any]] = None  # <--- NEW: CPU, memory, and disk utilization metrics
    exception_details: Optional[str] = None
    extra_attributes: Optional[dict[str, Any]] = None

# Schema for creating a log / ingesting payload from clients
class LogsCreate(BaseModel):
    service_name: str
    machine_id: Optional[str] = None  # <--- NEW
    level: str
    message: str
    user_id: Optional[str] = None
    path: Optional[str] = None
    method: Optional[str] = None
    metrics: Optional[dict[str, Any]] = None  # <--- NEW
    extra: Optional[dict[str, Any]] = Field(default_factory=dict)

# Schema for reading a log
class LogsResponse(LogBase):
    id: UUID
    timestamp: datetime

    # Required for Pydantic to work with SQLAlchemy models
    model_config = ConfigDict(from_attributes=True)

    # Automatically add UTC timezone indicator for the frontend
    @field_serializer('timestamp')
    def serialize_timestamp(self, dt: datetime, _info):
        if dt.tzinfo is None:
            return dt.replace(tzinfo=timezone.utc).isoformat()
        return dt.isoformat()