"""
Database Service Layer - handles both SQLAlchemy and MongoDB operations
"""

from typing import Optional, List, Dict, Any, Union
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

from ..models.database import USE_MONGODB
from ..models.schemas import CompanyRegister

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


class UnifiedDatabaseService:
    """Service layer that works with both MongoDB and SQLAlchemy"""
    
    def __init__(self):
        self.use_mongodb = USE_MONGODB
    
    def create_company(self, company_data: CompanyRegister, hashed_password: str, db: Optional[Session] = None):
        """Create a new company"""
        if self.use_mongodb:
            company_dict = {
                "name": company_data.name,
                "email": company_data.email,
                "hashed_password": hashed_password,
                "company_type": company_data.company_type,
                "phone": company_data.phone,
                "address": company_data.address,
                "gstin": company_data.gstin,
                "subscription_tier": "free",
                "is_active": True,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            company_id = create_company_mongo(company_dict)
            if company_id:
                company_dict["id"] = company_id
                return company_dict
            return None
        else:
            # SQLAlchemy implementation
            db_company = SQLCompany(
                name=company_data.name,
                email=company_data.email,
                hashed_password=hashed_password,
                company_type=company_data.company_type,
                phone=company_data.phone,
                address=company_data.address,
                gstin=company_data.gstin
            )
            db.add(db_company)
            db.commit()
            db.refresh(db_company)
            return db_company
    
    def get_company_by_email(self, email: str, db: Optional[Session] = None):
        """Get company by email"""
        if self.use_mongodb:
            return find_company_by_email_mongo(email)
        else:
            return db.query(SQLCompany).filter(SQLCompany.email == email).first()
    
    def get_company_by_id(self, company_id: Union[str, int], db: Optional[Session] = None):
        """Get company by ID"""
        if self.use_mongodb:
            return find_company_by_id_mongo(str(company_id))
        else:
            return db.query(SQLCompany).filter(SQLCompany.id == company_id).first()
    
    def create_shipment(self, shipment_data: dict, company_id: Union[str, int], db: Optional[Session] = None):
        """Create a new shipment"""
        print(f"🔧 UnifiedDB: Creating shipment, use_mongodb={self.use_mongodb}")
        print(f"🔧 UnifiedDB: Company ID={company_id}, data={shipment_data}")
        
        if self.use_mongodb:
            shipment_data["company_id"] = str(company_id)
            shipment_data["created_at"] = datetime.utcnow()
            shipment_data["updated_at"] = datetime.utcnow()
            print(f"🔧 UnifiedDB: Calling create_shipment_mongo with data: {shipment_data}")
            shipment_id = create_shipment_mongo(shipment_data)
            print(f"🔧 UnifiedDB: MongoDB shipment_id result: {shipment_id}")
            if shipment_id:
                shipment_data["id"] = shipment_id
                return shipment_data
            return None
        else:
            # SQLAlchemy implementation
            db_shipment = SQLShipment(
                company_id=company_id,
                **shipment_data
            )
            db.add(db_shipment)
            db.commit()
            db.refresh(db_shipment)
            return db_shipment
    
    def get_shipments(self, company_id: Union[str, int], limit: int = 10, offset: int = 0, status: Optional[str] = None, db: Optional[Session] = None):
        """Get shipments for company"""
        if self.use_mongodb:
            return find_shipments_by_company_mongo(str(company_id), limit, offset, status)
        else:
            query = db.query(SQLShipment).filter(SQLShipment.company_id == company_id)
            if status:
                query = query.filter(SQLShipment.status == status)
            return query.offset(offset).limit(limit).order_by(SQLShipment.created_at.desc()).all()
    
    def get_shipment_by_id(self, shipment_id: Union[str, int], db: Optional[Session] = None):
        """Get shipment by ID"""
        if self.use_mongodb:
            return find_shipment_by_id_mongo(str(shipment_id))
        else:
            return db.query(SQLShipment).filter(SQLShipment.id == shipment_id).first()
    
    def get_company_analytics(self, company_id: Union[str, int], days: int = 30, db: Optional[Session] = None):
        """Get analytics for company"""
        if self.use_mongodb:
            # MongoDB analytics implementation
            from datetime import datetime, timedelta
            start_date = datetime.utcnow() - timedelta(days=days)
            
            # Get shipments for company from MongoDB
            shipments = find_shipments_by_company_mongo(str(company_id), limit=1000)
            
            # Filter by date and calculate metrics
            recent_shipments = []
            if shipments:
                for shipment in shipments:
                    if isinstance(shipment, dict):
                        shipment_date = shipment.get('created_at')
                        if shipment_date and shipment_date >= start_date:
                            recent_shipments.append(shipment)
            
            # Calculate basic analytics
            total_shipments = len(recent_shipments)
            total_cost = sum(s.get('total_cost', s.get('predicted_cost', 0)) for s in recent_shipments)
            total_revenue = sum(s.get('freight_charge', s.get('predicted_cost', 0) * 1.2) for s in recent_shipments)
            total_distance = sum(s.get('distance_km', 0) for s in recent_shipments)
            total_cargo_tons = sum(s.get('cargo_weight_tons', 0) for s in recent_shipments)
            
            completed_shipments = [s for s in recent_shipments if s.get('status') == 'completed']
            on_time_deliveries = len([s for s in completed_shipments if s.get('delay_hours', 0) <= 0])
            on_time_rate = (on_time_deliveries / len(completed_shipments)) if completed_shipments else 1.0
            
            avg_delay = sum(s.get('delay_hours', 0) for s in completed_shipments) / len(completed_shipments) if completed_shipments else 0
            
            # Calculate route analytics
            route_counts = {}
            route_profits = {}
            route_problems = {}
            
            for shipment in recent_shipments:
                route_key = f"{shipment.get('origin_city', 'Unknown')} → {shipment.get('destination_city', 'Unknown')}"
                
                # Count routes
                route_counts[route_key] = route_counts.get(route_key, 0) + 1
                
                # Calculate route profits
                cost = shipment.get('total_cost', shipment.get('predicted_cost', 0))
                revenue = shipment.get('freight_charge', cost * 1.2)
                profit = revenue - cost
                if route_key not in route_profits:
                    route_profits[route_key] = {'total_profit': 0, 'count': 0}
                route_profits[route_key]['total_profit'] += profit
                route_profits[route_key]['count'] += 1
                
                # Track route problems
                if shipment.get('delay_hours', 0) > 24 or shipment.get('status') == 'cancelled':
                    route_problems[route_key] = route_problems.get(route_key, 0) + 1
            
            # Get top routes
            most_used_routes = [
                {"route": route, "count": count, "percentage": (count/total_shipments)*100 if total_shipments > 0 else 0}
                for route, count in sorted(route_counts.items(), key=lambda x: x[1], reverse=True)[:5]
            ]
            
            most_profitable_routes = [
                {
                    "route": route, 
                    "avg_profit": data['total_profit'] / data['count'], 
                    "total_profit": data['total_profit'],
                    "shipments": data['count']
                }
                for route, data in sorted(route_profits.items(), key=lambda x: x[1]['total_profit']/x[1]['count'], reverse=True)[:5]
            ]
            
            most_problematic_routes = [
                {
                    "route": route, 
                    "problem_count": problems,
                    "total_shipments": route_counts.get(route, 0),
                    "problem_rate": (problems / route_counts.get(route, 1)) * 100
                }
                for route, problems in sorted(route_problems.items(), key=lambda x: x[1], reverse=True)[:5]
            ]
            
            return {
                "period": f"{days}d",
                "total_shipments": total_shipments,
                "total_distance_km": total_distance,
                "total_cargo_tons": total_cargo_tons,
                "total_cost": total_cost,
                "total_revenue": total_revenue,
                "profit": total_revenue - total_cost,
                "profit_margin_percentage": ((total_revenue - total_cost) / total_revenue * 100) if total_revenue > 0 else 0,
                "avg_cost_per_shipment": total_cost / total_shipments if total_shipments > 0 else 0,
                "on_time_delivery_rate": on_time_rate,
                "avg_delay_hours": avg_delay,
                "incident_rate": 0.05,  # Default placeholder
                "cost_trend": "stable",  # Simple placeholder
                "volume_trend": "stable",  # Simple placeholder
                "most_used_routes": most_used_routes,
                "most_profitable_routes": most_profitable_routes,
                "most_problematic_routes": most_problematic_routes
            }
        else:
            # SQLAlchemy analytics implementation
            from datetime import datetime, timedelta
            start_date = datetime.utcnow() - timedelta(days=days)
            
            shipments = db.query(SQLShipment).filter(
                SQLShipment.company_id == company_id,
                SQLShipment.created_at >= start_date
            ).all()
            
            total_shipments = len(shipments)
            total_cost = sum(s.total_cost or s.predicted_cost or 0 for s in shipments)
            total_revenue = sum(s.freight_charge or (s.predicted_cost or 0) * 1.2 for s in shipments)
            total_distance = sum(s.distance_km or 0 for s in shipments)
            total_cargo_tons = sum(s.cargo_weight_tons or 0 for s in shipments)
            
            completed_shipments = [s for s in shipments if s.status == 'completed']
            on_time_deliveries = len([s for s in completed_shipments if (s.delay_hours or 0) <= 0])
            on_time_rate = (on_time_deliveries / len(completed_shipments)) if completed_shipments else 1.0
            
            avg_delay = sum(s.delay_hours or 0 for s in completed_shipments) / len(completed_shipments) if completed_shipments else 0
            
            # Calculate route analytics
            route_counts = {}
            route_profits = {}
            route_problems = {}
            
            for shipment in shipments:
                route_key = f"{shipment.origin_city or 'Unknown'} → {shipment.destination_city or 'Unknown'}"
                
                # Count routes
                route_counts[route_key] = route_counts.get(route_key, 0) + 1
                
                # Calculate route profits
                cost = shipment.total_cost or shipment.predicted_cost or 0
                revenue = shipment.freight_charge or cost * 1.2
                profit = revenue - cost
                if route_key not in route_profits:
                    route_profits[route_key] = {'total_profit': 0, 'count': 0}
                route_profits[route_key]['total_profit'] += profit
                route_profits[route_key]['count'] += 1
                
                # Track route problems
                if (shipment.delay_hours or 0) > 24 or shipment.status == 'cancelled':
                    route_problems[route_key] = route_problems.get(route_key, 0) + 1
            
            # Get top routes
            most_used_routes = [
                {"route": route, "count": count, "percentage": (count/total_shipments)*100 if total_shipments > 0 else 0}
                for route, count in sorted(route_counts.items(), key=lambda x: x[1], reverse=True)[:5]
            ]
            
            most_profitable_routes = [
                {
                    "route": route, 
                    "avg_profit": data['total_profit'] / data['count'], 
                    "total_profit": data['total_profit'],
                    "shipments": data['count']
                }
                for route, data in sorted(route_profits.items(), key=lambda x: x[1]['total_profit']/x[1]['count'], reverse=True)[:5]
            ]
            
            most_problematic_routes = [
                {
                    "route": route, 
                    "problem_count": problems,
                    "total_shipments": route_counts.get(route, 0),
                    "problem_rate": (problems / route_counts.get(route, 1)) * 100
                }
                for route, problems in sorted(route_problems.items(), key=lambda x: x[1], reverse=True)[:5]
            ]
            
            return {
                "period": f"{days}d",
                "total_shipments": total_shipments,
                "total_distance_km": total_distance,
                "total_cargo_tons": total_cargo_tons,
                "total_cost": total_cost,
                "total_revenue": total_revenue,
                "profit": total_revenue - total_cost,
                "profit_margin_percentage": ((total_revenue - total_cost) / total_revenue * 100) if total_revenue > 0 else 0,
                "avg_cost_per_shipment": total_cost / total_shipments if total_shipments > 0 else 0,
                "on_time_delivery_rate": on_time_rate,
                "avg_delay_hours": avg_delay,
                "incident_rate": 0.05,  # Default placeholder
                "cost_trend": "stable",  # Simple placeholder
                "volume_trend": "stable",  # Simple placeholder
                "most_used_routes": most_used_routes,
                "most_profitable_routes": most_profitable_routes,
                "most_problematic_routes": most_problematic_routes
            }
    
    def get_analytics(self, company_id: Union[str, int], period_days: int = 30, db: Optional[Session] = None):
        """Get analytics for company"""
        if self.use_mongodb:
            return get_analytics_mongo(str(company_id), period_days)
        else:
            # SQLAlchemy implementation (from the original db_service.py)
            from datetime import datetime, timedelta
            from sqlalchemy import desc, func
            
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


# Singleton instance
db_service = UnifiedDatabaseService()