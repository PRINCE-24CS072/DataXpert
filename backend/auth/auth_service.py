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
        """Register new user - Fast simplified flow"""
        try:
            # Check if user already exists
            existing_user = self.db_client.get_user_by_email(email)
            if existing_user:
                return {
                    'message': 'Already account exist on this email id',
                    'success': False,
                    'already_exists': True
                }
            
            # Hash password
            hashed_password = self.hash_password(password)
            
            # Generate default profile image
            default_profile_image = f'https://ui-avatars.com/api/?name={username.replace(" ", "+")}&background=6366f1&color=fff&size=200'
            
            # Create user - immediately active
            user_data = {
                'name': username,
                'email': email,
                'password': hashed_password,
                'business_name': business_name,
                'profile_image': default_profile_image,
                'role': 'user',
                'profile_completed': True  # Always true - users can update profile later
            }
            
            result = self.db_client.create_user(user_data)
            
            if result.get('success'):
                user = result['data']
                # Remove password from response
                user.pop('password', None)
                return {
                    'message': 'Account created successfully',
                    'success': True,
                    'user': user
                }
            else:
                error_msg = result.get('error', 'Unknown database error')
                return {
                    'message': f'Failed to create user: {error_msg}',
                    'success': False
                }
                
        except Exception as e:
            return {'message': f'Signup error: {str(e)}', 'success': False}
    
    def login(self, email, password):
        """Authenticate user - Fast simplified flow"""
        try:
            # Get user by email
            user = self.db_client.get_user_by_email(email)
            
            if not user:
                return {
                    'message': 'Signup 1st account not available',
                    'success': False,
                    'need_signup': True
                }
            
            # Verify password
            if not user.get('password') or not self.verify_password(user['password'], password):
                return {
                    'message': 'Invalid password',
                    'success': False
                }
            
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
        """
        Authenticate user with Google OAuth - Fast simplified flow
        
        Flow:
        - SIGNUP + New User → Create account with Google data → Success
        - SIGNUP + Existing User → Error 'already account exist'
        - LOGIN + Existing User → Login successfully
        - LOGIN + New User → Error 'signup 1st'
        """
        try:
            # Verify Google token
            idinfo = id_token.verify_oauth2_token(
                token, 
                requests.Request(), 
                self.google_client_id
            )
            
            if idinfo['iss'] not in ['accounts.google.com', 'https://accounts.google.com']:
                return {'message': 'Invalid token issuer', 'success': False}
            
            # Extract user info from Google
            google_id = idinfo['sub']
            email = idinfo['email']
            name = idinfo.get('name', email.split('@')[0])
            profile_image = idinfo.get('picture', None)
            
            # Check if user exists by email
            user = self.db_client.get_user_by_email(email)
            
            # CASE 1: USER EXISTS
            if user:
                if action == 'signup':
                    # Existing user trying to signup → Error
                    return {
                        'message': 'Already account exist on this email id',
                        'success': False,
                        'already_exists': True
                    }
                
                # Existing user login → Success
                # Update Google ID and profile image if not set
                updates = {}
                if not user.get('google_id'):
                    updates['google_id'] = google_id
                
                # Update profile image with Google profile pic if available
                if profile_image and (not user.get('profile_image') or 'ui-avatars.com' in user.get('profile_image', '')):
                    updates['profile_image'] = profile_image
                
                # Apply updates if any
                if updates:
                    updated_user = self.db_client.update_user_fields(user['id'], updates)
                    if updated_user:
                        user = updated_user
                
                # Remove password from response
                user.pop('password', None)
                
                return {
                    'message': 'Login successful',
                    'success': True,
                    'user': user
                }
            
            # CASE 2: USER DOES NOT EXIST
            else:
                if action == 'login':
                    # New user trying to login → Error
                    return {
                        'message': 'Signup 1st account not available',
                        'success': False,
                        'need_signup': True
                    }
                
                # New user signup → Create account
                # Generate a secure password from Google ID
                generated_password = self.hash_password(google_id)
                
                user_data = {
                    'name': name,
                    'email': email,
                    'google_id': google_id,
                    'password': generated_password,
                    'profile_image': profile_image if profile_image else f'https://ui-avatars.com/api/?name={name.replace(" ", "+")}&background=6366f1&color=fff&size=200',
                    'role': 'user',
                    'profile_completed': True,
                    'business_name': None  # Can be updated in profile
                }
                
                result = self.db_client.create_user(user_data)
                
                if not result.get('success'):
                    error_msg = result.get('error', 'Unknown database error')
                    return {
                        'message': f'Failed to create account: {error_msg}',
                        'success': False
                    }
                
                user = result['data']
                # Remove password from response
                user.pop('password', None)
                
                return {
                    'message': 'Account created successfully',
                    'success': True,
                    'user': user
                }
            
        except ValueError as e:
            return {'message': f'Invalid Google token: {str(e)}', 'success': False}
        except Exception as e:
            return {'message': f'Google auth error: {str(e)}', 'success': False}
    
    def complete_profile(self, user_id, business_name, password=None, profile_image=None):
        """Complete user profile after Google OAuth - password is optional for Google users"""
        try:
            # Get user
            user = self.db_client.get_user_by_id(user_id)
            
            if not user:
                return {'message': 'User not found', 'success': False}
            
            # Prepare update data
            update_data = {
                'business_name': business_name,
                'profile_completed': True
            }
            
            # Hash password only if provided
            if password:
                hashed_password = self.hash_password(password)
                update_data['password'] = hashed_password
            
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
    
    def change_password(self, user_id, current_password, new_password):
        """Change user password"""
        try:
            # Get user
            user = self.db_client.get_user_by_id(user_id)
            
            if not user:
                return {'message': 'User not found', 'success': False}
            
            # Check if user has a password (might be Google-only account)
            if not user.get('password'):
                return {
                    'message': 'This account uses Google authentication. Please set a password first',
                    'success': False
                }
            
            # Verify current password
            if not self.verify_password(user['password'], current_password):
                return {
                    'message': 'Current password is incorrect',
                    'success': False
                }
            
            # Hash new password
            hashed_password = self.hash_password(new_password)
            
            # Update password
            result = self.db_client.update_user_fields(user_id, {'password': hashed_password})
            
            if result.get('success'):
                return {
                    'message': 'Password changed successfully',
                    'success': True
                }
            else:
                return {
                    'message': 'Failed to change password',
                    'success': False
                }
                
        except Exception as e:
            return {'message': f'Change password error: {str(e)}', 'success': False}
