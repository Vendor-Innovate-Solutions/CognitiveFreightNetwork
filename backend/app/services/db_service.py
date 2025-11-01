"""
Unified Database Service Layer
Provides a common interface for both SQLAlchemy and MongoDB operations
"""

from typing import Optional, List, Dict, Any, Union
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
import asyncio

from ..models.database import USE_MONGODB
from ..models.schemas import CompanyCreate, ShipmentCreate

if USE_MONGODB:
    from ..models.mongodb_simple import (
        create_company_mongo,
        find_company_by_email_mongo,
        find_company_by_id_mongo,
        create_shipment_mongo,
        find_shipments_by_company_mongo,
        find_shipment_by_id_mongo,
        get_analytics_mongo
    )
else:
    from ..models.database import Company as SQLCompany, Shipment as SQLShipment


class DatabaseService:
    """Unified database service for both SQL and MongoDB"""
    
    def __init__(self):
        self.use_mongodb = USE_MONGODB
    
    # Company operations
    async def create_company(self, company_data: CompanyCreate, hashed_password: str) -> Union[dict, Any]:
        """Create a new company"""
        if self.use_mongodb:
            company = MongoCompany(
                name=company_data.name,
                email=company_data.email,
                hashed_password=hashed_password,
                company_type=company_data.company_type,
                phone=company_data.phone,
                address=company_data.address,
                gstin=company_data.gstin
            )
            return await company_repo.create(company)
        else:
            # SQLAlchemy implementation would go here
            pass
    
    async def get_company_by_email(self, email: str) -> Optional[Union[dict, Any]]:
        """Get company by email"""
        if self.use_mongodb:
            return await company_repo.find_by_email(email)
        else:
            # SQLAlchemy implementation would go here
            pass
    
    async def get_company_by_id(self, company_id: str) -> Optional[Union[dict, Any]]:
        """Get company by ID"""
        if self.use_mongodb:
            return await company_repo.find_by_id(company_id)
        else:
            # SQLAlchemy implementation would go here
            pass
    
    # Shipment operations
    async def create_shipment(self, shipment_data: dict, company_id: str) -> Union[dict, Any]:
        """Create a new shipment"""
        if self.use_mongodb:
            from bson import ObjectId
            shipment = MongoShipment(
                company_id=ObjectId(company_id),
                **shipment_data
            )
            return await shipment_repo.create(shipment)
        else:
            # SQLAlchemy implementation would go here
            pass
    
    async def get_shipments(self, company_id: str, limit: int = 10, offset: int = 0, status: Optional[str] = None) -> List[Union[dict, Any]]:
        """Get shipments for a company"""
        if self.use_mongodb:
            return await shipment_repo.find_by_company(company_id, limit, offset, status)
        else:
            # SQLAlchemy implementation would go here
            pass
    
    async def get_shipment_by_id(self, shipment_id: str) -> Optional[Union[dict, Any]]:
        """Get shipment by ID"""
        if self.use_mongodb:
            return await shipment_repo.find_by_id(shipment_id)
        else:
            # SQLAlchemy implementation would go here
            pass
    
    async def get_analytics(self, company_id: str, period_days: int = 30) -> Dict[str, Any]:
        """Get analytics for a company"""
        if self.use_mongodb:
            return await shipment_repo.get_analytics(company_id, period_days)
        else:
            # SQLAlchemy implementation would go here
            return {
                "total_shipments": 0,
                "total_cost": 0,
                "total_revenue": 0,
                "profit": 0,
                "profit_margin_percentage": 0,
                "avg_cost_per_shipment": 0,
                "on_time_delivery_rate": 0,
                "avg_delay_hours": 0,
                "incident_rate": 0,
                "period": f"{period_days}d"
            }


# Singleton instance
db_service = DatabaseService()


# Helper functions for backward compatibility
def get_company_by_email_sync(db: Session, email: str):
    """Sync version for SQLAlchemy compatibility"""
    if USE_MONGODB:
        # Run async function in sync context
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            return loop.run_until_complete(db_service.get_company_by_email(email))
        finally:
            loop.close()
    else:
        return db.query(SQLCompany).filter(SQLCompany.email == email).first()


def create_company_sync(db: Session, company: CompanyCreate, hashed_password: str):
    """Sync version for SQLAlchemy compatibility"""
    if USE_MONGODB:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            return loop.run_until_complete(db_service.create_company(company, hashed_password))
        finally:
            loop.close()
    else:
        db_company = SQLCompany(
            name=company.name,
            email=company.email,
            hashed_password=hashed_password,
            company_type=company.company_type,
            phone=company.phone,
            address=company.address,
            gstin=company.gstin
        )
        db.add(db_company)
        db.commit()
        db.refresh(db_company)
        return db_company


def get_dashboard_analytics_sync(db: Session, company_id: int, period_days: int = 30):
    """Sync version for SQLAlchemy compatibility"""
    if USE_MONGODB:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            return loop.run_until_complete(db_service.get_analytics(str(company_id), period_days))
        finally:
            loop.close()
    else:
        # Original SQLAlchemy implementation
        from datetime import datetime, timedelta
        
        # Calculate date range
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=period_days)
        
        # Query shipments for the period
        shipments = db.query(SQLShipment).filter(
            SQLShipment.company_id == company_id,
            SQLShipment.created_at >= start_date
        ).all()
        
        if not shipments:
            return {
                "total_shipments": 0,
                "total_cost": 0,
                "total_revenue": 0,
                "profit": 0,
                "profit_margin_percentage": 0,
                "avg_cost_per_shipment": 0,
                "on_time_delivery_rate": 0,
                "avg_delay_hours": 0,
                "incident_rate": 0,
                "period": f"{period_days}d"
            }
        
        # Calculate metrics
        total_shipments = len(shipments)
        total_cost = sum(s.total_cost or 0 for s in shipments)
        total_revenue = sum(s.freight_charge or 0 for s in shipments)
        profit = total_revenue - total_cost
        profit_margin = (profit / total_revenue * 100) if total_revenue > 0 else 0
        avg_cost = total_cost / total_shipments if total_shipments > 0 else 0
        
        # On-time delivery rate
        on_time_shipments = sum(1 for s in shipments if (s.delay_hours or 0) <= 0)
        on_time_rate = on_time_shipments / total_shipments if total_shipments > 0 else 0
        
        # Average delay
        avg_delay = sum(s.delay_hours or 0 for s in shipments) / total_shipments if total_shipments > 0 else 0
        
        # Incident rate
        incidents = sum(1 for s in shipments if s.had_breakdown or s.had_damage or s.had_theft)
        incident_rate = incidents / total_shipments if total_shipments > 0 else 0
        
        return {
            "total_shipments": total_shipments,
            "total_cost": total_cost,
            "total_revenue": total_revenue,
            "profit": profit,
            "profit_margin_percentage": profit_margin,
            "avg_cost_per_shipment": avg_cost,
            "on_time_delivery_rate": on_time_rate,
            "avg_delay_hours": avg_delay,
            "incident_rate": incident_rate,
            "period": f"{period_days}d"
        }