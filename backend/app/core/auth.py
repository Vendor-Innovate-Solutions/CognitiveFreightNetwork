from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
import hashlib
import secrets
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
import os

from app.models.database import get_db, USE_MONGODB

# Only import SQLAlchemy models when not using MongoDB
if not USE_MONGODB:
    from app.models.database import Company

# Configuration
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 30  # 30 days

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


class AuthService:
    """Authentication service"""
    
    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """Verify password against hash using SHA256"""
        # Extract salt and hash from stored password
        try:
            salt, stored_hash = hashed_password.split(':')
            password_hash = hashlib.sha256((plain_password + salt).encode()).hexdigest()
            return password_hash == stored_hash
        except ValueError:
            return False
    
    @staticmethod
    def get_password_hash(password: str) -> str:
        """Hash a password using SHA256 with salt"""
        salt = secrets.token_hex(32)  # Generate random salt
        password_hash = hashlib.sha256((password + salt).encode()).hexdigest()
        return f"{salt}:{password_hash}"
    
    @staticmethod
    def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
        """Create JWT access token"""
        to_encode = data.copy()
        
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        
        return encoded_jwt
    
    @staticmethod
    def decode_token(token: str) -> dict:
        """Decode and validate JWT token"""
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            return payload
        except JWTError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
    
    @staticmethod
    def get_company_by_email(db: Session, email: str):
        """Get company by email"""
        from app.services.unified_db import db_service
        return db_service.get_company_by_email(email, db)
    
    @staticmethod
    def authenticate_company(db: Session, email: str, password: str):
        """Authenticate company credentials"""
        company = AuthService.get_company_by_email(db, email)
        
        if not company:
            return None
        
        # Handle both MongoDB dict and SQLAlchemy object
        stored_password = company.get("hashed_password") if isinstance(company, dict) else company.hashed_password
        is_active = company.get("is_active", True) if isinstance(company, dict) else company.is_active
        
        if not AuthService.verify_password(password, stored_password):
            return None
        
        if not is_active:
            return None
        
        return company
    
    @staticmethod
    def create_company(
        db: Session,
        name: str,
        email: str,
        password: str,
        company_type: str,
        phone: Optional[str] = None,
        address: Optional[str] = None,
        gstin: Optional[str] = None
    ):
        """Create a new company account"""
        from app.services.unified_db import db_service
        from app.models.schemas import CompanyRegister
        
        # Check if email already exists
        if AuthService.get_company_by_email(db, email):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # Create company data structure
        company_data = CompanyRegister(
            name=name,
            email=email,
            password=password,
            company_type=company_type,
            phone=phone,
            address=address,
            gstin=gstin
        )
        
        # Hash password
        hashed_password = AuthService.get_password_hash(password)
        
        # Create company using unified service
        company = db_service.create_company(company_data, hashed_password, db)
        
        if not company:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create company"
            )
        
        return company


async def get_current_company(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    """Get current authenticated company from token"""
    
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = AuthService.decode_token(token)
        email: str = payload.get("sub")
        
        if email is None:
            raise credentials_exception
    
    except JWTError:
        raise credentials_exception
    
    company = AuthService.get_company_by_email(db, email=email)
    
    if company is None:
        raise credentials_exception
    
    # Handle both MongoDB dict and SQLAlchemy object
    is_active = company.get("is_active", True) if isinstance(company, dict) else company.is_active
    
    if not is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Company account is inactive"
        )
    
    return company


async def get_current_active_company(
    current_company = Depends(get_current_company)
):
    """Ensure company is active"""
    # Handle both MongoDB dict and SQLAlchemy object
    is_active = current_company.get("is_active", True) if isinstance(current_company, dict) else current_company.is_active
    
    if not is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive company account"
        )
    return current_company
