# DataXpert - AI Coding Agent Instructions

## Architecture Overview

DataXpert is a business analytics platform with Flask backend + vanilla JavaScript frontend + Supabase (PostgreSQL).

**Data flow:** Frontend → REST API (`/api/*`) → Flask routes → Service classes → Supabase

```
backend/
├── app.py              # Main Flask app, all API routes
├── auth/auth_service.py    # Authentication logic (email + Google OAuth)
├── database/supabase_client.py  # All database operations
└── ai/
    ├── analysis_engine.py   # Business data analysis
    ├── nlp_processor.py     # Intent/entity extraction from chat
    └── anomaly_detector.py  # Z-score anomaly detection

frontend/
├── js/config.js        # API endpoints, storage keys, auth headers
├── js/auth.js          # Google OAuth + email auth
├── js/dashboard.js     # Dashboard data loading + Chart.js
└── js/analysis.js      # AI chat interface
```

## Critical Patterns

### API Response Format
All API responses use consistent structure:
```python
return jsonify({'success': True, 'data': result}), 200
return jsonify({'success': False, 'message': 'Error details'}), 400
```

### Protected Routes
Use `@token_required` decorator which passes `current_user` as first argument:
```python
@app.route('/api/resource', methods=['GET'])
@token_required
def get_resource(current_user):
    # current_user is dict with id, name, email, etc.
```

### Frontend Auth Pattern
Auth token/user stored in localStorage with `dataxpert_` prefix. Always use helpers from [config.js](frontend/js/config.js):
```javascript
const headers = getAuthHeaders();  // Returns { Authorization: 'Bearer ...' }
const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
```

### Database Operations  
All DB access through `SupabaseClient` class methods—never access `supabase` client directly in routes:
```python
db_client.get_user_by_id(user_id)
db_client.add_business_data(data)
```

## Developer Workflow

### Run Backend
```bash
cd backend
pip install -r requirements.txt
python app.py  # Runs on port 5000
```

### Run Frontend
```bash
cd frontend
python -m http.server 5500  # Serves at localhost:5500
```

### Environment Variables (.env)
```
SECRET_KEY, JWT_SECRET_KEY, SUPABASE_URL, SUPABASE_KEY, GOOGLE_CLIENT_ID
CORS_ORIGINS=http://localhost:5500,http://127.0.0.1:5500
```

### Database Setup
Run [database_setup.sql](database_setup.sql) in Supabase SQL Editor. Tables: `users`, `teams`, `team_members`, `business_data`, `chats`, `analysis_results`

## AI Analysis Pipeline

When user sends chat message in analysis page:
1. `nlp_processor.extract_intent()` → determines analysis type (sales/profit/trend/forecast)
2. `nlp_processor.extract_entities()` → extracts dates, amounts, time periods
3. `analysis_engine.analyze()` → performs analysis based on intent
4. `anomaly_detector.detect_anomalies()` → Z-score detection on business data
5. Response saved to `chats` table with analysis in `analysis_results`

## Key Integration Points

- **Supabase**: Direct PostgreSQL via `supabase-py`. Connection in [supabase_client.py](backend/database/supabase_client.py)
- **Google OAuth**: Token verification via `google-auth`. Client ID configured in both backend `.env` and [config.js](frontend/js/config.js)
- **CORS**: Origins set via `CORS_ORIGINS` env var (comma-separated)
- **JWT**: 7-day expiry, HS256 algorithm, user_id in payload

## Adding New Features

**New API endpoint:** Add route in [app.py](backend/app.py) with `@token_required` if auth needed  
**New DB operation:** Add method to `SupabaseClient` class in [supabase_client.py](backend/database/supabase_client.py)  
**New analysis type:** Add to `analysis_types` dict in [analysis_engine.py](backend/ai/analysis_engine.py)  
**New frontend page:** Create HTML + CSS + JS files, import config.js and auth.js
