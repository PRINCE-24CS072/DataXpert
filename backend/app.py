from flask import Flask, request, jsonify, session
from flask_cors import CORS
from functools import wraps
import os
from dotenv import load_dotenv
from datetime import datetime, timedelta
import jwt

# Import modules
from auth.auth_service import AuthService
from database.supabase_client import SupabaseClient
from ai.analysis_engine import AnalysisEngine
from ai.nlp_processor import NLPProcessor
from ai.anomaly_detector import AnomalyDetector
from ai.data_processor import DataProcessor

load_dotenv()

app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'your-secret-key-here')
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'jwt-secret-key-here')

# Enable CORS - Read from environment variable
cors_origins = os.getenv('CORS_ORIGINS', 'http://localhost:5500,http://127.0.0.1:5500').split(',')
CORS(app, 
     supports_credentials=True, 
     origins=cors_origins,
     allow_headers=['Content-Type', 'Authorization'],
     methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'])

# Initialize services
auth_service = AuthService()
db_client = SupabaseClient()
analysis_engine = AnalysisEngine()
nlp_processor = NLPProcessor()
anomaly_detector = AnomalyDetector()
data_processor = DataProcessor()

# JWT token decorator
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        
        if not token:
            return jsonify({'message': 'Token is missing!', 'success': False}), 401
        
        try:
            if token.startswith('Bearer '):
                token = token.split(' ')[1]
            
            data = jwt.decode(token, app.config['JWT_SECRET_KEY'], algorithms=["HS256"])
            current_user = db_client.get_user_by_id(data['user_id'])
            
            if not current_user:
                return jsonify({'message': 'Invalid token!', 'success': False}), 401
                
        except jwt.ExpiredSignatureError:
            return jsonify({'message': 'Token has expired!', 'success': False}), 401
        except jwt.InvalidTokenError:
            return jsonify({'message': 'Invalid token!', 'success': False}), 401
        except Exception as e:
            return jsonify({'message': f'Token verification failed: {str(e)}', 'success': False}), 401
        
        return f(current_user, *args, **kwargs)
    
    return decorated

# ==================== AUTH ROUTES ====================

@app.route('/api/auth/signup', methods=['POST'])
def signup():
    """Handle user signup with email/password"""
    try:
        data = request.get_json()
        username = data.get('username')
        email = data.get('email')
        password = data.get('password')
        confirm_password = data.get('confirmPassword')
        business_name = data.get('businessName')
        
        # Validate all required fields
        if not username or not username.strip():
            return jsonify({'message': 'Username is required', 'success': False}), 400
            
        if not email or not email.strip():
            return jsonify({'message': 'Email is required', 'success': False}), 400
            
        if not password or not password.strip():
            return jsonify({'message': 'Password is required', 'success': False}), 400
            
        if not confirm_password or not confirm_password.strip():
            return jsonify({'message': 'Please confirm your password', 'success': False}), 400
        
        if password != confirm_password:
            return jsonify({'message': 'Passwords do not match', 'success': False}), 400
        
        if len(password) < 6:
            return jsonify({'message': 'Password must be at least 6 characters long', 'success': False}), 400
        
        result = auth_service.signup(username, email, password, business_name)
        
        if result['success']:
            # Generate JWT token
            token = jwt.encode({
                'user_id': result['user']['id'],
                'exp': datetime.utcnow() + timedelta(days=7)
            }, app.config['JWT_SECRET_KEY'], algorithm="HS256")
            
            # Get initial dashboard stats to reduce subsequent API calls
            stats = {
                'total_sales': 0,
                'total_profit': 0,
                'total_expenses': 0,
                'data_count': 0,
                'recent_data': []
            }
            
            return jsonify({
                'message': 'Signup successful',
                'success': True,
                'token': token,
                'user': result['user'],
                'stats': stats  # Include stats to avoid extra API call
            }), 201
        else:
            return jsonify(result), 400
            
    except Exception as e:
        return jsonify({'message': f'Signup error: {str(e)}', 'success': False}), 500

@app.route('/api/auth/login', methods=['POST'])
def login():
    """Handle user login with email/password"""
    try:
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')
        
        if not all([email, password]):
            return jsonify({'message': 'Email and password are required', 'success': False}), 400
        
        result = auth_service.login(email, password)
        
        if result['success']:
            # Generate JWT token
            token = jwt.encode({
                'user_id': result['user']['id'],
                'exp': datetime.utcnow() + timedelta(days=7)
            }, app.config['JWT_SECRET_KEY'], algorithm="HS256")
            
            # Get initial dashboard stats to reduce subsequent API calls
            try:
                business_data = db_client.get_user_business_data(result['user']['id'])
                total_sales = sum(item.get('sales', 0) for item in business_data)
                total_profit = sum(item.get('profit', 0) for item in business_data)
                total_expenses = sum(item.get('expenses', 0) for item in business_data)
                
                stats = {
                    'total_sales': total_sales,
                    'total_profit': total_profit,
                    'total_expenses': total_expenses,
                    'data_count': len(business_data),
                    'recent_data': business_data[:5] if business_data else []
                }
            except:
                stats = {
                    'total_sales': 0,
                    'total_profit': 0,
                    'total_expenses': 0,
                    'data_count': 0,
                    'recent_data': []
                }
            
            return jsonify({
                'message': 'Login successful',
                'success': True,
                'token': token,
                'user': result['user'],
                'stats': stats  # Include stats to avoid extra API call
            }), 200
        else:
            return jsonify(result), 401
            
    except Exception as e:
        return jsonify({'message': f'Login error: {str(e)}', 'success': False}), 500

@app.route('/api/auth/google', methods=['POST'])
def google_auth():
    """Handle Google OAuth authentication"""
    try:
        data = request.get_json()
        google_token = data.get('token')
        action = data.get('action', 'login')  # 'login' or 'signup'
        
        if not google_token:
            return jsonify({'message': 'Google token is required', 'success': False}), 400
        
        result = auth_service.google_auth(google_token, action)
        
        if result['success']:
            # Generate JWT token - user can login immediately even without business name
            token = jwt.encode({
                'user_id': result['user']['id'],
                'exp': datetime.utcnow() + timedelta(days=7)
            }, app.config['JWT_SECRET_KEY'], algorithm="HS256")
            
            # Get initial dashboard stats
            try:
                business_data = db_client.get_user_business_data(result['user']['id'])
                total_sales = sum(item.get('sales', 0) for item in business_data)
                total_profit = sum(item.get('profit', 0) for item in business_data)
                total_expenses = sum(item.get('expenses', 0) for item in business_data)
                
                stats = {
                    'total_sales': total_sales,
                    'total_profit': total_profit,
                    'total_expenses': total_expenses,
                    'data_count': len(business_data),
                    'recent_data': business_data[:5] if business_data else []
                }
            except:
                stats = {
                    'total_sales': 0,
                    'total_profit': 0,
                    'total_expenses': 0,
                    'data_count': 0,
                    'recent_data': []
                }
            
            return jsonify({
                'message': 'Google authentication successful',
                'success': True,
                'token': token,
                'user': result['user'],
                'stats': stats,
                'needs_profile_completion': result.get('needs_profile_completion', False)
            }), 200
        else:
            return jsonify(result), 401
            
    except Exception as e:
        return jsonify({'message': f'Google auth error: {str(e)}', 'success': False}), 500

@app.route('/api/auth/verify', methods=['GET'])
@token_required
def verify_token(current_user):
    """Verify JWT token"""
    return jsonify({
        'success': True,
        'user': current_user
    }), 200

@app.route('/api/auth/complete-profile', methods=['POST'])
def complete_profile():
    """Complete Google OAuth user profile - password is optional"""
    try:
        data = request.get_json()
        user_id = data.get('userId')
        business_name = data.get('businessName')
        password = data.get('password')  # Optional
        confirm_password = data.get('confirmPassword')  # Optional
        profile_image = data.get('profileImage')  # Optional
        
        if not user_id or not business_name:
            return jsonify({'message': 'User ID and Business Name are required', 'success': False}), 400
        
        # Only validate password if provided
        if password or confirm_password:
            if password != confirm_password:
                return jsonify({'message': 'Passwords do not match', 'success': False}), 400
            
            if len(password) < 6:
                return jsonify({'message': 'Password must be at least 6 characters', 'success': False}), 400
        
        result = auth_service.complete_profile(user_id, business_name, password, profile_image)
        
        if result['success']:
            # Generate JWT token
            token = jwt.encode({
                'user_id': result['user']['id'],
                'exp': datetime.utcnow() + timedelta(days=7)
            }, app.config['JWT_SECRET_KEY'], algorithm="HS256")
            
            # Get initial dashboard stats
            try:
                business_data = db_client.get_user_business_data(result['user']['id'])
                total_sales = sum(item.get('sales', 0) for item in business_data)
                total_profit = sum(item.get('profit', 0) for item in business_data)
                total_expenses = sum(item.get('expenses', 0) for item in business_data)
                
                stats = {
                    'total_sales': total_sales,
                    'total_profit': total_profit,
                    'total_expenses': total_expenses,
                    'data_count': len(business_data),
                    'recent_data': business_data[:5] if business_data else []
                }
            except:
                stats = {
                    'total_sales': 0,
                    'total_profit': 0,
                    'total_expenses': 0,
                    'data_count': 0,
                    'recent_data': []
                }
            
            return jsonify({
                'message': 'Profile completed successfully',
                'success': True,
                'token': token,
                'user': result['user'],
                'stats': stats
            }), 200
        else:
            return jsonify(result), 400
            
    except Exception as e:
        return jsonify({'message': f'Profile completion error: {str(e)}', 'success': False}), 500
        
        if len(password) < 6:
            return jsonify({'message': 'Password must be at least 6 characters long', 'success': False}), 400
        
        result = auth_service.complete_profile(user_id, business_name, password, profile_image)
        
        if result['success']:
            # Generate JWT token
            token = jwt.encode({
                'user_id': result['user']['id'],
                'exp': datetime.utcnow() + timedelta(days=7)
            }, app.config['JWT_SECRET_KEY'], algorithm="HS256")
            
            return jsonify({
                'message': 'Profile completed successfully',
                'success': True,
                'token': token,
                'user': result['user']
            }), 200
        else:
            return jsonify(result), 400
            
    except Exception as e:
        return jsonify({'message': f'Profile completion error: {str(e)}', 'success': False}), 500

# ==================== USER ROUTES ====================

@app.route('/api/user/profile', methods=['GET'])
@token_required
def get_profile(current_user):
    """Get user profile"""
    return jsonify({
        'success': True,
        'user': current_user
    }), 200

@app.route('/api/user/profile', methods=['PUT'])
@token_required
def update_profile(current_user):
    """Update user profile"""
    try:
        data = request.get_json()
        user = db_client.update_user_profile(current_user['id'], data)
        
        if user:
            # Remove password from response
            user.pop('password', None)
            return jsonify({
                'success': True,
                'user': user,
                'message': 'Profile updated successfully'
            }), 200
        else:
            return jsonify({
                'success': False,
                'message': 'Failed to update profile'
            }), 400
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Update error: {str(e)}'
        }), 500

