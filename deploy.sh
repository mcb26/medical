#!/bin/bash

# Medical App Deployment Script
echo "🚀 Starting Medical App Deployment..."

# Backend Setup
echo "📦 Setting up Django Backend..."
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Database Setup
echo "🗄️ Setting up Database..."
python manage.py migrate
python manage.py collectstatic --noinput

# Frontend Setup
echo "⚛️ Building React Frontend..."
cd frontend
npm install
npm run build
cd ..

# Create Production Settings
echo "⚙️ Creating Production Configuration..."
cat > medical/settings_production.py << EOF
import os
from .settings import *

DEBUG = False
ALLOWED_HOSTS = ['your-domain.com', 'www.your-domain.com', 'localhost']

# Database Configuration
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

# Static Files
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
STATICFILES_DIRS = [
    os.path.join(BASE_DIR, 'static'),
    os.path.join(BASE_DIR, 'frontend/build/static'),
]

# Security Settings
SECRET_KEY = os.environ.get('SECRET_KEY', 'your-secret-key-here')
CORS_ALLOWED_ORIGINS = [
    "https://your-domain.com",
    "https://www.your-domain.com",
]

# Logging
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'file': {
            'level': 'INFO',
            'class': 'logging.FileHandler',
            'filename': 'medical.log',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['file'],
            'level': 'INFO',
            'propagate': True,
        },
    },
}
EOF

echo "✅ Deployment setup complete!"
echo ""
echo "📋 Next Steps:"
echo "1. Update ALLOWED_HOSTS in settings_production.py with your domain"
echo "2. Set SECRET_KEY environment variable"
echo "3. Configure your web server (nginx/apache) to serve static files"
echo "4. Run: python manage.py runserver 0.0.0.0:8000"
echo ""
echo "🌐 Your app will be available at: http://your-domain.com"
