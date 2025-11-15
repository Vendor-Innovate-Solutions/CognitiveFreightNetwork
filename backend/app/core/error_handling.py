"""
Enhanced Error Handling and Monitoring Module
Provides comprehensive error tracking, logging, and monitoring capabilities
"""

import logging
import traceback
import uuid
from datetime import datetime
from typing import Any, Dict, Optional
from fastapi import Request, Response, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from pydantic import BaseModel
import sys
import os

# Configure logging format
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - [%(correlation_id)s] - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        # Add file handler for production
        logging.FileHandler('app.log') if os.path.exists('logs') else logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)


class CorrelationIdFilter(logging.Filter):
    """Add correlation ID to log records"""
    
    def filter(self, record):
        if not hasattr(record, 'correlation_id'):
            record.correlation_id = 'N/A'
        return True


# Add filter to logger
logger.addFilter(CorrelationIdFilter())


class ErrorResponse(BaseModel):
    """Standardized error response model"""
    error: str
    message: str
    correlation_id: str
    timestamp: str
    details: Optional[Dict[str, Any]] = None
    path: Optional[str] = None


class ErrorHandler:
    """Centralized error handling service"""
    
    @staticmethod
    def get_correlation_id(request: Request) -> str:
        """Get or generate correlation ID for request tracking"""
        correlation_id = request.headers.get("X-Correlation-ID")
        if not correlation_id:
            correlation_id = str(uuid.uuid4())
        return correlation_id
    
    @staticmethod
    def log_error(
        error: Exception,
        correlation_id: str,
        request: Optional[Request] = None,
        extra: Optional[Dict[str, Any]] = None
    ):
        """Log error with correlation ID and context"""
        error_details = {
            'correlation_id': correlation_id,
            'error_type': type(error).__name__,
            'error_message': str(error),
            'traceback': traceback.format_exc(),
        }
        
        if request:
            error_details.update({
                'method': request.method,
                'url': str(request.url),
                'client_host': request.client.host if request.client else None,
            })
        
        if extra:
            error_details.update(extra)
        
        logger.error(
            f"Error occurred: {error}",
            extra={'correlation_id': correlation_id},
            exc_info=True
        )
        
        # In production, send to Sentry or similar service
        # sentry_sdk.capture_exception(error)
        
        return error_details
    
    @staticmethod
    def create_error_response(
        error: Exception,
        correlation_id: str,
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
        request: Optional[Request] = None,
        include_details: bool = False
    ) -> JSONResponse:
        """Create standardized error response"""
        
        error_details = ErrorHandler.log_error(error, correlation_id, request)
        
        response_data = ErrorResponse(
            error=type(error).__name__,
            message=str(error),
            correlation_id=correlation_id,
            timestamp=datetime.utcnow().isoformat(),
            path=str(request.url) if request else None,
            details=error_details if include_details else None
        )
        
        return JSONResponse(
            status_code=status_code,
            content=response_data.dict(exclude_none=True),
            headers={"X-Correlation-ID": correlation_id}
        )


async def correlation_id_middleware(request: Request, call_next):
    """Middleware to add correlation ID to all requests"""
    correlation_id = ErrorHandler.get_correlation_id(request)
    
    # Add to request state for access in route handlers
    request.state.correlation_id = correlation_id
    
    # Log request
    logger.info(
        f"{request.method} {request.url.path}",
        extra={'correlation_id': correlation_id}
    )
    
    try:
        response = await call_next(request)
        response.headers["X-Correlation-ID"] = correlation_id
        
        # Log response
        logger.info(
            f"Response: {response.status_code}",
            extra={'correlation_id': correlation_id}
        )
        
        return response
    except Exception as e:
        logger.error(
            f"Unhandled exception in middleware: {e}",
            extra={'correlation_id': correlation_id},
            exc_info=True
        )
        return ErrorHandler.create_error_response(
            e, correlation_id, request=request
        )


async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    """Handle HTTP exceptions"""
    correlation_id = getattr(request.state, 'correlation_id', str(uuid.uuid4()))
    
    logger.warning(
        f"HTTP Exception: {exc.status_code} - {exc.detail}",
        extra={'correlation_id': correlation_id}
    )
    
    return ErrorHandler.create_error_response(
        Exception(exc.detail),
        correlation_id,
        status_code=exc.status_code,
        request=request
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle validation errors"""
    correlation_id = getattr(request.state, 'correlation_id', str(uuid.uuid4()))
    
    logger.warning(
        f"Validation Error: {exc.errors()}",
        extra={'correlation_id': correlation_id}
    )
    
    error_response = ErrorResponse(
        error="ValidationError",
        message="Request validation failed",
        correlation_id=correlation_id,
        timestamp=datetime.utcnow().isoformat(),
        path=str(request.url),
        details={"validation_errors": exc.errors()}
    )
    
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=error_response.dict(),
        headers={"X-Correlation-ID": correlation_id}
    )


async def generic_exception_handler(request: Request, exc: Exception):
    """Handle all unhandled exceptions"""
    correlation_id = getattr(request.state, 'correlation_id', str(uuid.uuid4()))
    
    return ErrorHandler.create_error_response(
        exc,
        correlation_id,
        request=request,
        include_details=os.getenv("DEBUG", "false").lower() == "true"
    )


# Helper function to get correlation ID in route handlers
def get_correlation_id(request: Request) -> str:
    """Get correlation ID from request"""
    return getattr(request.state, 'correlation_id', 'N/A')
