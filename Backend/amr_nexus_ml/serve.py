# serve.py
import socketio
import uvicorn
from src.api.app import app 

# Create a Socket.IO server and attach it to the ASGI app
sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins='*')
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