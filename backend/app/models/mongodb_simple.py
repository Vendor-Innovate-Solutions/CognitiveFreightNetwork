"""
Simplified MongoDB Configuration
Compatible with current Pydantic version and your existing system
"""

import os
from typing import Optional, List, Dict, Any
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import MongoClient
from bson import ObjectId

# MongoDB Connection
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb+srv://venkateshk:venkat*2005@cluster0.mujtrmk.mongodb.net/")
DATABASE_NAME = "cognitive_freight_network"

# Global clients
mongodb_client = None
mongodb_db = None


def init_mongodb():
    """Initialize MongoDB connections"""
    global mongodb_client, mongodb_db
    
    try:
        # Use sync client for simplicity
        mongodb_client = MongoClient(MONGODB_URL)
        mongodb_db = mongodb_client[DATABASE_NAME]
        
        # Test connection
        mongodb_client.admin.command('ping')
        print("✅ MongoDB connection successful")
        return mongodb_db
        
    except Exception as e:
        print(f"❌ MongoDB connection failed: {e}")
        return None


def get_mongodb():
    """Get MongoDB database instance"""
    global mongodb_db
    if mongodb_db is None:
        init_mongodb()
    return mongodb_db


# Simple data access functions (without Pydantic models for now)

def create_company_mongo(company_data: dict) -> Optional[str]:
    """Create company in MongoDB"""
    try:
        db = get_mongodb()
        if db is None:
            return None
            
        result = db.companies.insert_one(company_data)
        return str(result.inserted_id)
    except Exception as e:
        print(f"Error creating company: {e}")
        return None


def find_company_by_email_mongo(email: str) -> Optional[dict]:
    """Find company by email in MongoDB"""
    try:
        db = get_mongodb()
        if db is None:
            return None
            
        company = db.companies.find_one({"email": email})
        if company:
            company["_id"] = str(company["_id"])
        return company
    except Exception as e:
        print(f"Error finding company: {e}")
        return None


def find_company_by_id_mongo(company_id: str) -> Optional[dict]:
    """Find company by ID in MongoDB"""
    try:
        db = get_mongodb()
        if db is None:
            return None
            
        company = db.companies.find_one({"_id": ObjectId(company_id)})
        if company:
            company["_id"] = str(company["_id"])
        return company
    except Exception as e:
        print(f"Error finding company by ID: {e}")
        return None


def create_shipment_mongo(shipment_data: dict) -> Optional[str]:
    """Create shipment in MongoDB"""
    try:
        print(f"🔧 MongoDB: create_shipment_mongo called with: {shipment_data}")
        db = get_mongodb()
        if db is None:
            print(f"🔧 MongoDB: Failed to get database connection")
            return None
            
        print(f"🔧 MongoDB: Inserting shipment with company_id as string: {shipment_data.get('company_id')}")
        result = db.shipments.insert_one(shipment_data)
        shipment_id = str(result.inserted_id)
        print(f"🔧 MongoDB: Successfully created shipment with ID: {shipment_id}")
        return shipment_id
    except Exception as e:
        print(f"🔧 MongoDB: Error creating shipment: {e}")
        return None


def find_shipments_by_company_mongo(company_id: str, limit: int = 10, offset: int = 0, status: Optional[str] = None) -> List[dict]:
    """Find shipments by company in MongoDB"""
    try:
        db = get_mongodb()
        if db is None:
            return []
            
        # Company ID is stored as string in shipments, not ObjectId
        query = {"company_id": company_id}
        if status:
            query["status"] = status
        
        cursor = db.shipments.find(query).skip(offset).limit(limit).sort("created_at", -1)
        shipments = list(cursor)
        
        # Convert ObjectIds to strings
        for shipment in shipments:
            shipment["_id"] = str(shipment["_id"])
            # company_id is already a string, no conversion needed
            
        return shipments
    except Exception as e:
        print(f"Error finding shipments: {e}")
        return []


def find_shipment_by_id_mongo(shipment_id: str) -> Optional[dict]:
    """Find shipment by ID in MongoDB"""
    try:
        db = get_mongodb()
        if db is None:
            return None
            
        shipment = db.shipments.find_one({"_id": ObjectId(shipment_id)})
        if shipment:
            shipment["_id"] = str(shipment["_id"])
            shipment["company_id"] = str(shipment["company_id"])
        return shipment
    except Exception as e:
        print(f"Error finding shipment by ID: {e}")
        return None


def get_analytics_mongo(company_id: str, period_days: int = 30) -> dict:
    """Get analytics for company from MongoDB"""
    try:
        db = get_mongodb()
        if db is None:
            return _empty_analytics(period_days)
            
        pipeline = [
            {"$match": {"company_id": ObjectId(company_id)}},
            {"$group": {
                "_id": None,
                "total_shipments": {"$sum": 1},
                "total_cost": {"$sum": {"$ifNull": ["$total_cost", 0]}},
                "total_revenue": {"$sum": {"$ifNull": ["$freight_charge", 0]}},
                "avg_cost_per_shipment": {"$avg": {"$ifNull": ["$total_cost", 0]}},
                "avg_delay_hours": {"$avg": {"$ifNull": ["$delay_hours", 0]}},
                "on_time_count": {"$sum": {"$cond": [{"$lte": [{"$ifNull": ["$delay_hours", 0]}, 0]}, 1, 0]}},
                "incident_count": {"$sum": {"$cond": [
                    {"$or": [
                        {"$eq": ["$had_breakdown", True]}, 
                        {"$eq": ["$had_damage", True]}, 
                        {"$eq": ["$had_theft", True]}
                    ]}, 1, 0
                ]}}
            }}
        ]
        
        result = list(db.shipments.aggregate(pipeline))
        if not result:
            return _empty_analytics(period_days)
        
        data = result[0]
        total_cost = data.get("total_cost", 0) or 0
        total_revenue = data.get("total_revenue", 0) or 0
        profit = total_revenue - total_cost
        profit_margin = (profit / total_revenue * 100) if total_revenue > 0 else 0
        total_shipments = data.get("total_shipments", 0)
        on_time_rate = (data.get("on_time_count", 0) / total_shipments) if total_shipments > 0 else 0
        incident_rate = (data.get("incident_count", 0) / total_shipments) if total_shipments > 0 else 0
        
        return {
            "total_shipments": total_shipments,
            "total_cost": total_cost,
            "total_revenue": total_revenue,
            "profit": profit,
            "profit_margin_percentage": profit_margin,
            "avg_cost_per_shipment": data.get("avg_cost_per_shipment", 0) or 0,
            "on_time_delivery_rate": on_time_rate,
            "avg_delay_hours": data.get("avg_delay_hours", 0) or 0,
            "incident_rate": incident_rate,
            "period": f"{period_days}d"
        }
        
    except Exception as e:
        print(f"Error getting analytics: {e}")
        return _empty_analytics(period_days)


def _empty_analytics(period_days: int) -> dict:
    """Return empty analytics structure"""
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