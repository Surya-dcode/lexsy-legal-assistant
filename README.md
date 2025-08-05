# backend/test_app.py
"""
Quick test script to verify Lexsy Legal Assistant functionality
Run this after setup to ensure everything works
"""

import os
import sys
import requests
import json
from pathlib import Path

API_BASE = "http://localhost:8000"

def test_api_connection():
    """Test basic API connection"""
    try:
        response = requests.get(f"{API_BASE}/health")
        if response.status_code == 200:
            print("✅ API connection successful")
            return True
        else:
            print(f"❌ API connection failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ API connection error: {e}")
        return False

def test_mock_gmail_ingestion():
    """Test mock Gmail thread ingestion"""
    try:
        response = requests.post(f"{API_BASE}/api/gmail/1/ingest-mock")
        result = response.json()
        
        if result.get("success"):
            print(f"✅ Mock Gmail ingestion successful: {result['emails_processed']} emails")
            return True
        else:
            print(f"❌ Mock Gmail ingestion failed: {result.get('error')}")
            return False
    except Exception as e:
        print(f"❌ Mock Gmail ingestion error: {e}")
        return False

def test_ai_query():
    """Test AI question answering"""
    try:
        data = {"question": "What are the vesting terms for John Smith?"}
        response = requests.post(f"{API_BASE}/api/chat/1/ask", data=data)
        result = response.json()
        
        if result.get("success") and result.get("answer"):
            print("✅ AI query successful")
            print(f"   Answer: {result['answer'][:100]}...")
            print(f"   Sources: {len(result.get('sources', []))} found")
            return True
        else:
            print(f"❌ AI query failed: {result.get('error')}")
            return False
    except Exception as e:
        print(f"❌ AI query error: {e}")
        return False

def test_sample_emails():
    """Test sample email ingestion"""
    try:
        response = requests.post(f"{API_BASE}/api/emails/1/ingest-sample-emails")
        result = response.json()
        
        if result.get("success"):
            print(f"✅ Sample emails successful: {result['emails_processed']} emails")
            return True
        else:
            print(f"❌ Sample emails failed: {result.get('error')}")
            return False
    except Exception as e:
        print(f"❌ Sample emails error: {e}")
        return False

def check_environment():
    """Check environment setup"""
    print("🔍 Checking environment setup...")
    
    # Check .env file
    env_path = Path(".env")
    if env_path.exists():
        print("✅ .env file found")
        
        # Check for OpenAI API key
        with open(env_path) as f:
            content = f.read()
            if "OPENAI_API_KEY" in content and "your_openai_api_key_here" not in content:
                print("✅ OpenAI API key configured")
            else:
                print("⚠️  OpenAI API key not configured properly")
    else:
        print("❌ .env file not found")
    
    # Check credentials.json
    creds_path = Path("credentials.json")
    if creds_path.exists():
        print("✅ Google credentials.json found")
    else:
        print("⚠️  Google credentials.json not found (Gmail OAuth will use mock data)")
    
    # Check ChromaDB directory
    chroma_path = Path("chroma")
    if chroma_path.exists():
        print("✅ ChromaDB directory exists")
    else:
        print("📁 ChromaDB directory will be created automatically")

def main():
    """Run all tests"""
    print("🧪 Testing Lexsy Legal Assistant...")
    print("=" * 50)
    
    # Check environment first
    check_environment()
    print()
    
    # Test API connection
    if not test_api_connection():
        print("❌ Cannot connect to API. Make sure the server is running:")
        print("   uvicorn main:app --reload --port 8000")
        return
    
    print()
    
    # Run functional tests
    tests = [
        ("Mock Gmail Ingestion", test_mock_gmail_ingestion),
        ("Sample Emails", test_sample_emails), 
        ("AI Query", test_ai_query),
    ]
    
    passed = 0
    total = len(tests)
    
    for test_name, test_func in tests:
        print(f"Running {test_name}...")
        if test_func():
            passed += 1
        print()
    
    # Summary
    print("=" * 50)
    print(f"📊 Test Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! Your Lexsy Legal Assistant is ready for demo.")
        print()
        print("🎬 Demo suggestions:")
        print("   1. Open frontend at http://localhost:3000")
        print("   2. Load Mock Gmail Thread")
        print("   3. Upload a sample legal document")
        print("   4. Ask questions like:")
        print("      - 'What are John Smith's vesting terms?'")
        print("      - 'How many shares are being granted?'")
        print("      - 'What documents need board approval?'")
    else:
        print("⚠️  Some tests failed. Check the errors above and fix them before demo.")

if __name__ == "__main__":
    main()