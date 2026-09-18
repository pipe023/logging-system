import asyncio
import os
import platform
from contextlib import asynccontextmanager
from typing import Any, Dict, Optional
import httpx
import psutil
from fastapi import FastAPI, Request, Response


class FastAPIClientLogger:
    """
    Non-blocking, connection-pooled client logger and health monitor 
    for FastAPI applications.
    """

    def __init__(
        self,
        service_name: str,
        machine_id: Optional[str] = None,
        ingest_url: str = "http://127.0.0.1:8000/api/v1/logging_app/ingest",
        api_key: str = "",
        timeout: float = 2.0,
        heartbeat_interval: int = 60, # Seconds between automated health pings
    ):
        self.service_name = service_name
        
        # Dynamic machine ID resolution hierarchy:
        # 1. Explicitly passed argument (if any)
        # 2. Environment variable 'MACHINE_ID' (ideal for Docker/K8s/Cloud)
        # 3. System physical node hostname fallback
        self.machine_id = machine_id or os.getenv("MACHINE_ID") or platform.node()
        
        self.ingest_url = ingest_url
        self.api_key = api_key
        self.heartbeat_interval = heartbeat_interval
        self._heartbeat_task: Optional[asyncio.Task] = None
        
        # Reuse a single persistent HTTP client across requests to enable TCP pooling
        self.client = httpx.AsyncClient(
            headers={"x-api-key": self.api_key},
            timeout=timeout,
        )

    def _get_system_metrics(self) -> Dict[str, float]:
        """Collects current local machine resource utilization via psutil."""
        try:
            return {
                "cpu_usage": round(psutil.cpu_percent(interval=None), 1),
                "memory_usage": round(psutil.virtual_memory().percent, 1),
                "disk_usage": round(psutil.disk_usage('/').percent, 1),
            }
        except Exception:
            return {"cpu_usage": 0.0, "memory_usage": 0.0, "disk_usage": 0.0}

    async def log(
        self,
        level: str,
        message: str,
        user_id: Optional[int | str] = None,
        path: Optional[str] = None,
        method: Optional[str] = None,
        extra: Optional[Dict[str, Any]] = None,
        fire_and_forget: bool = True,
    ) -> None:
        """
        Sends a log entry and system resource telemetry to the central ingest endpoint.

        :param level: Log severity level ('info', 'warn', 'error', 'debug', etc.)
        :param message: Primary log description message
        :param user_id: ID of the user performing the action
        :param path: HTTP request path endpoint
        :param method: HTTP verb (GET, POST, etc.)
        :param extra: Additional structured JSON data
        :param fire_and_forget: If True, dispatches log sending as a background task
                                so it never delays API client responses.
        """
        payload = {
            "service_name": self.service_name,
            "machine_id": self.machine_id,  # Dynamically resolved identifier
            "level": level.upper(),
            "message": message,
            "user_id": str(user_id) if user_id is not None else None,
            "path": path,
            "method": method.upper() if method else None,
            "metrics": self._get_system_metrics(),  # Bundles live CPU, memory, and disk stats
            "extra": extra or {},
        }

        if fire_and_forget:
            # Schedule task in background without blocking response execution
            asyncio.create_task(self._send_log(payload))
        else:
            await self._send_log(payload)

    async def _send_log(self, payload: Dict[str, Any]) -> None:
        """Internal helper to dispatch HTTP POST request to central logger."""
        try:
            response = await self.client.post(self.ingest_url, json=payload)
            response.raise_for_status()
        except httpx.HTTPStatusError as e:
            print(f"[{self.service_name}] Central Logger Status Error {e.response.status_code}: {e.response.text}")
        except Exception as e:
            print(f"[{self.service_name}] Error pushing to central logger: {e}")

    async def _start_heartbeat_loop(self) -> None:
        """Continuously sends periodic health pings so the central server tracks uptime."""
        while True:
            try:
                await asyncio.sleep(self.heartbeat_interval)
                await self.log(
                    level="INFO",
                    message="Automated node health heartbeat ping",
                    fire_and_forget=False
                )
            except asyncio.CancelledError:
                break
            except Exception as e:
                print(f"[{self.service_name}] Heartbeat failed: {e}")

    def start_heartbeat(self) -> None:
        """Triggers the background heartbeat loop routine."""
        if not self._heartbeat_task:
            self._heartbeat_task = asyncio.create_task(self._start_heartbeat_loop())

    async def close(self) -> None:
        """Gracefully cancels background heartbeats and closes the underlying HTTP connection pool."""
        if self._heartbeat_task:
            self._heartbeat_task.cancel()
            try:
                await self._heartbeat_task
            except asyncio.CancelledError:
                pass
        await self.client.aclose()


# ==============================================================================
# FASTAPI INTEGRATION EXAMPLE
# ==============================================================================

# 1. Instantiate Global Logger (machine_id is left blank to capture dynamically)
logger = FastAPIClientLogger(
    service_name="auth-service",
    machine_id=None,  # Will automatically check os.getenv("MACHINE_ID") or host machine name
    ingest_url="http://127.0.0.1:8000/api/v1/logging_app/ingest",
    api_key="your-api-key-here",
    timeout=2.0,
    heartbeat_interval=60,
)


# 2. Setup Lifespan for Clean Startup/Teardown & Heartbeat Routing
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.start_heartbeat()
    await logger.log(level="INFO", message="Service started up successfully")
    yield
    await logger.log(level="INFO", message="Service shutting down")
    await logger.close()


app = FastAPI(title="Sample Microservice", lifespan=lifespan)


# 3. Optional Request Logging Middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    response: Response = await call_next(request)
    
    await logger.log(
        level="INFO" if response.status_code < 400 else "ERROR",
        message=f"HTTP {request.method} {request.url.path} - {response.status_code}",
        path=request.url.path,
        method=request.method,
        extra={"status_code": response.status_code},
    )
    
    return response


# 4. Example Endpoints
@app.get("/api/v1/users/{user_id}")
async def get_user(user_id: int):
    await logger.log(
        level="INFO",
        message="Fetched user profile details",
        user_id=user_id,
        path=f"/api/v1/users/{user_id}",
        method="GET",
        extra={"cache_hit": True},
    )
    return {"user_id": user_id, "name": "Jane Doe"}


@app.post("/api/v1/checkout")
async def checkout(user_id: int):
    try:
        raise ValueError("Insufficient payment funds")
    except Exception as err:
        await logger.log(
            level="ERROR",
            message=f"Checkout failed: {str(err)}",
            user_id=user_id,
            path="/api/v1/checkout",
            method="POST",
            extra={"error_type": type(err).__name__},
        )
        return {"status": "failed", "error": str(err)}