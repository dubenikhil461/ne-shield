"""Authentication and user account API routes."""
import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user, decode_token, security_scheme
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse, UserOut
from app.services import auth_service

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register_user(body: RegisterRequest, db: Session = Depends(get_db)):
    """Register a new user account."""
    user = auth_service.register_user(db, body.name, body.email, body.password, body.role)
    return user


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    """Authenticate and return a JWT access token."""
    result = auth_service.login_user(db, body.email, body.password)
    return result


@router.get("/me", response_model=UserOut)
def me(
    db: Session = Depends(get_db),
    credentials=Depends(security_scheme),
):
    """Return the currently authenticated user's profile."""
    payload = decode_token(credentials.credentials)
    user_id = payload.get("user_id")
    user = auth_service.get_user_by_id(db, user_id)
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )
    return user
