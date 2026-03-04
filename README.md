<div align="center">
  <img src="assets/logo.png" alt="DataXpert Logo" width="300"/>
  <h1>DataXpert</h1>
  <p><strong>AI-Powered Business Analytics Platform</strong></p>
  <p>
    <a href="#features">Features</a> •
    <a href="#quick-start">Quick Start</a> •
    <a href="#documentation">Documentation</a> •
    <a href="#technology">Technology</a>
  </p>
</div>

---

## 📋 Overview

**DataXpert** is a modern business analytics platform that leverages AI to provide actionable insights from your business data. Built with Python Flask backend and vanilla JavaScript frontend, it offers real-time analytics, AI-powered chat interface, and comprehensive data visualization.

### ✨ What Makes DataXpert Special

- 🔐 **Dual Authentication** - Email/password OR  Google OAuth for seamless access
- 📊 **Live Dashboard** - Real-time metrics with interactive Chart.js visualizations
- 🤖 **AI Chat Analysis** - Natural language queries for immediate insights
- 📈 **Anomaly Detection** - Automated Z-score based outlier identification
- 📁 **Excel Import** - Bulk upload and process business data from spreadsheets
- 👤 **Smart Profiles** - Google profile integration with completion prompts
- ⚡ **Optimized Performance** - Streamlined codebase for faster response times

## 🚀 Quick Start

### Prerequisites

- Python 3.8 or higher
- pip (Python package manager)
- Supabase account (for database)
- Google OAuth credentials (optional, for Google login)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/DataXpert.git
   cd DataXpert
   ```

2. **Setup Backend**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

3. **Configure Environment Variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` file with your credentials:
   ```
   SECRET_KEY=your-secret-key
   JWT_SECRET_KEY=your-jwt-secret
   SUPABASE_URL=your-supabase-url
   SUPABASE_KEY=your-supabase-key
   GOOGLE_CLIENT_ID=your-google-client-id
   ```

4. **Setup Database**
   
   Run the simplified SQL setup script in your Supabase SQL Editor:
   ```bash
   # Copy contents of database.sql and run in Supabase
   ```
   
   Or manually create tables (see `database.sql` for complete schema):
   - `users` - User accounts with Google OAuth support
   - `business_data` - Business metrics and records
   - `chats` - AI chat conversation history
   - `analysis_results` - AI-generated insights
   - `teams` - Team management

5. **Run Backend**
   ```bash
   python app.py
   ```
   Server will start at `http://localhost:5000`

6. **Setup Frontend**
   ```bash
   cd ../frontend
   ```
   
   Edit `js/config.js` and update:
   ```javascript
   const GOOGLE_CLIENT_ID = 'your-google-client-id';
   ```

7. **Run Frontend**
   
   Option 1: Use Python HTTP Server
   ```bash
   python -m http.server 5500
   ```
   
   Option 2: Use VS Code Live Server extension
   
   Option 3: Open `index.html` directly in browser

8. **Access Application**
   - Frontend: `http://localhost:5500` or `http://127.0.0.1:5500`
   - Backend API: `http://localhost:5000`
   - Documentation: Open `documentation/index.html`

## 📁 Project Structure (Optimized)

```
DataXpert/
├── assets/              # Static assets (logo, images)
├── backend/             # Flask backend application
│   ├── ai/             # AI analysis modules
│   │   ├── analysis_engine.py    # Business data analysis
│   │   ├── anomaly_detector.py   # Anomaly detection
│   │   ├── data_processor.py     # Data processing
│   │   └── nlp_processor.py      # NLP for chat
│   ├── auth/           # Authentication service
│   │   └── auth_service.py       # Auth logic
│   ├── database/       # Database operations
│   │   └── supabase_client.py    # DB client
│   ├── app.py          # Main Flask application
│   ├── requirements.txt # Python dependencies
│   ├── .env            # Environment variables (create from .env.example)
│   └── .env.example    # Environment template
├── frontend/           # Frontend application
│   ├── css/           # Stylesheets
│   │   ├── style.css
│   │   ├── dashboard.css
│   │   └── analysis.css
│   ├── js/            # JavaScript modules
│   │   ├── auth.js            # Authentication
│   │   ├── config.js          # Configuration
│   │   ├── dashboard.js       # Dashboard logic
│   │   ├── analysis.js        # AI analysis
│   │   ├── theme.js           # Theme switcher
│   │   ├── header-profile.js  # Profile component
│   │   ├── data-import-export.js  # Data operations
│   │   └── comparison-analysis.js # Comparisons
│   ├── docs/          # Documentation
│   │   ├── api/       # API documentation
│   │   │   └── swagger.yaml
│   │   ├── css/       # Docs styles
│   │   ├── js/        # Docs scripts
│   │   ├── index.html # Docs home
│   │   ├── setup.html # Setup guide
│   │   ├── workflow.html # Workflow diagram
│   │   ├── er-diagram.html # DB schema
│   │   └── folder-structure.html # Structure
│   ├── index.html     # Login/signup page
│   ├── dashboard.html # Main dashboard
│   ├── analysis.html  # AI analysis
│   ├── history.html   # Activity history
│   └── profile.html   # User profile
├── database.sql       # Complete database setup
└── README.md          # This file
```

