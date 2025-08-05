#!/bin/bash
# setup.sh - Quick setup script for Lexsy Legal Assistant

set -e  # Exit on any error

echo "🏗️  Setting up Lexsy Legal Assistant..."

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is required but not installed"
    exit 1
fi

# Check if pip is installed
if ! command -v pip3 &> /dev/null; then
    echo "❌ Pip 3 is required but not installed"
    exit 1
fi

# Create backend virtual environment
echo "📦 Creating Python virtual environment..."
cd backend
python3 -m venv venv
source venv/bin/activate

# Install Python dependencies
echo "📚 Installing Python dependencies..."
pip install -r requirements.txt

# Check for environment file
if [ ! -f ".env" ]; then
    echo "⚠️  Creating .env template..."
    cat > .env << EOF
OPENAI_API_KEY=your_openai_api_key_here
CHROMA_PERSIST_DIR=./chroma
DATABASE_URL=sqlite:///./lexsy.db
EOF
    echo "📝 Please edit backend/.env with your OpenAI API key"
fi

# Check for Google credentials
if [ ! -f "credentials.json" ]; then
    echo "⚠️  Google credentials.json not found"
    echo "📝 Please download credentials.json from Google Cloud Console and place in backend/"
    echo "   Guide: https://developers.google.com/gmail/api/quickstart/python"
fi

# Initialize database
echo "🗄️  Initializing database..."
python init_db.py

echo "✅ Backend setup complete!"

# Check if Node.js is available for frontend serving
cd ../frontend
if command -v node &> /dev/null; then
    echo "🌐 Node.js detected, you can use: npx http-server -p 3000 -c-1"
else
    echo "🌐 Use Python to serve frontend: python -m http.server 3000"
fi

echo ""
echo "🚀 Setup Complete! To start the application:"
echo ""
echo "Terminal 1 (Backend):"
echo "  cd backend"
echo "  source venv/bin/activate"
echo "  uvicorn main:app --reload --port 8000"
echo ""
echo "Terminal 2 (Frontend):"
echo "  cd frontend" 
echo "  python -m http.server 3000"
echo ""
echo "Then visit: http://localhost:3000"
echo ""
echo "📋 Next steps:"
echo "  1. Add your OpenAI API key to backend/.env"
echo "  2. Add credentials.json from Google Cloud Console"
echo "  3. Start both servers and visit the app"
echo ""