import json
import logging
import sys
import time
import uuid
from contextvars import ContextVar

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

request_id_var: ContextVar[str] = ContextVar("request_id", default="-")
user_id_var: ContextVar[str] = ContextVar("user_id", default="-")

QUIET_PATHS = {"/health", "/favicon.ico"}


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "ts": self.formatTime(record, "%Y-%m-%dT%H:%M:%S"),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "request_id": request_id_var.get(),
            "user_id": user_id_var.get(),
        }

        for key, value in getattr(record, "extra_fields", {}).items():
            payload[key] = value

        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)

        return json.dumps(payload, default=str)


def configure_logging(as_json: bool) -> None:
    handler = logging.StreamHandler(sys.stdout)

    if as_json:
        handler.setFormatter(JsonFormatter())
    else:
        handler.setFormatter(
            logging.Formatter("%(asctime)s %(levelname)-7s %(name)s | %(message)s", "%H:%M:%S")
        )

    root = logging.getLogger()
    root.handlers = [handler]
    root.setLevel(logging.INFO)

    logging.getLogger("uvicorn.access").disabled = True


logger = logging.getLogger("ceoai")


def log_event(message: str, **fields) -> None:
    record = logging.LogRecord(
        name="ceoai", level=logging.INFO, pathname="", lineno=0, msg=message, args=(), exc_info=None
    )
    record.extra_fields = fields
    logger.handle(record)


class RequestContextMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        incoming = request.headers.get("x-request-id")
        request_id = incoming or uuid.uuid4().hex[:16]
        request_id_var.set(request_id)
        user_id_var.set("-")

        started = time.perf_counter()

        try:
            response = await call_next(request)
        except Exception:
            duration = (time.perf_counter() - started) * 1000
            log_event(
                "request failed",
                method=request.method,
                path=request.url.path,
                duration_ms=round(duration, 1),
            )
            raise

        duration = (time.perf_counter() - started) * 1000
        response.headers["X-Request-ID"] = request_id

        if request.url.path not in QUIET_PATHS:
            log_event(
                "request",
                method=request.method,
                path=request.url.path,
                status=response.status_code,
                duration_ms=round(duration, 1),
            )

        return response
