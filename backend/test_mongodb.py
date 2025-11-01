#!/usr/bin/env python3

"""
Simple script to test MongoDB connection and data
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.models.mongodb_simple import init_mongodb, get_mongodb, find_company_by_email_mongo

def main():
    print("Testing MongoDB connection...")
    
    try:
        init_mongodb()
        db = get_mongodb()
        
        if db is None:
            print("❌ Failed to connect to MongoDB")
            return
        
        print("✅ MongoDB connection successful")
        
        # Check all companies
        companies = list(db.companies.find())
        print(f"\n📊 Found {len(companies)} companies in database:")
        
        for company in companies:
            print(f"  - Email: {company.get('email')}")
            print(f"    Name: {company.get('name')}")
            print(f"    ID: {company.get('_id')}")
            print()
        
        # Test specific email lookup
        test_email = "newtest@company.com"
        print(f"🔍 Testing lookup for email: {test_email}")
        
        company = find_company_by_email_mongo(test_email)
        if company:
            print("✅ Company found via function:")
            print(f"  Email: {company.get('email')}")
            print(f"  Name: {company.get('name')}")
            print(f"  Has password: {'hashed_password' in company}")
        else:
            print("❌ Company not found via function")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()