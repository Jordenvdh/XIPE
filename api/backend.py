"""
Vercel serverless entrypoint for the FastAPI backend.
This wraps the existing FastAPI app from backend/app/main.py so that
all /api/* routes are served via a single serverless function.
"""
import os
import sys

# Ensure the repository root is on sys.path so we can import backend.*
CURRENT_DIR = os.path.dirname(__file__)
REPO_ROOT = os.path.abspath(os.path.join(CURRENT_DIR, ".."))
if REPO_ROOT not in sys.path:
    sys.path.append(REPO_ROOT)

from backend.app.main import app as fastapi_app  # noqa: E402

# Vercel Python functions expect a top-level "app" callable for ASGI.
app = fastapi_app