@app.route('/api/users/update-profile', methods=['POST'])
@token_required
def update_user_profile(current_user):
    """Update user profile (name and business name)"""
    try:
        data = request.get_json()
        name = data.get('name')
        business_name = data.get('business_name')
        
        update_data = {}
        if name:
            update_data['name'] = name
        if business_name:
            update_data['business_name'] = business_name
        
        if not update_data:
            return jsonify({'message': 'No data to update', 'success': False}), 400
        
        result = db_client.update_user_fields(current_user['id'], update_data)
        
        if result['success']:
            # Get updated user data
            updated_user = db_client.get_user_by_id(current_user['id'])
            return jsonify({
                'success': True,
                'message': 'Profile updated successfully',
                'user': updated_user
            }), 200
        else:
            return jsonify(result), 400
            
    except Exception as e:
        return jsonify({'message': f'Update profile error: {str(e)}', 'success': False}), 500

@app.route('/api/users/change-password', methods=['POST'])
@token_required
def change_password(current_user):
    """Change user password"""
    try:
        data = request.get_json()
        current_password = data.get('current_password')
        new_password = data.get('new_password')
        
        if not current_password or not new_password:
            return jsonify({'message': 'Current password and new password are required', 'success': False}), 400
        
        if len(new_password) < 6:
            return jsonify({'message': 'New password must be at least 6 characters long', 'success': False}), 400
        
        result = auth_service.change_password(current_user['id'], current_password, new_password)
        return jsonify(result), 200 if result['success'] else 400
        
    except Exception as e:
        return jsonify({'message': f'Change password error: {str(e)}', 'success': False}), 500

