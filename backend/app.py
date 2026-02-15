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
            
            return jsonify({
                'message': 'Signup successful',
                'success': True,
                'token': token,
                'user': result['user']
            }), 201
        else:
            return jsonify(result), 400
            
    except Exception as e:
        print(f"Signup error: {str(e)}")  # Log to console
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
            
            return jsonify({
                'message': 'Login successful',
                'success': True,
                'token': token,
                'user': result['user']
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
            # Generate JWT token only if profile is complete
            if not result.get('profile_incomplete'):
                token = jwt.encode({
                    'user_id': result['user']['id'],
                    'exp': datetime.utcnow() + timedelta(days=7)
                }, app.config['JWT_SECRET_KEY'], algorithm="HS256")
                
                return jsonify({
                    'message': 'Google authentication successful',
                    'success': True,
                    'token': token,
                    'user': result['user']
                }), 200
            else:
                # Profile incomplete - no token yet
                return jsonify(result), 200
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
    """Complete Google OAuth user profile"""
    try:
        data = request.get_json()
        user_id = data.get('userId')
        business_name = data.get('businessName')
        password = data.get('password')
        confirm_password = data.get('confirmPassword')
        profile_image = data.get('profileImage')  # Optional
        
        if not all([user_id, business_name, password, confirm_password]):
            return jsonify({'message': 'All fields are required', 'success': False}), 400
        
        if password != confirm_password:
            return jsonify({'message': 'Passwords do not match', 'success': False}), 400
        
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
        result = db_client.update_user_profile(current_user['id'], data)
        return jsonify(result), 200 if result['success'] else 400
    except Exception as e:
        return jsonify({'message': f'Update error: {str(e)}', 'success': False}), 500

# ==================== TEAM ROUTES ====================

@app.route('/api/teams', methods=['GET'])
@token_required
def get_teams(current_user):
    """Get all teams for current user"""
    try:
        teams = db_client.get_user_teams(current_user['id'])
        return jsonify({
            'success': True,
            'teams': teams
        }), 200
    except Exception as e:
        return jsonify({'message': f'Error fetching teams: {str(e)}', 'success': False}), 500

@app.route('/api/teams', methods=['POST'])
@token_required
def create_team(current_user):
    """Create a new team"""
    try:
        data = request.get_json()
        team_name = data.get('team_name')
        
        if not team_name:
            return jsonify({'message': 'Team name is required', 'success': False}), 400
        
        result = db_client.create_team(team_name, current_user['id'])
        return jsonify(result), 201 if result['success'] else 400
    except Exception as e:
        return jsonify({'message': f'Create team error: {str(e)}', 'success': False}), 500

@app.route('/api/teams/<int:team_id>/members', methods=['POST'])
@token_required
def add_team_member(current_user, team_id):
    """Add member to team"""
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        role = data.get('role', 'member')
        
        result = db_client.add_team_member(team_id, user_id, role)
        return jsonify(result), 200 if result['success'] else 400
    except Exception as e:
        return jsonify({'message': f'Add member error: {str(e)}', 'success': False}), 500

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

