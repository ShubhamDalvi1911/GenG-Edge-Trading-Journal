from sqlalchemy import Boolean, Column, DateTime, Integer, String, func

from app.database.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=True)
    username = Column(String, nullable=True)
    avatar_url = Column(String, nullable=True)
    avatar_zoom = Column(Integer, default=100, nullable=False)
    avatar_position = Column(String, default="center", nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
