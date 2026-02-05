# DataXpert - AI-Assisted Business Data Analytics & Management System

![DataXpert Logo](documentation/images/logo.png)

## 📋 Overview

**DataXpert** is a comprehensive web application that helps businesses analyze their data through AI-powered insights. Built with Flask (Python) backend and vanilla JavaScript frontend, it provides:

- 🔐 **Secure Authentication** - Email/password and Google OAuth
- 📊 **Interactive Dashboard** - Real-time business metrics and visualizations
- 🤖 **AI Analysis** - Chat-based interface for intelligent data insights
- 👥 **Team Management** - Collaborate with team members
- 🔔 **Anomaly Detection** - Automatic detection of unusual patterns
- 📈 **Data Visualization** - Beautiful charts powered by Chart.js

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

4. **Setup Database (Supabase)**
   
   Create the following tables in your Supabase project:

   **users**
   ```sql
   CREATE TABLE users (
       id SERIAL PRIMARY KEY,
       name VARCHAR(255) NOT NULL,
       email VARCHAR(255) UNIQUE NOT NULL,
       password VARCHAR(255),
       google_id VARCHAR(255) UNIQUE,
       role VARCHAR(50) DEFAULT 'user',
       created_at TIMESTAMP DEFAULT NOW()
   );
   ```

   **teams**
   ```sql
   CREATE TABLE teams (
       id SERIAL PRIMARY KEY,
       team_name VARCHAR(255) NOT NULL,
       owner_id INTEGER REFERENCES users(id),
       created_at TIMESTAMP DEFAULT NOW()
   );
   ```

   **team_members**
   ```sql
   CREATE TABLE team_members (
       id SERIAL PRIMARY KEY,
       team_id INTEGER REFERENCES teams(id),
       user_id INTEGER REFERENCES users(id),
       role VARCHAR(50) DEFAULT 'member',
       joined_at TIMESTAMP DEFAULT NOW()
   );
   ```

   **business_data**
   ```sql
   CREATE TABLE business_data (
       id SERIAL PRIMARY KEY,
       user_id INTEGER REFERENCES users(id),
       record_date DATE NOT NULL,
       sales FLOAT NOT NULL,
       expenses FLOAT NOT NULL,
       profit FLOAT NOT NULL,
       category VARCHAR(100)
   );
   ```

   **chats**
   ```sql
   CREATE TABLE chats (
       id SERIAL PRIMARY KEY,
       user_id INTEGER REFERENCES users(id),
       message TEXT NOT NULL,
       response TEXT,
       timestamp TIMESTAMP DEFAULT NOW()
   );
   ```

   **analysis_results**
   ```sql
   CREATE TABLE analysis_results (
       id SERIAL PRIMARY KEY,
       chat_id INTEGER REFERENCES chats(id),
       summary TEXT NOT NULL,
       anomaly_score FLOAT DEFAULT 0.0,
       insight_level VARCHAR(50) NOT NULL,
       created_at TIMESTAMP DEFAULT NOW()
   );
   ```

5. **Run Backend Server**
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

## 📁 Project Structure

```
DataXpert/
├── backend/              # Flask backend
│   ├── ai/              # AI analysis modules
│   ├── auth/            # Authentication
│   ├── database/        # Database operations
│   └── app.py           # Main application
├── frontend/            # Frontend application
│   ├── css/            # Stylesheets
│   ├── js/             # JavaScript files
│   └── *.html          # HTML pages
└── documentation/       # Documentation website
    └── *.html          # Documentation pages
```

## 🛠️ Technology Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+), Chart.js
- **Backend**: Python, Flask, Flask-CORS
- **Database**: Supabase (PostgreSQL)
- **Data Analysis**: Pandas, NumPy, SciPy
- **Authentication**: JWT, Google OAuth 2.0
- **AI/ML**: Rule-based NLP, Anomaly Detection

## 📖 Features

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

Complete documentation is available in the `documentation` folder:

- **Overview**: System architecture and features
- **Setup Guide**: Detailed installation instructions
- **Workflow**: Application workflow and data flow
- **ER Diagram**: Database schema and relationships
- **Folder Structure**: Project organization
- **API Documentation**: API endpoints and usage

Access documentation by opening `documentation/index.html` in a browser.

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

- [ ] Email notifications
- [ ] CSV/Excel data import
- [ ] PDF report generation
- [ ] Advanced forecasting models
- [ ] Mobile responsive improvements
- [ ] Real-time collaboration
- [ ] More chart types
- [ ] Multi-language support

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 👥 About SGP Group

SGP Group is a technology company focused on developing innovative solutions for business intelligence and data analytics. Our mission is to make data-driven decision-making accessible to businesses of all sizes.

## 📞 Contact

- **Support**: support@dataxpert.com
- **Business**: business@sgpgroup.com
- **Development**: dev@dataxpert.com

## 🙏 Acknowledgments

- Chart.js for beautiful visualizations
- Supabase for backend services
- Font Awesome for icons
- Google for OAuth services

---

**Made with ❤️ by SGP Group**

*Last Updated: February 2024*