@app.route('/api/users/upload-profile-image', methods=['POST'])
@token_required
def upload_profile_image(current_user):
    """Upload user profile image"""
    try:
        if 'profile_image' not in request.files:
            return jsonify({'message': 'No file uploaded', 'success': False}), 400
        
        file = request.files['profile_image']
        
        if file.filename == '':
            return jsonify({'message': 'No file selected', 'success': False}), 400
        
        # Validate file type
        allowed_extensions = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
        file_ext = file.filename.rsplit('.', 1)[1].lower() if '.' in file.filename else ''
        
        if file_ext not in allowed_extensions:
            return jsonify({'message': 'Invalid file type. Allowed: png, jpg, jpeg, gif, webp', 'success': False}), 400
        
        # For now, convert image to base64 data URL and store in database
        # In production, you'd upload to cloud storage (S3, Supabase Storage, etc.)
        import base64
        file_data = file.read()
        file_size = len(file_data)
        
        # Check file size (max 5MB)
        if file_size > 5 * 1024 * 1024:
            return jsonify({'message': 'File size must be less than 5MB', 'success': False}), 400
        
        base64_image = base64.b64encode(file_data).decode('utf-8')
        image_url = f"data:image/{file_ext};base64,{base64_image}"
        
        # Update user profile with new image
        result = db_client.update_user_fields(current_user['id'], {'profile_image': image_url})
        
        if result['success']:
            return jsonify({
                'success': True,
                'message': 'Profile image uploaded successfully',
                'profile_image': image_url
            }), 200
        else:
            return jsonify(result), 400
            
    except Exception as e:
        return jsonify({'message': f'Upload error: {str(e)}', 'success': False}), 500

