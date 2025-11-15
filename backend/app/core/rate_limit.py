"""
API Rate Limiting and Caching Module
Provides in-memory rate limiting and caching for production use
Note: For production with multiple instances, use Redis
"""

import time
from typing import Dict, Any, Optional, Callable
from datetime import datetime, timedelta
from collections import defaultdict
from fastapi import Request, HTTPException, status
from functools import wraps
import hashlib
import json


class InMemoryRateLimiter:
    """
    Simple in-memory rate limiter
    For production with multiple instances, use Redis
    """
    
    def __init__(self):
        # Store: {client_id: [(timestamp, count)]}
        self.requests: Dict[str, list] = defaultdict(list)
        self.cleanup_interval = 3600  # Clean up old entries every hour
        self.last_cleanup = time.time()
    
    def _cleanup_old_entries(self):
        """Remove expired entries to prevent memory bloat"""
        current_time = time.time()
        if current_time - self.last_cleanup > self.cleanup_interval:
            for client_id in list(self.requests.keys()):
                self.requests[client_id] = [
                    (ts, count) for ts, count in self.requests[client_id]
                    if current_time - ts < 3600  # Keep last hour
                ]
                if not self.requests[client_id]:
                    del self.requests[client_id]
            self.last_cleanup = current_time
    
    def is_rate_limited(
        self,
        client_id: str,
        max_requests: int = 100,
        window_seconds: int = 60
    ) -> tuple[bool, Dict[str, Any]]:
        """
        Check if client has exceeded rate limit
        
        Args:
            client_id: Unique identifier for the client
            max_requests: Maximum number of requests allowed
            window_seconds: Time window in seconds
        
        Returns:
            (is_limited, info_dict)
        """
        self._cleanup_old_entries()
        
        current_time = time.time()
        window_start = current_time - window_seconds
        
        # Get requests in current window
        client_requests = self.requests[client_id]
        recent_requests = [
            (ts, count) for ts, count in client_requests
            if ts > window_start
        ]
        
        total_requests = sum(count for _, count in recent_requests)
        
        # Add current request
        if recent_requests and current_time - recent_requests[-1][0] < 1:
            # Same second, increment count
            recent_requests[-1] = (recent_requests[-1][0], recent_requests[-1][1] + 1)
        else:
            recent_requests.append((current_time, 1))
        
        self.requests[client_id] = recent_requests
        total_requests += 1
        
        is_limited = total_requests > max_requests
        
        # Calculate retry after
        if is_limited and recent_requests:
            oldest_request_time = recent_requests[0][0]
            retry_after = int(oldest_request_time + window_seconds - current_time) + 1
        else:
            retry_after = 0
        
        info = {
            "limit": max_requests,
            "remaining": max(0, max_requests - total_requests),
            "reset": int(window_start + window_seconds),
            "retry_after": retry_after if is_limited else None
        }
        
        return is_limited, info


class InMemoryCache:
    """
    Simple in-memory cache with TTL
    For production with multiple instances, use Redis
    """
    
    def __init__(self):
        # Store: {key: (value, expiry_timestamp)}
        self.cache: Dict[str, tuple[Any, float]] = {}
        self.cleanup_interval = 300  # Clean up every 5 minutes
        self.last_cleanup = time.time()
    
    def _cleanup_expired(self):
        """Remove expired cache entries"""
        current_time = time.time()
        if current_time - self.last_cleanup > self.cleanup_interval:
            expired_keys = [
                key for key, (_, expiry) in self.cache.items()
                if expiry < current_time
            ]
            for key in expired_keys:
                del self.cache[key]
            self.last_cleanup = current_time
    
    def get(self, key: str) -> Optional[Any]:
        """Get value from cache if not expired"""
        self._cleanup_expired()
        
        if key in self.cache:
            value, expiry = self.cache[key]
            if expiry > time.time():
                return value
            else:
                del self.cache[key]
        return None
    
    def set(self, key: str, value: Any, ttl_seconds: int = 300):
        """Set value in cache with TTL"""
        expiry = time.time() + ttl_seconds
        self.cache[key] = (value, expiry)
    
    def delete(self, key: str):
        """Delete key from cache"""
        if key in self.cache:
            del self.cache[key]
    
    def clear(self):
        """Clear all cache"""
        self.cache.clear()
    
    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        current_time = time.time()
        active_entries = sum(
            1 for _, (_, expiry) in self.cache.items()
            if expiry > current_time
        )
        return {
            "total_entries": len(self.cache),
            "active_entries": active_entries,
            "expired_entries": len(self.cache) - active_entries
        }


