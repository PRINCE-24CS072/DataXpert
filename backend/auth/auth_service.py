import os
import hashlib
import uuid
from google.oauth2 import id_token
from google.auth.transport import requests
from database.supabase_client import SupabaseClient

class AuthService:
    def __init__(self):
        self.db_client = SupabaseClient()
        self.google_client_id = os.getenv('GOOGLE_CLIENT_ID')
    
    def hash_password(self, password):
        """Hash password using SHA-256"""
        salt = uuid.uuid4().hex
        hashed = hashlib.sha256((password + salt).encode()).hexdigest()
        return f"{salt}${hashed}"
    
    def verify_password(self, stored_password, provided_password):
        """Verify password against stored hash"""
        try:
            salt, hashed = stored_password.split('$')
            new_hash = hashlib.sha256((provided_password + salt).encode()).hexdigest()
            return new_hash == hashed
        except:
            return False
    
    def signup(self, username, email, password):
        """Register new user"""
        try:
            # Check if user already exists
            existing_user = self.db_client.get_user_by_email(email)
            if existing_user:
                return {'message': 'User with this email already exists', 'success': False}
            
            # Hash password
            hashed_password = self.hash_password(password)
            
            # Create user
            user_data = {
                'name': username,
                'email': email,
                'password': hashed_password,
                'role': 'user'
            }
            
            user = self.db_client.create_user(user_data)
            
            if user:
                # Remove password from response
                user.pop('password', None)
                return {
                    'message': 'User created successfully',
                    'success': True,
                    'user': user
                }
            else:
                return {'message': 'Failed to create user', 'success': False}
                
        except Exception as e:
            return {'message': f'Signup error: {str(e)}', 'success': False}
    
    def login(self, email, password):
        """Authenticate user"""
        try:
            # Get user by email
            user = self.db_client.get_user_by_email(email)
            
            if not user:
                return {'message': 'Invalid email or password', 'success': False}
            
            # Verify password
            if not self.verify_password(user['password'], password):
                return {'message': 'Invalid email or password', 'success': False}
            
            # Remove password from response
            user.pop('password', None)
            
            return {
                'message': 'Login successful',
                'success': True,
                'user': user
            }
            
        except Exception as e:
            return {'message': f'Login error: {str(e)}', 'success': False}
    
    def google_auth(self, token):
        """Authenticate user with Google OAuth"""
        try:
            # Verify Google token
            idinfo = id_token.verify_oauth2_token(
                token, 
                requests.Request(), 
                self.google_client_id
            )
            
            if idinfo['iss'] not in ['accounts.google.com', 'https://accounts.google.com']:
                return {'message': 'Invalid token issuer', 'success': False}
            
            # Extract user info
            google_id = idinfo['sub']
            email = idinfo['email']
            name = idinfo.get('name', email.split('@')[0])
            
            # Check if user exists
            user = self.db_client.get_user_by_email(email)
            
            if not user:
                # Check if user exists by google_id
                user = self.db_client.get_user_by_google_id(google_id)
            
            if user:
                # Update google_id if not set
                if not user.get('google_id'):
                    self.db_client.update_user_google_id(user['id'], google_id)
                    user['google_id'] = google_id
            else:
                # Create new user
                user_data = {
                    'name': name,
                    'email': email,
                    'google_id': google_id,
                    'role': 'user'
                }
                
                user = self.db_client.create_user(user_data)
                
                if not user:
                    return {'message': 'Failed to create user', 'success': False}
            
            # Remove password from response
            user.pop('password', None)
            
            return {
                'message': 'Google authentication successful',
                'success': True,
                'user': user
            }
            
        except ValueError as e:
            return {'message': f'Invalid Google token: {str(e)}', 'success': False}
        except Exception as e:
            return {'message': f'Google auth error: {str(e)}', 'success': False}