# ==================== BUSINESS DATA ROUTES ====================

@app.route('/api/business/data', methods=['GET'])
@token_required
def get_business_data(current_user):
    """Get all business data for user"""
    try:
        data = db_client.get_user_business_data(current_user['id'])
        return jsonify({
            'success': True,
            'data': data
        }), 200
    except Exception as e:
        return jsonify({'message': f'Error fetching data: {str(e)}', 'success': False}), 500

@app.route('/api/business/data', methods=['POST'])
@token_required
def add_business_data(current_user):
    """Add new business data"""
    try:
        data = request.get_json()
        data['user_id'] = current_user['id']
        
        result = db_client.add_business_data(data)
        return jsonify(result), 201 if result['success'] else 400
    except Exception as e:
        return jsonify({'message': f'Add data error: {str(e)}', 'success': False}), 500

@app.route('/api/business/summary', methods=['GET'])
@token_required
def get_business_summary(current_user):
    """Get business summary statistics"""
    try:
        summary = db_client.get_business_summary(current_user['id'])
        return jsonify({
            'success': True,
            'summary': summary
        }), 200
    except Exception as e:
        return jsonify({'message': f'Error fetching summary: {str(e)}', 'success': False}), 500

@app.route('/api/business-data/upload', methods=['POST'])
@token_required
def upload_business_data(current_user):
    """Upload business data from Excel or CSV file"""
    try:
        if 'file' not in request.files:
            return jsonify({'message': 'No file uploaded', 'success': False}), 400
        
        file = request.files['file']
        
        if file.filename == '':
            return jsonify({'message': 'No file selected', 'success': False}), 400
        
        # Validate file extension
        allowed_extensions = {'xlsx', 'xls', 'csv'}
        file_ext = file.filename.rsplit('.', 1)[1].lower() if '.' in file.filename else ''
        
        if file_ext not in allowed_extensions:
            return jsonify({'message': 'Invalid file type. Allowed: xlsx, xls, csv', 'success': False}), 400
        
        # Parse file based on type
        import pandas as pd
        from io import BytesIO
        
        try:
            if file_ext == 'csv':
                df = pd.read_csv(BytesIO(file.read()))
            else:
                df = pd.read_excel(BytesIO(file.read()))
        except Exception as e:
            return jsonify({'message': f'Error reading file: {str(e)}', 'success': False}), 400
        
        # Validate required columns (adjust based on your business_data table structure)
        # Expected columns: date, category, amount, description
        required_columns = ['date', 'category', 'amount']
        missing_columns = [col for col in required_columns if col not in df.columns]
        
        if missing_columns:
            return jsonify({
                'message': f'Missing required columns: {", ".join(missing_columns)}',
                'success': False,
                'expected_columns': required_columns
            }), 400
        
        # Process and insert data
        records_added = 0
        errors = []
        
        for index, row in df.iterrows():
            try:
                data = {
                    'user_id': current_user['id'],
                    'date': str(row['date']),
                    'category': str(row['category']),
                    'amount': float(row['amount']),
                    'description': str(row.get('description', ''))
                }
                
                result = db_client.add_business_data(data)
                if result['success']:
                    records_added += 1
                else:
                    errors.append(f"Row {index + 1}: {result.get('message', 'Unknown error')}")
                    
            except Exception as e:
                errors.append(f"Row {index + 1}: {str(e)}")
        
        return jsonify({
            'success': True,
            'message': f'Successfully uploaded {records_added} records',
            'records_added': records_added,
            'total_rows': len(df),
            'errors': errors if errors else None
        }), 200
        
    except Exception as e:
        return jsonify({'message': f'Upload error: {str(e)}', 'success': False}), 500

