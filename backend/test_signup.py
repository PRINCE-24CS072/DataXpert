"""
Test script to debug signup functionality
"""
from auth.auth_service import AuthService
import json

auth_service = AuthService()

# Test signup
print("Testing signup...")
result = auth_service.signup('testuser', 'test@example.com', 'password123')
print("Result:", json.dumps(result, indent=2))

if result.get('success') and result.get('user'):
    user = result['user']
    print("\nUser object keys:", list(user.keys()))
    print("User ID:", user.get('id'))
    print("User email:", user.get('email'))