# Global instances
rate_limiter = InMemoryRateLimiter()
cache = InMemoryCache()


def get_client_id(request: Request) -> str:
    """Generate client ID from request"""
    # Try to get authenticated user first
    if hasattr(request.state, 'correlation_id'):
        return f"user:{request.state.correlation_id}"
    
    # Fall back to IP address
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        client_ip = forwarded.split(",")[0]
    else:
        client_ip = request.client.host if request.client else "unknown"
    
    return f"ip:{client_ip}"


def generate_cache_key(prefix: str, **params) -> str:
    """Generate cache key from parameters"""
    # Sort parameters for consistent key generation
    param_str = json.dumps(params, sort_keys=True)
    param_hash = hashlib.md5(param_str.encode()).hexdigest()[:8]
    return f"{prefix}:{param_hash}"


async def rate_limit_middleware(
    request: Request,
    call_next,
    max_requests: int = 100,
    window_seconds: int = 60
):
    """
    Middleware to enforce rate limiting
    
    Usage:
        app.middleware("http")(lambda req, call_next: rate_limit_middleware(req, call_next, 100, 60))
    """
    # Skip rate limiting for health checks
    if request.url.path.startswith("/health"):
        return await call_next(request)
    
    client_id = get_client_id(request)
    is_limited, info = rate_limiter.is_rate_limited(
        client_id, max_requests, window_seconds
    )
    
    if is_limited:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Rate limit exceeded. Retry after {info['retry_after']} seconds.",
            headers={
                "X-RateLimit-Limit": str(info["limit"]),
                "X-RateLimit-Remaining": str(info["remaining"]),
                "X-RateLimit-Reset": str(info["reset"]),
                "Retry-After": str(info["retry_after"])
            }
        )
    
    response = await call_next(request)
    
    # Add rate limit headers
    response.headers["X-RateLimit-Limit"] = str(info["limit"])
    response.headers["X-RateLimit-Remaining"] = str(info["remaining"])
    response.headers["X-RateLimit-Reset"] = str(info["reset"])
    
    return response


def cached(ttl_seconds: int = 300, key_prefix: str = "cache"):
    """
    Decorator for caching endpoint responses
    
    Usage:
        @cached(ttl_seconds=600, key_prefix="ports")
        async def get_ports():
            ...
    """
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Generate cache key from function name and arguments
            cache_key = generate_cache_key(
                f"{key_prefix}:{func.__name__}",
                args=str(args),
                kwargs=str(kwargs)
            )
            
            # Try to get from cache
            cached_value = cache.get(cache_key)
            if cached_value is not None:
                return cached_value
            
            # Call function and cache result
            result = await func(*args, **kwargs)
            cache.set(cache_key, result, ttl_seconds)
            
            return result
        return wrapper
    return decorator


# Predefined rate limit configurations
class RateLimits:
    """Common rate limit configurations"""
    
    # Very restrictive for expensive operations
    STRICT = {"max_requests": 10, "window_seconds": 60}
    
    # Standard for most API endpoints
    STANDARD = {"max_requests": 100, "window_seconds": 60}
    
    # Generous for read-only operations
    GENEROUS = {"max_requests": 1000, "window_seconds": 60}
    
    # Public endpoints
    PUBLIC = {"max_requests": 50, "window_seconds": 60}


# Predefined cache TTLs
class CacheTTL:
    """Common cache TTL configurations"""
    
    SHORT = 60  # 1 minute
    MEDIUM = 300  # 5 minutes
    LONG = 1800  # 30 minutes
    VERY_LONG = 3600  # 1 hour
    DAY = 86400  # 24 hours