@app.route('/api/business-data/upload-smart', methods=['POST'])
@token_required
def upload_business_data_smart(current_user):
    """Upload business data with AI preprocessing, cleaning, and outlier removal"""
    try:
        if 'file' not in request.files:
            return jsonify({'message': 'No file uploaded', 'success': False}), 400
        
        file = request.files['file']
        
        if file.filename == '':
            return jsonify({'message': 'No file selected', 'success': False}), 400
        
        # Validate file extension
        allowed_extensions = {'xlsx', 'xls', 'csv'}
        file_ext = file.filename.rsplit('.', 1)[1].lower() if '.' in file.filename else ''
        
        if file_ext not in allowed_extensions:
            return jsonify({'message': 'Invalid file type. Allowed: xlsx, xls, csv', 'success': False}), 400
        
        # Get processing options from form data
        options = {
            'remove_outliers': request.form.get('remove_outliers', 'true').lower() == 'true',
            'fill_missing': request.form.get('fill_missing', 'true').lower() == 'true',
            'outlier_method': request.form.get('outlier_method', 'iqr'),  # iqr, zscore, percentile
            'fill_method': request.form.get('fill_method', 'smart')  # smart, mean, median, zero
        }
        
        # Parse file
        import pandas as pd
        from io import BytesIO
        
        try:
            if file_ext == 'csv':
                df = pd.read_csv(BytesIO(file.read()))
            else:
                df = pd.read_excel(BytesIO(file.read()))
        except Exception as e:
            return jsonify({'message': f'Error reading file: {str(e)}', 'success': False}), 400
        
        # Process data with AI
        process_result = data_processor.process_uploaded_data(df, options)
        
        if not process_result['success']:
            return jsonify({
                'message': f'Data processing failed: {process_result.get("error", "Unknown error")}',
                'success': False,
                'report': process_result['report']
            }), 400
        
        processed_df = process_result['data']
        report = process_result['report']
        
        # Insert processed data into database
        records_added = 0
        errors = []
        
        for index, row in processed_df.iterrows():
            try:
                data = {
                    'user_id': current_user['id'],
                    'record_date': str(row.get('record_date', '')),
                    'category': str(row.get('category', 'General')),
                    'sales': float(row.get('sales', 0)),
                    'expenses': float(row.get('expenses', 0)),
                    'profit': float(row.get('profit', 0))
                }
                
                result = db_client.add_business_data(data)
                if result['success']:
                    records_added += 1
                else:
                    errors.append(f"Row {index + 1}: {result.get('message', 'Unknown error')}")
                    
            except Exception as e:
                errors.append(f"Row {index + 1}: {str(e)}")
        
        return jsonify({
            'success': True,
            'message': f'Successfully processed and uploaded {records_added} records',
            'records_added': records_added,
            'original_rows': report['original_rows'],
            'final_rows': report['final_rows'],
            'outliers_removed': report.get('outliers_removed', 0),
            'missing_filled': report.get('missing_filled', 0),
            'processing_steps': report.get('processing_steps', []),
            'warnings': report.get('warnings', []),
            'errors': errors if errors else None
        }), 200
        
    except Exception as e:
        # Log failed upload
        try:
            db_client.save_upload_history(current_user['id'], {
                'filename': file.filename if 'file' in dir() else 'unknown',
                'status': 'failed',
                'error_message': str(e)
            })
        except:
            pass
        return jsonify({'message': f'Upload error: {str(e)}', 'success': False}), 500

