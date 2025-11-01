from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
import hashlib
import secrets
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
import os

from app.models.database import Company, get_db

# Configuration
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

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
    def get_company_by_email(db: Session, email: str) -> Optional[Company]:
        """Get company by email"""
        return db.query(Company).filter(Company.email == email).first()
    
    @staticmethod
    def authenticate_company(db: Session, email: str, password: str) -> Optional[Company]:
        """Authenticate company credentials"""
        company = AuthService.get_company_by_email(db, email)
        
        if not company:
            return None
        
        if not AuthService.verify_password(password, company.hashed_password):
            return None
        
        if not company.is_active:
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
        gstin: Optional[str] = None
    ) -> Company:
        """Create a new company account"""
        
        # Check if email already exists
        if AuthService.get_company_by_email(db, email):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # Check if GSTIN already exists
        if gstin:
            existing_gstin = db.query(Company).filter(Company.gstin == gstin).first()
            if existing_gstin:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="GSTIN already registered"
                )
        
        # Create new company
        hashed_password = AuthService.get_password_hash(password)
        
        company = Company(
            name=name,
            email=email,
            hashed_password=hashed_password,
            company_type=company_type,
            phone=phone,
            gstin=gstin,
            subscription_tier="free",
            is_active=True
        )
        
        db.add(company)
        db.commit()
        db.refresh(company)
        
        return company


async def get_current_company(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> Company:
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
    
    if not company.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Company account is inactive"
        )
    
    return company


async def get_current_active_company(
    current_company: Company = Depends(get_current_company)
) -> Company:
    """Ensure company is active"""
    if not current_company.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive company account"
        )
    return current_company
