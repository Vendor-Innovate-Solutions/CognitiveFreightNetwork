"""
Security Headers and Configuration Module
Implements security best practices for production deployment
"""

from fastapi import Request, Response
from fastapi.middleware.cors import CORSMiddleware
from typing import List
import os


class SecurityHeaders:
    """
    Security headers for production deployment
    Implements OWASP recommendations
    """
    
    @staticmethod
    def get_security_headers() -> dict:
        """Get recommended security headers"""
        return {
            # Prevent clickjacking attacks
            "X-Frame-Options": "DENY",
            
            # Prevent MIME type sniffing
            "X-Content-Type-Options": "nosniff",
            
            # Enable XSS protection
            "X-XSS-Protection": "1; mode=block",
            
            # Strict Transport Security (HTTPS only)
            "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
            
            # Referrer policy
            "Referrer-Policy": "strict-origin-when-cross-origin",
            
            # Permissions policy (formerly Feature-Policy)
            "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
            
            # Content Security Policy
            "Content-Security-Policy": (
                "default-src 'self'; "
                "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
                "style-src 'self' 'unsafe-inline'; "
                "img-src 'self' data: https:; "
                "font-src 'self' data:; "
                "connect-src 'self' https:; "
                "frame-ancestors 'none'; "
                "base-uri 'self'; "
                "form-action 'self';"
            )
        }


async def security_headers_middleware(request: Request, call_next):
    """Middleware to add security headers to all responses"""
    response = await call_next(request)
    
    # Add security headers
    for header, value in SecurityHeaders.get_security_headers().items():
        response.headers[header] = value
    
    return response


def get_cors_config(environment: str = "development") -> dict:
    """
    Get CORS configuration based on environment
    
    Args:
        environment: "development", "staging", or "production"
    """
    if environment == "production":
        # Restrictive CORS for production
        allowed_origins = os.getenv(
            "CORS_ORIGINS",
            "https://yourdomain.com,https://api.yourdomain.com"
        ).split(",")
        
        return {
            "allow_origins": allowed_origins,
            "allow_credentials": True,
            "allow_methods": ["GET", "POST", "PUT", "DELETE", "PATCH"],
            "allow_headers": [
                "Authorization",
                "Content-Type",
                "X-Correlation-ID",
                "X-API-Key"
            ],
            "expose_headers": [
                "X-Correlation-ID",
                "X-RateLimit-Limit",
                "X-RateLimit-Remaining",
                "X-RateLimit-Reset"
            ],
            "max_age": 3600
        }
    
    elif environment == "staging":
        # Moderate CORS for staging
        return {
            "allow_origins": [
                "http://localhost:3000",
                "http://localhost:3001",
                "https://staging.yourdomain.com"
            ],
            "allow_credentials": True,
            "allow_methods": ["GET", "POST", "PUT", "DELETE", "PATCH"],
            "allow_headers": ["*"],
            "expose_headers": [
                "X-Correlation-ID",
                "X-RateLimit-Limit",
                "X-RateLimit-Remaining"
            ],
            "max_age": 3600
        }
    
    else:  # development
        # Permissive CORS for development
        return {
            "allow_origins": ["*"],
            "allow_credentials": True,
            "allow_methods": ["*"],
            "allow_headers": ["*"],
            "expose_headers": ["*"],
            "max_age": 3600
        }


class APIKeyValidator:
    """Validator for API key authentication"""
    
    def __init__(self):
        # In production, store in database or environment variables
        self.valid_keys = set(
            os.getenv("API_KEYS", "").split(",")
        ) if os.getenv("API_KEYS") else set()
    
    def is_valid(self, api_key: str) -> bool:
        """Check if API key is valid"""
        return api_key in self.valid_keys
    
    def get_key_info(self, api_key: str) -> dict:
        """Get information about the API key"""
        if self.is_valid(api_key):
            return {
                "valid": True,
                "rate_limit": "standard",
                "scopes": ["read", "write"]
            }
        return {"valid": False}


# Global API key validator
api_key_validator = APIKeyValidator()


def validate_api_key(request: Request) -> bool:
    """
    Validate API key from request headers
    
    Usage in route:
        @router.get("/protected")
        async def protected_route(request: Request):
            if not validate_api_key(request):
                raise HTTPException(401, "Invalid API key")
    """
    api_key = request.headers.get("X-API-Key")
    if not api_key:
        return False
    
    return api_key_validator.is_valid(api_key)


class SecurityConfig:
    """
    Centralized security configuration
    """
    
    # Password requirements
    MIN_PASSWORD_LENGTH = 8
    REQUIRE_UPPERCASE = True
    REQUIRE_LOWERCASE = True
    REQUIRE_DIGIT = True
    REQUIRE_SPECIAL_CHAR = True
    
    # JWT configuration
    JWT_ALGORITHM = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours
    JWT_REFRESH_TOKEN_EXPIRE_DAYS = 30
    
    # Rate limiting defaults
    DEFAULT_RATE_LIMIT = 100  # requests per minute
    AUTH_RATE_LIMIT = 10  # login attempts per minute
    
    # Session configuration
    SESSION_TIMEOUT_MINUTES = 30
    MAX_SESSION_PER_USER = 5
    
    # IP whitelist/blacklist
    IP_WHITELIST = []  # Empty = all IPs allowed
    IP_BLACKLIST = []
    
    @staticmethod
    def validate_password(password: str) -> tuple[bool, str]:
        """
        Validate password against security requirements
        
        Returns:
            (is_valid, error_message)
        """
        if len(password) < SecurityConfig.MIN_PASSWORD_LENGTH:
            return False, f"Password must be at least {SecurityConfig.MIN_PASSWORD_LENGTH} characters"
        
        if SecurityConfig.REQUIRE_UPPERCASE and not any(c.isupper() for c in password):
            return False, "Password must contain at least one uppercase letter"
        
        if SecurityConfig.REQUIRE_LOWERCASE and not any(c.islower() for c in password):
            return False, "Password must contain at least one lowercase letter"
        
        if SecurityConfig.REQUIRE_DIGIT and not any(c.isdigit() for c in password):
            return False, "Password must contain at least one digit"
        
        if SecurityConfig.REQUIRE_SPECIAL_CHAR and not any(c in "!@#$%^&*()_+-=[]{}|;:,.<>?" for c in password):
            return False, "Password must contain at least one special character"
        
        return True, ""
    
    @staticmethod
    def is_ip_allowed(ip: str) -> bool:
        """Check if IP is allowed"""
        if ip in SecurityConfig.IP_BLACKLIST:
            return False
        
        if SecurityConfig.IP_WHITELIST and ip not in SecurityConfig.IP_WHITELIST:
            return False
        
        return True
