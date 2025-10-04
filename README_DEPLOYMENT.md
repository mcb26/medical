# Medical App - Deployment Guide

## 🚀 Quick Deployment

### 1. Repository klonen
```bash
git clone https://github.com/mcb26/medical.git
cd medical
```

### 2. Automatisches Deployment-Script ausführen
```bash
./deploy.sh
```

### 3. Manuelle Schritte nach dem Script

#### Backend konfigurieren:
```bash
# Virtual Environment aktivieren
source venv/bin/activate

# Datenbank migrieren
python manage.py migrate

# Superuser erstellen (optional)
python manage.py createsuperuser

# Statische Dateien sammeln
python manage.py collectstatic --noinput
```

#### Frontend builden:
```bash
cd frontend
npm install
npm run build
cd ..
```

### 4. Production Settings anpassen

Bearbeiten Sie `medical/settings_production.py`:
- `ALLOWED_HOSTS` mit Ihrer Domain aktualisieren
- `SECRET_KEY` setzen (Umgebungsvariable oder direkt)
- `CORS_ALLOWED_ORIGINS` mit Ihrer Domain aktualisieren

### 5. Server starten

#### Development:
```bash
python manage.py runserver 0.0.0.0:8000
```

#### Production mit Gunicorn:
```bash
pip install gunicorn
gunicorn medical.wsgi:application --bind 0.0.0.0:8000
```

## 🔧 Nginx Konfiguration (Optional)

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location /static/ {
        alias /path/to/medical/staticfiles/;
    }

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## 📁 Wichtige Dateien

- `db.sqlite3` - Datenbank (wird automatisch erstellt)
- `requirements.txt` - Python Abhängigkeiten
- `frontend/package.json` - Node.js Abhängigkeiten
- `medical/settings.py` - Development Settings
- `medical/settings_production.py` - Production Settings

## 🔐 Umgebungsvariablen

Setzen Sie diese Umgebungsvariablen für Production:
```bash
export SECRET_KEY="your-very-secret-key-here"
export DEBUG=False
```

## 📊 Datenbank

Die App verwendet SQLite als Standard-Datenbank. Für Production können Sie PostgreSQL verwenden:

```python
# In settings_production.py
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'medical_db',
        'USER': 'your_user',
        'PASSWORD': 'your_password',
        'HOST': 'localhost',
        'PORT': '5432',
    }
}
```

## 🎯 Features

- ✅ Vollständige Medical Practice Management
- ✅ Patient Management
- ✅ Appointment Scheduling
- ✅ Treatment Management
- ✅ Billing System
- ✅ Audit Logging
- ✅ User Management
- ✅ Responsive React Frontend

## 🆘 Support

Bei Problemen:
1. Überprüfen Sie die Logs in `medical.log`
2. Stellen Sie sicher, dass alle Dependencies installiert sind
3. Überprüfen Sie die Datenbank-Migrationen: `python manage.py showmigrations`