@app.route('/api/business-data/analyze-file', methods=['POST'])
@token_required
def analyze_uploaded_file(current_user):
    """Analyze a file before uploading to suggest processing options"""
    try:
        if 'file' not in request.files:
            return jsonify({'message': 'No file uploaded', 'success': False}), 400
        
        file = request.files['file']
        
        if file.filename == '':
            return jsonify({'message': 'No file selected', 'success': False}), 400
        
        # Validate file extension
        allowed_extensions = {'xlsx', 'xls', 'csv'}
        file_ext = file.filename.rsplit('.', 1)[1].lower() if '.' in file.filename else ''
        
        if file_ext not in allowed_extensions:
            return jsonify({'message': 'Invalid file type', 'success': False}), 400
        
        # Parse file
        import pandas as pd
        from io import BytesIO
        
        try:
            if file_ext == 'csv':
                df = pd.read_csv(BytesIO(file.read()))
            else:
                df = pd.read_excel(BytesIO(file.read()))
        except Exception as e:
            return jsonify({'message': f'Error reading file: {str(e)}', 'success': False}), 400
        
        # Analyze data quality
        analysis = data_processor.analyze_data_quality(df)
        
        # Get graph suggestions
        graph_suggestions = data_processor.suggest_graph_types(df)
        
        return jsonify({
            'success': True,
            'analysis': analysis,
            'graph_suggestions': graph_suggestions,
            'preview': df.head(5).to_dict(orient='records')
        }), 200
        
    except Exception as e:
        return jsonify({'message': f'Analysis error: {str(e)}', 'success': False}), 500

@app.route('/api/business-data/clear', methods=['DELETE'])
@token_required
def clear_business_data(current_user):
    """Clear all business data for the current user with optional backup"""
    try:
        data = request.get_json() or {}
        create_backup = data.get('create_backup', False)
        backup_days = data.get('backup_days', 30)
        
        # Create backup if requested
        backup_info = None
        if create_backup:
            backup_result = db_client.create_data_backup(
                current_user['id'], 
                backup_type='pre_clear',
                expires_days=backup_days
            )
            if backup_result['success']:
                backup_info = {
                    'backup_id': backup_result['backup'].get('id'),
                    'record_count': backup_result['record_count'],
                    'expires_in_days': backup_days
                }
        
        # Clear the data
        result = db_client.clear_user_business_data(current_user['id'])
        
        if result['success']:
            # Log the activity
            db_client.log_activity(
                current_user['id'],
                'clear',
                f"Cleared {result.get('deleted_count', 0)} business data records",
                entity_type='business_data',
                metadata={
                    'deleted_count': result.get('deleted_count', 0),
                    'backup_created': create_backup,
                    'backup_id': backup_info['backup_id'] if backup_info else None
                }
            )
            
            return jsonify({
                'success': True,
                'message': f'Successfully cleared {result.get("deleted_count", 0)} records',
                'deleted_count': result.get('deleted_count', 0),
                'backup': backup_info
            }), 200
        else:
            return jsonify(result), 400
            
    except Exception as e:
        return jsonify({'message': f'Clear data error: {str(e)}', 'success': False}), 500

# ==================== HISTORY & ACTIVITY ROUTES ====================

@app.route('/api/history/activity', methods=['GET'])
@token_required
def get_activity_history(current_user):
    """Get user's activity log"""
    try:
        limit = request.args.get('limit', 50, type=int)
        action_type = request.args.get('action_type', None)
        
        activities = db_client.get_activity_log(current_user['id'], limit, action_type)
        
        return jsonify({
            'success': True,
            'activities': activities
        }), 200
    except Exception as e:
        return jsonify({'message': f'Error fetching activity: {str(e)}', 'success': False}), 500

@app.route('/api/history/uploads', methods=['GET'])
@token_required
def get_upload_history(current_user):
    """Get user's upload history"""
    try:
        limit = request.args.get('limit', 20, type=int)
        history = db_client.get_upload_history(current_user['id'], limit)
        
        return jsonify({
            'success': True,
            'uploads': history
        }), 200
    except Exception as e:
        return jsonify({'message': f'Error fetching upload history: {str(e)}', 'success': False}), 500

