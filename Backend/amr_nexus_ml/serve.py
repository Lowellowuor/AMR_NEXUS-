import socketio
import uvicorn
from fastapi.middleware.cors import CORSMiddleware
from src.api.app import app 

sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins=['http://localhost:5173', 'http://localhost:5174'])

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

combined_app = socketio.ASGIApp(sio, app)
app.sio = sio

@sio.event
async def connect(sid, environ):
    print(f"Client connected: {sid}")

@sio.event
async def disconnect(sid):
    print(f"Client disconnected: {sid}")

if __name__ == "__main__":
    uvicorn.run(combined_app, host="0.0.0.0", port=8000)
