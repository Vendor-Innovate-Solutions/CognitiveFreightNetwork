# Production Deployment Guide

## Overview
This guide provides comprehensive instructions for deploying the Cognitive Freight Network API to production.

## ✅ Production-Ready Features Implemented

### 1. UI Consistency
- ✅ Unified color scheme using Tailwind CSS variables
- ✅ Consistent theming across all components
- ✅ Easy theme customization via `globals.css`

### 2. Error Handling & Monitoring
- ✅ Correlation ID tracking for all requests
- ✅ Standardized error responses
- ✅ Structured logging with context
- ✅ Ready for Sentry integration
- ✅ Comprehensive health check endpoints

### 3. Security
- ✅ OWASP-recommended security headers
- ✅ Environment-based CORS configuration
- ✅ Password strength validation
- ✅ API key authentication support
- ✅ IP whitelist/blacklist capability

### 4. Performance
- ✅ In-memory rate limiting (100 req/min default)
- ✅ In-memory caching with TTL
- ✅ Ready for Redis migration
- ✅ Cache statistics monitoring

### 5. Monitoring
- ✅ Health check endpoints
  - `/health` - Basic health check
  - `/health/detailed` - Full system metrics
  - `/health/ready` - Readiness probe
  - `/health/live` - Liveness probe
  - `/health/cache` - Cache statistics
- ✅ System metrics (CPU, memory, disk)
- ✅ Database health monitoring
- ✅ External service status
- ✅ ML model health tracking

## 🚀 Deployment Steps

### Prerequisites
- Python 3.11+
- Node.js 18+
- MongoDB Atlas account or MongoDB server
- Google Maps API key
- Weather API key
- Mapbox access token

### Backend Deployment

#### 1. Environment Configuration

Create `.env` file:
```bash
# Environment
ENVIRONMENT=production

# Database
MONGODB_URL=mongodb+srv://username:password@cluster.mongodb.net/
USE_MONGODB=true

# Security
SECRET_KEY=your-super-secret-key-min-32-chars
API_KEYS=key1,key2,key3

# External APIs
GOOGLE_MAPS_API_KEY=your-google-maps-key
WEATHER_API_KEY=your-weather-api-key
MAPBOX_TOKEN=your-mapbox-token

# CORS
CORS_ORIGINS=https://yourdomain.com,https://api.yourdomain.com

# Optional: IP Security
IP_WHITELIST=
IP_BLACKLIST=

# Optional: Sentry
SENTRY_DSN=your-sentry-dsn
```

#### 2. Install Dependencies
```bash
cd backend
pip install -r requirements.txt
```

#### 3. Run with Uvicorn
```bash
# Development
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Production
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

#### 4. Docker Deployment
```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
```

Build and run:
```bash
docker build -t cognitive-freight-api .
docker run -p 8000:8000 --env-file .env cognitive-freight-api
```

### Frontend Deployment

#### 1. Environment Configuration

Create `.env.local`:
```bash
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_MAPBOX_TOKEN=your-mapbox-token
NEXT_PUBLIC_ENVIRONMENT=production
```

#### 2. Build and Deploy
```bash
cd frontend
npm install
npm run build
npm start
```

#### 3. Docker Deployment
```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:18-alpine

WORKDIR /app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/public ./public

EXPOSE 3000

CMD ["npm", "start"]
```

## 🔧 Configuration

### Rate Limiting

Adjust rate limits in `app/core/rate_limit.py`:
```python
class RateLimits:
    STRICT = {"max_requests": 10, "window_seconds": 60}
    STANDARD = {"max_requests": 100, "window_seconds": 60}
    GENEROUS = {"max_requests": 1000, "window_seconds": 60}
```

### Caching

Configure cache TTLs in `app/core/rate_limit.py`:
```python
class CacheTTL:
    SHORT = 60      # 1 minute
    MEDIUM = 300    # 5 minutes
    LONG = 1800     # 30 minutes
    VERY_LONG = 3600  # 1 hour
    DAY = 86400     # 24 hours
```

### Security Headers

Customize security headers in `app/core/security.py`:
```python
class SecurityHeaders:
    @staticmethod
    def get_security_headers() -> dict:
        return {
            "X-Frame-Options": "DENY",
            "X-Content-Type-Options": "nosniff",
            # ... more headers
        }
