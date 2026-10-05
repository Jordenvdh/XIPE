"""
XIPE Backend API
FastAPI application for XIPE emission calculations

Security considerations:
- CORS: Configured to allow only specified origins
- Error handling: Generic error messages to prevent information disclosure
- Logging: Security events are logged
- Production: Consider adding rate limiting, authentication, and HTTPS enforcement
"""
import logging
import time
from collections import defaultdict, deque
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# Configure logging for security events
# OWASP #10 - Logging: Set up comprehensive logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

# Support both local backend execution (cwd=backend) and Vercel serverless (cwd=repo root)
try:
    from app.api.routes import data, variables, calculations
    from app.core.config import settings
except ModuleNotFoundError:
    import os
    import sys

    CURRENT_DIR = os.path.dirname(__file__)
    BACKEND_ROOT = os.path.abspath(os.path.join(CURRENT_DIR, ".."))
    if BACKEND_ROOT not in sys.path:
        sys.path.append(BACKEND_ROOT)
    from app.api.routes import data, variables, calculations
    from app.core.config import settings

# Initialize FastAPI app
app = FastAPI(
    title="XIPE API",
    description="API for Cross Impact Performance Emissions (XIPE) model calculations",
    version="1.0.0"
)

# CORS configuration - allow Next.js frontend
# OWASP #6 - Security Misconfiguration: Restrict CORS to known origins
# OWASP #5 - Broken Access Control: CORS prevents unauthorized cross-origin requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,  # Only allow configured origins
    allow_credentials=False,  # No cookies or auth headers are used
    allow_methods=["GET", "POST"],  # Restrict to needed methods only
    allow_headers=["Content-Type"],  # Restrict headers
)

# OWASP #4 - Insecure Design: Limit request body size and request rate per client.
# The rate limit is per server instance (best effort on serverless); configure a
# platform-level limit (e.g. Vercel Firewall) for stronger guarantees.
MAX_BODY_BYTES = 256 * 1024
RATE_LIMIT_REQUESTS = 120
RATE_LIMIT_WINDOW_SECONDS = 60
_request_log: dict = defaultdict(deque)
security_logger = logging.getLogger("security")


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


@app.middleware("http")
async def limit_requests(request: Request, call_next):
    content_length = request.headers.get("content-length")
    if content_length is not None:
        try:
            too_large = int(content_length) > MAX_BODY_BYTES
        except ValueError:
            return JSONResponse(status_code=400, content={"detail": "Invalid Content-Length"})
        if too_large:
            return JSONResponse(status_code=413, content={"detail": "Request body too large"})
    elif request.method == "POST":
        return JSONResponse(status_code=411, content={"detail": "Content-Length required"})

    now = time.monotonic()
    ip = _client_ip(request)
    timestamps = _request_log[ip]
    while timestamps and now - timestamps[0] > RATE_LIMIT_WINDOW_SECONDS:
        timestamps.popleft()
    if len(timestamps) >= RATE_LIMIT_REQUESTS:
        security_logger.warning(f"Rate limit exceeded for {ip!r}")
        return JSONResponse(status_code=429, content={"detail": "Too many requests"})
    timestamps.append(now)

    # Drop idle clients so the tracking dict cannot grow without bound
    if len(_request_log) > 10_000:
        for key in [k for k, v in _request_log.items() if not v or now - v[-1] > RATE_LIMIT_WINDOW_SECONDS]:
            del _request_log[key]

    return await call_next(request)

@app.exception_handler(RequestValidationError)
async def validation_error_handler(request: Request, exc: RequestValidationError):
    """
    Return validation errors without echoing the submitted values.

    OWASP #5 - Security Misconfiguration: The default handler reflects the raw
    input, which leaks data back and fails on values like NaN.
    """
    errors = [
        {"loc": list(err.get("loc", ())), "msg": err.get("msg", ""), "type": err.get("type", "")}
        for err in exc.errors()[:20]
    ]
    return JSONResponse(status_code=422, content={"detail": errors})


# Include API routes
app.include_router(data.router, prefix="/api", tags=["data"])
app.include_router(variables.router, prefix="/api/variables", tags=["variables"])
app.include_router(calculations.router, prefix="/api/calculations", tags=["calculations"])


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "XIPE API",
        "version": "1.0.0",
        "docs": "/docs"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}


@app.get("/api/health")
async def api_health_check():
    """Health check endpoint under /api for serverless rewrite"""
    return {"status": "healthy"}









