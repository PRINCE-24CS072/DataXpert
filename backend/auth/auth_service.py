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
    
    def signup(self, username, email, password, business_name=None):
        """Register new user"""
        try:
            print(f"[AUTH] Signup attempt for email: {email}")
            
            # Check if user already exists
            existing_user = self.db_client.get_user_by_email(email)
            if existing_user:
                print(f"[AUTH] User already exists: {email}")
                return {'message': 'User with this email already exists', 'success': False}
            
            print(f"[AUTH] No existing user found, creating new user")
            
            # Hash password
            hashed_password = self.hash_password(password)
            
            # Generate default profile image
            default_profile_image = f'https://ui-avatars.com/api/?name={username.replace(" ", "+")}&background=6366f1&color=fff&size=200'
            
            # Create user
            user_data = {
                'name': username,
                'email': email,
                'password': hashed_password,
                'business_name': business_name,
                'profile_image': default_profile_image,
                'role': 'user',
                'profile_completed': True
            }
            
            print(f"[AUTH] Calling database to create user")
            result = self.db_client.create_user(user_data)
            print(f"[AUTH] Database result: {result}")
            
            if result.get('success'):
                user = result['data']
                # Remove password from response
                user.pop('password', None)
                print(f"[AUTH] User created successfully: {user.get('id')}")
                return {
                    'message': 'User created successfully',
                    'success': True,
                    'user': user
                }
            else:
                error_msg = result.get('error', 'Unknown database error')
                print(f"[AUTH ERROR] Failed to create user: {error_msg}")
                return {
                    'message': f'Failed to create user: {error_msg}',
                    'success': False
                }
                
        except Exception as e:
            print(f"[AUTH ERROR] Exception in signup: {str(e)}")
            return {'message': f'Signup error: {str(e)}', 'success': False}
    
    def login(self, email, password):
        """Authenticate user"""
        try:
            # Get user by email
            user = self.db_client.get_user_by_email(email)
            
            if not user:
                return {
                    'message': 'No account found with this email. Please sign up first',
                    'success': False,
                    'need_signup': True
                }
            
            # Check if profile is completed
            if not user.get('profile_completed', False):
                return {
                    'message': 'Please complete your profile first',
                    'success': False,
                    'profile_incomplete': True,
                    'user_id': user['id']
                }
            
            # Verify password
            if not user.get('password') or not self.verify_password(user['password'], password):
                return {'message': 'Invalid password. Please try again', 'success': False}
            
            # Remove password from response
            user.pop('password', None)
            
            return {
                'message': 'Login successful',
                'success': True,
                'user': user
            }
            
        except Exception as e:
            return {'message': f'Login error: {str(e)}', 'success': False}
    
    def google_auth(self, token, action='login'):
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
            profile_image = idinfo.get('picture', None)
            
            # Check if user exists
            user = self.db_client.get_user_by_email(email)
            
            if not user:
                # Check if user exists by google_id
                user = self.db_client.get_user_by_google_id(google_id)
            
            if user:
                # User exists
                if action == 'signup' and user.get('google_id'):
                    # Trying to signup but user with Google already exists
                    return {
                        'message': 'An account with this email already exists. Please login instead',
                        'success': False,
                        'already_exists': True
                    }
                
                # Login action OR linking Google to manual account
                # Update google_id and profile_image if not set
                updates = {}
                if not user.get('google_id'):
                    updates['google_id'] = google_id
                    user['google_id'] = google_id
                
                # Update profile image with Google profile pic if user doesn't have one
                if profile_image and (not user.get('profile_image') or 'ui-avatars.com' in user.get('profile_image', '')):
                    updates['profile_image'] = profile_image
                    user['profile_image'] = profile_image
                
                if updates:
                    self.db_client.update_user_fields(user['id'], updates)
                
                # Remove password from response
                user.pop('password', None)
                
                # Check if profile is completed
                if not user.get('profile_completed', False):
                    return {
                        'message': 'Please complete your profile',
                        'success': True,
                        'profile_incomplete': True,
                        'user': user
                    }
                
                return {
                    'message': 'Google authentication successful',
                    'success': True,
                    'user': user
                }
            else:
                # User doesn't exist
                if action == 'login':
                    # Trying to login but user doesn't exist
                    return {
                        'message': 'No account found with this email. Please sign up first',
                        'success': False,
                        'need_signup': True
                    }
                
                # Signup action - create new user with incomplete profile
                user_data = {
                    'name': name,
                    'email': email,
                    'google_id': google_id,
                    'profile_image': profile_image if profile_image else f'https://ui-avatars.com/api/?name={name.replace(" ", "+")}&background=6366f1&color=fff&size=200',
                    'role': 'user',
                    'profile_completed': False
                }
                
                result = self.db_client.create_user(user_data)
                
                if not result.get('success'):
                    error_msg = result.get('error', 'Unknown database error')
                    return {
                        'message': f'Failed to create user: {error_msg}',
                        'success': False
                    }
                
                user = result['data']
                # Remove password from response
                user.pop('password', None)
                
                return {
                    'message': 'Please complete your profile',
                    'success': True,
                    'profile_incomplete': True,
                    'user': user
                }
            
        except ValueError as e:
            return {'message': f'Invalid Google token: {str(e)}', 'success': False}
        except Exception as e:
            return {'message': f'Google auth error: {str(e)}', 'success': False}
    
    def complete_profile(self, user_id, business_name, password, profile_image=None):
        """Complete user profile after Google OAuth"""
        try:
            # Get user
            user = self.db_client.get_user_by_id(user_id)
            
            if not user:
                return {'message': 'User not found', 'success': False}
            
            # Hash password
            hashed_password = self.hash_password(password)
            
            # Prepare update data
            update_data = {
                'business_name': business_name,
                'password': hashed_password,
                'profile_completed': True
            }
            
            # Update profile image if provided, otherwise keep existing
            if profile_image:
                update_data['profile_image'] = profile_image
            
            # Update user profile
            updated_user = self.db_client.update_user_profile(
                user_id,
                update_data
            )
            
            if updated_user:
                # Remove password from response
                updated_user.pop('password', None)
                return {
                    'message': 'Profile completed successfully',
                    'success': True,
                    'user': updated_user
                }
            else:
                return {'message': 'Failed to update profile', 'success': False}
                
        except Exception as e:
            return {'message': f'Profile completion error: {str(e)}', 'success': False}
