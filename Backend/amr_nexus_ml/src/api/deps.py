from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session
from src.database import SessionLocal
from src.db.models import User

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_current_user(db: Session = Depends(get_db)):
    user = db.query(User).first()
    if not user:
        user = User(
            email="admin@amrnexus.com",
            name="Admin",
            hashed_password="dummy",
            role="admin"
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    return user

def require_admin(current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user