@app.route('/api/history/analysis', methods=['GET'])
@token_required
def get_analysis_history(current_user):
    """Get user's analysis history"""
    try:
        limit = request.args.get('limit', 20, type=int)
        history = db_client.get_analysis_history(current_user['id'], limit)
        
        return jsonify({
            'success': True,
            'analyses': history
        }), 200
    except Exception as e:
        return jsonify({'message': f'Error fetching analysis history: {str(e)}', 'success': False}), 500

@app.route('/api/history/backups', methods=['GET'])
@token_required
def get_backups(current_user):
    """Get user's data backups"""
    try:
        backups = db_client.get_data_backups(current_user['id'])
        
        return jsonify({
            'success': True,
            'backups': backups
        }), 200
    except Exception as e:
        return jsonify({'message': f'Error fetching backups: {str(e)}', 'success': False}), 500

@app.route('/api/history/backups/<int:backup_id>/restore', methods=['POST'])
@token_required
def restore_backup(current_user, backup_id):
    """Restore data from a backup"""
    try:
        result = db_client.restore_data_backup(current_user['id'], backup_id)
        
        if result['success']:
            # Log the activity
            db_client.log_activity(
                current_user['id'],
                'restore',
                f"Restored {result.get('restored_count', 0)} records from backup",
                entity_type='business_data',
                entity_id=backup_id,
                metadata={'restored_count': result.get('restored_count', 0)}
            )
            
            return jsonify({
                'success': True,
                'message': f'Successfully restored {result.get("restored_count", 0)} records',
                'restored_count': result.get('restored_count', 0)
            }), 200
        else:
            return jsonify(result), 400
            
    except Exception as e:
        return jsonify({'message': f'Restore error: {str(e)}', 'success': False}), 500

@app.route('/api/business-data/generate-chart', methods=['POST'])
@token_required
def generate_custom_chart(current_user):
    """Generate a custom chart based on user requirements"""
    try:
        data = request.get_json()
        chart_type = data.get('chart_type', 'line')
        x_field = data.get('x_field', 'record_date')
        y_fields = data.get('y_fields', ['sales'])
        group_by = data.get('group_by', None)
        date_range = data.get('date_range', None)
        
        # Get user's business data
        business_data = db_client.get_user_business_data(current_user['id'])
        
        if not business_data:
            return jsonify({
                'success': False,
                'message': 'No business data available'
            }), 400
        
        import pandas as pd
        df = pd.DataFrame(business_data)
        
        # Apply date range filter if specified
        if date_range and 'start' in date_range and 'end' in date_range:
            df['record_date'] = pd.to_datetime(df['record_date'])
            df = df[(df['record_date'] >= date_range['start']) & (df['record_date'] <= date_range['end'])]
        
        # Generate chart data based on type
        chart_data = analysis_engine.generate_custom_chart(
            df, chart_type, x_field, y_fields, group_by
        )
        
        return jsonify({
            'success': True,
            'chart_data': chart_data,
            'chart_type': chart_type
        }), 200
        
    except Exception as e:
        return jsonify({'message': f'Chart generation error: {str(e)}', 'success': False}), 500

# ==================== ACTIVITY HISTORY ROUTES ====================

@app.route('/api/activity/history', methods=['GET'])
@token_required
def get_activity_data_history(current_user):
    """Get activity history for user"""
    try:
        filter_type = request.args.get('filter', 'all')
        
        # Get user's business data activities
        business_data = db_client.get_user_business_data(current_user['id'])
        
        activities = []
        
        # Transform business data into activity items
        for item in business_data[:20]:  # Limit to 20 items
            activity = {
                'type': 'uploads',
                'title': 'Data Entry Added',
                'description': f'{item.get("category", "General")} - Sales: ${item.get("sales", 0):.2f}, Profit: ${item.get("profit", 0):.2f}',
                'created_at': item.get('record_date') or item.get('created_at', '')
            }
            
            if filter_type == 'all' or filter_type == 'uploads':
                activities.append(activity)
        
        # Sort by date (newest first)
        activities.sort(key=lambda x: x['created_at'], reverse=True)
        
        return jsonify({
            'success': True,
            'activities': activities
        }), 200
        
    except Exception as e:
        return jsonify({'message': f'Error fetching history: {str(e)}', 'success': False}), 500

# ==================== AI ANALYSIS ROUTES ====================

