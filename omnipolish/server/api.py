"""Local REST API Server for OmniPolish.
Allows Browser Extensions, Mobile Keyboards, and other clients to access the polishing engine.
"""

from typing import Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

from omnipolish.config import load_config, save_config
from omnipolish.core.engine import PolisherEngine

app = FastAPI(title="OmniPolish API", version="1.0.0")

# Enable CORS so browser extensions can connect from any origin
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

engine = PolisherEngine()

class FormatRequest(BaseModel):
    text: str
    mode: Optional[str] = "auto"

class FormatResponse(BaseModel):
    original_text: str
    formatted_text: str
    latency_ms: float
    provider: str

class ConfigUpdateRequest(BaseModel):
    provider: Optional[str] = None
    api_key: Optional[str] = None
    model: Optional[str] = None
    default_mode: Optional[str] = None
    hotkey: Optional[str] = None

@app.get("/api/status")
def get_status():
    config = load_config()
    # Mask API key for security
    masked_key = ""
    if config.get("api_key"):
        key = config["api_key"]
        masked_key = key[:4] + "..." + key[-4:] if len(key) > 8 else "***"
    
    return {
        "status": "online",
        "provider": config.get("provider"),
        "model": config.get("model"),
        "default_mode": config.get("default_mode"),
        "api_key_configured": bool(config.get("api_key")),
        "api_key_masked": masked_key,
        "hotkey": config.get("hotkey"),
    }

@app.post("/api/format", response_model=FormatResponse)
def format_message(req: FormatRequest):
    if not req.text or not req.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty.")
    
    formatted, latency_ms, provider = engine.format_text(req.text, mode=req.mode)
    return FormatResponse(
        original_text=req.text,
        formatted_text=formatted,
        latency_ms=latency_ms,
        provider=provider
    )

@app.post("/api/config")
def update_config(req: ConfigUpdateRequest):
    config = load_config()
    data = req.model_dump(exclude_unset=True)
    for k, v in data.items():
        if v is not None:
            config[k] = v
    save_config(config)
    engine.reload_config()
    return {"message": "Config updated successfully", "config": get_status()}

import socket

def is_port_in_use(host: str = "127.0.0.1", port: int = 8765) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.5)
        return s.connect_ex((host, port)) == 0

def start_server(host: str = "127.0.0.1", port: int = 8765):
    if is_port_in_use(host, port):
        print(f"[*] OmniPolish API Server is already active on http://{host}:{port} (reusing active instance)")
        return
    print(f"[*] Starting OmniPolish REST API on http://{host}:{port}")
    try:
        uvicorn.run(app, host=host, port=port, log_level="warning")
    except OSError as e:
        print(f"[*] Port {port} is already bound, skipping duplicate server instance.")