```

## 📊 Monitoring

### Health Checks

Set up monitoring for these endpoints:
- `GET /health` - Overall health status
- `GET /health/detailed` - Detailed system metrics
- `GET /health/ready` - Readiness probe (Kubernetes)
- `GET /health/live` - Liveness probe (Kubernetes)
- `GET /health/cache` - Cache statistics

### Metrics to Monitor
- Response times
- Error rates
- Rate limit hits
- Cache hit/miss ratios
- Database response times
- ML model performance
- System resources (CPU, memory, disk)

### Recommended Tools
- **Monitoring**: Prometheus + Grafana
- **Logging**: ELK Stack or Loki
- **Error Tracking**: Sentry
- **Uptime**: UptimeRobot or Pingdom
- **APM**: New Relic or DataDog

## 🔐 Security Checklist

- [x] Security headers implemented
- [x] CORS properly configured
- [x] Rate limiting enabled
- [x] Password strength validation
- [ ] HTTPS/TLS certificates configured
- [ ] API keys rotated regularly
- [ ] Database credentials secured
- [ ] Environment variables not committed
- [ ] Regular security updates
- [ ] Backup and recovery tested

## 🚦 Performance Optimization

### Current Optimizations
- ✅ In-memory caching for frequently accessed data
- ✅ Rate limiting to prevent abuse
- ✅ Efficient database queries with indexes
- ✅ ML model caching

### Recommended Upgrades
- [ ] Redis for distributed caching and rate limiting
- [ ] CDN for static assets
- [ ] Load balancer for multiple instances
- [ ] Database connection pooling
- [ ] Query result caching
- [ ] Background job processing (Celery)

## 🔄 Migration to Redis

For multi-instance deployments, migrate to Redis:

### 1. Install Redis
```bash
pip install redis
```

### 2. Update Rate Limiter
Replace `InMemoryRateLimiter` with Redis-based implementation in `app/core/rate_limit.py`

### 3. Update Cache
Replace `InMemoryCache` with Redis cache

### 4. Configure Redis
```python
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
```

## 📝 Logging

### Log Levels
- `ERROR`: System errors, exceptions
- `WARNING`: Degraded functionality
- `INFO`: General information, API calls
- `DEBUG`: Detailed debugging information

### Log Format
```
timestamp - logger_name - level - [correlation_id] - message
```

### Log Rotation
Configure log rotation for production:
```python
logging.handlers.RotatingFileHandler(
    'app.log',
    maxBytes=10485760,  # 10MB
    backupCount=10
)
```

## 🧪 Testing

### Health Check Tests
```bash
# Basic health
curl http://localhost:8000/health

# Detailed health
curl http://localhost:8000/health/detailed

# Cache stats
curl http://localhost:8000/health/cache
```

### Rate Limit Tests
```bash
# Test rate limiting
for i in {1..101}; do
  curl -I http://localhost:8000/api/endpoint
done
```

### Load Testing
```bash
# Using Apache Bench
ab -n 1000 -c 10 http://localhost:8000/health

# Using wrk
wrk -t12 -c400 -d30s http://localhost:8000/health
```

## 🐛 Troubleshooting

### Common Issues

**Issue**: Rate limit errors
**Solution**: Adjust rate limits or implement Redis for distributed limiting

**Issue**: Cache not working
**Solution**: Check cache TTL settings and memory limits

**Issue**: Security headers not applied
**Solution**: Verify middleware order in main.py

**Issue**: CORS errors
**Solution**: Update CORS_ORIGINS environment variable

**Issue**: MongoDB connection failed
**Solution**: Check MONGODB_URL and network connectivity

## 📞 Support

For issues or questions:
- Check documentation in `/docs` endpoint
- Review health endpoints for system status
- Check logs for error messages with correlation IDs
- Monitor system metrics via `/health/detailed`

## 🔄 Continuous Improvement

### Planned Enhancements
1. JWT refresh tokens
2. Role-based access control
3. Email notifications
4. PDF report generation
5. Excel export functionality
6. Real-time analytics
7. Mobile app support
8. Multi-language support

### Feedback
Please report issues or suggestions through GitHub issues or your project management system.

---

**Last Updated**: Current deployment includes Phase 1 production features
**Version**: 2.0.0
**Status**: Production-Ready (with recommended upgrades for scale)