## 🔧 Optimization Changes

This version includes the following optimizations:

### Backend Optimization
- ✅ **Removed duplicate code** - Fixed duplicate `complete_profile` function
- ✅ **Streamlined environment** - Consolidated multiple .env files into one
- ✅ **Unified requirements** - Merged development and production dependencies
- ✅ **Removed cache files** - Cleaned all `__pycache__` directories

### Frontend Optimization
- ✅ **Consolidated config** - Removed redundant config.development.js and config.production.js
- ✅ **Merged documentation** - Combined docs folder into frontend/docs
- ✅ **Organized structure** - Better file organization and naming

### Database Optimization
- ✅ **Single SQL file** - Combined database_setup.sql and migration files into database.sql
- ✅ **Simplified schema** - Removed unnecessary tables for core functionality

### Documentation Cleanup
- ✅ **Removed unnecessary files** - Cleaned up CHANGELOG, TESTING_GUIDE, OPTIMIZATION_REPORT, etc.
- ✅ **Kept only README** - Single source of truth for project documentation
- ✅ **Integrated docs** - All documentation now in frontend/docs folder

## 🛠️ Technology Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+), Chart.js
- **Backend**: Python, Flask, Flask-CORS
- **Database**: Supabase (PostgreSQL)
- **Data Analysis**: Pandas, NumPy, SciPy
- **Authentication**: JWT, Google OAuth 2.0
- **AI/ML**: Rule-based NLP, Anomaly Detection

## � Features

### Authentication
- Email/password registration and login
- Google OAuth integration
- JWT token-based authentication
- Password hashing with SHA-256

### Dashboard
- Real-time business statistics
- Interactive charts (sales, profit, expenses)
- Recent activity feed
- Team management

### AI Analysis
- Natural language chat interface
- Intent recognition and entity extraction
- Automated insights generation
- Anomaly detection
- Trend analysis
- Sales, profit, and expense analysis

### Team Collaboration
- Create and manage teams
- Add team members
- Share business insights

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the `backend` directory:

```env
# Flask Configuration
SECRET_KEY=your-super-secret-key-change-this
JWT_SECRET_KEY=your-jwt-secret-key
FLASK_ENV=development
FLASK_DEBUG=True

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-supabase-anon-key

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret
```

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized JavaScript origins:
   - `http://localhost:5500`
   - `http://127.0.0.1:5500`
6. Add authorized redirect URIs:
   - `http://localhost:5500`
7. Copy Client ID to `.env` and `frontend/js/config.js`

### Supabase Setup

1. Create account at [Supabase](https://supabase.com)
2. Create new project
3. Copy project URL and anon key to `.env`
4. Run the SQL commands from step 4 of installation
5. Enable Row Level Security (RLS) policies as needed

## 📚 Documentation

Complete documentation is available in the `frontend/docs` folder:

- **Overview**: System architecture and features
- **Setup Guide**: Detailed installation instructions
- **Workflow**: Application workflow and data flow
- **ER Diagram**: Database schema and relationships
- **Folder Structure**: Project organization
- **API Documentation**: Swagger YAML in docs/api/

Access documentation by opening `frontend/docs/index.html` in a browser.

## 🎯 Usage

### Adding Business Data

1. Login to your account
2. Navigate to Dashboard
3. Click "Add Data" button
4. Fill in:
   - Date
   - Category (Retail, Services, etc.)
   - Sales amount
   - Expenses amount
   - Profit (auto-calculated)
5. Submit to save

### Using AI Analysis

1. Navigate to "AI Analysis" page
2. Type your question or click a suggestion:
   - "What are my total sales?"
   - "Show me profit analysis"
   - "Analyze my expenses"
   - "What are the trends?"
   - "Detect any anomalies"
3. AI will analyze your data and provide insights
4. View charts and recommendations
5. Ask follow-up questions

### Creating Teams

1. Go to Dashboard
2. Scroll to "Your Teams" section
3. Click "Create Team"
4. Enter team name
5. Invite members (email functionality to be added)

## 🔐 Security

- Passwords are hashed using SHA-256 with salt
- JWT tokens for session management
- CORS configured for security
- Environment variables for sensitive data
- SQL injection protection via Supabase
- Input validation on all forms

## 🚧 Future Enhancements

- [x] CSV/Excel data import (Already implemented!)
- [ ] Email notifications
- [ ] PDF report generation
- [ ] Advanced forecasting models
- [ ] Mobile responsive improvements
- [ ] Real-time collaboration
- [ ] More chart types
- [ ] Multi-language support
- [ ] Data export functionality
- [ ] Advanced team permissions

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## � About SGP Group

24CS067 - ManavPatel
24CS072 - Prince Patel
24CS076 - Srujal Patel

## 📞 Contact Us

Have a question, an idea, or just want to say hi?  
I’m always open to connecting!

- 📧 **Email:** 24CS067@charusat.edu.in &  24CS072@charusat.edu.in & 24CS076@charusat.edu.in 
- 🐙 **GitHub:** [DataXpert](https://github.com/PRINCE-24CS072/DataXpert)

Feel free to reach out — I’d love to hear from you! 😊

--
**Made with ❤️ by DataXpert**

*Last Updated: March 4, 2026 (Optimized & Streamlined)*