@app.route('/api/ai/chat', methods=['POST'])
@token_required
def ai_chat(current_user):
    """Handle AI chat analysis"""
    try:
        data = request.get_json()
        message = data.get('message')
        
        if not message:
            return jsonify({'message': 'Message is required', 'success': False}), 400
        
        # Save user message to chat
        chat = db_client.save_chat_message(current_user['id'], message, 'user')
        
        # Process message with NLP
        intent = nlp_processor.extract_intent(message)
        entities = nlp_processor.extract_entities(message)
        
        # Get user's business data
        business_data = db_client.get_user_business_data(current_user['id'])
        
        # Generate analysis based on intent
        analysis = analysis_engine.analyze(intent, entities, business_data)
        
        # Check for anomalies
        anomalies = anomaly_detector.detect_anomalies(business_data)
        
        # Generate response
        response = analysis_engine.generate_response(analysis, anomalies)
        
        # Save AI response to chat
        db_client.save_chat_message(current_user['id'], response['text'], 'assistant')
        
        # Save analysis results
        if analysis.get('insights'):
            db_client.save_analysis_results(chat['id'], analysis)
        
        return jsonify({
            'success': True,
            'response': response,
            'analysis': analysis,
            'chat_id': chat['id']
        }), 200
        
    except Exception as e:
        return jsonify({'message': f'AI chat error: {str(e)}', 'success': False}), 500

@app.route('/api/ai/chats', methods=['GET'])
@token_required
def get_chats(current_user):
    """Get chat history"""
    try:
        chats = db_client.get_user_chats(current_user['id'])
        return jsonify({
            'success': True,
            'chats': chats
        }), 200
    except Exception as e:
        return jsonify({'message': f'Error fetching chats: {str(e)}', 'success': False}), 500

@app.route('/api/ai/analysis/<int:chat_id>', methods=['GET'])
@token_required
def get_analysis_results(current_user, chat_id):
    """Get analysis results for a chat"""
    try:
        results = db_client.get_analysis_results(chat_id)
        return jsonify({
            'success': True,
            'results': results
        }), 200
    except Exception as e:
        return jsonify({'message': f'Error fetching results: {str(e)}', 'success': False}), 500

# ==================== DASHBOARD ROUTES ====================

@app.route('/api/dashboard/stats', methods=['GET'])
@token_required
def get_dashboard_stats(current_user):
    """Get dashboard statistics"""
    try:
        stats = {
            'total_sales': db_client.get_total_sales(current_user['id']),
            'total_profit': db_client.get_total_profit(current_user['id']),
            'total_expenses': db_client.get_total_expenses(current_user['id']),
            'data_count': db_client.get_data_count(current_user['id']),
            'recent_data': db_client.get_recent_business_data(current_user['id'], limit=10)
        }
        
        return jsonify({
            'success': True,
            'stats': stats
        }), 200
    except Exception as e:
        return jsonify({'message': f'Error fetching stats: {str(e)}', 'success': False}), 500

@app.route('/api/dashboard/charts', methods=['GET'])
@token_required
def get_chart_data(current_user):
    """Get data for dashboard charts"""
    try:
        chart_data = analysis_engine.prepare_chart_data(
            db_client.get_user_business_data(current_user['id'])
        )
        
        return jsonify({
            'success': True,
            'charts': chart_data
        }), 200
    except Exception as e:
        return jsonify({'message': f'Error fetching chart data: {str(e)}', 'success': False}), 500

# ==================== HEALTH CHECK ====================

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint to verify API and database connection"""
    try:
        # Test database connection
        test_response = db_client.supabase.table('users').select('id').limit(1).execute()
        
        return jsonify({
            'status': 'healthy',
            'service': 'DataXpert API',
            'database': 'connected',
            'timestamp': datetime.utcnow().isoformat()
        }), 200
    except Exception as e:
        return jsonify({
            'status': 'unhealthy',
            'service': 'DataXpert API',
            'database': 'disconnected',
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }), 500

@app.route('/', methods=['GET'])
def index():
    """Root endpoint"""
    return jsonify({
        'message': 'Welcome to DataXpert API',
        'version': '1.0.0',
        'endpoints': {
            'auth': '/api/auth/*',
            'user': '/api/user/*',
            'teams': '/api/teams/*',
            'business': '/api/business/*',
            'ai': '/api/ai/*',
            'dashboard': '/api/dashboard/*'
        }
    }), 200

import os

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)

