# Apache Setup für Medical App

## 🚀 Schnellstart

### 1. Apache Setup ausführen
```bash
./apache-setup.sh
```

### 2. Konfiguration anpassen
Bearbeiten Sie `/etc/apache2/sites-available/medical.conf`:

```apache
# Ersetzen Sie diese Werte:
ServerName your-domain.com                    # → Ihre Domain
DocumentRoot /path/to/medical/frontend/build  # → Tatsächlicher Pfad
Alias /static/ /path/to/medical/staticfiles/  # → Tatsächlicher Pfad
```

### 3. Apache neu starten
```bash
sudo systemctl restart apache2
```

## 📋 Detaillierte Anleitung

### Voraussetzungen
- Apache2 installiert
- Python Virtual Environment
- React App gebaut (`npm run build`)
- Django Server läuft auf Port 8000

### Apache Module
Die folgenden Module müssen aktiviert sein:
```bash
sudo a2enmod rewrite
sudo a2enmod proxy
sudo a2enmod proxy_http
sudo a2enmod ssl
sudo a2enmod headers
```

### Verzeichnisstruktur
```
/path/to/medical/
├── frontend/build/          # React App (gebaut)
├── staticfiles/             # Django Static Files
├── media/                   # Django Media Files
├── manage.py
└── medical/
    └── settings_production.py
```

### Django Server starten
```bash
cd /path/to/medical
source venv/bin/activate
python manage.py runserver 127.0.0.1:8000
```

### SSL Konfiguration (Optional)
Für HTTPS fügen Sie Ihre SSL-Zertifikate hinzu:
```apache
SSLCertificateFile /path/to/your/certificate.crt
SSLCertificateKeyFile /path/to/your/private.key
```

## 🔧 Troubleshooting

### Apache Logs prüfen
```bash
sudo tail -f /var/log/apache2/medical_error.log
sudo tail -f /var/log/apache2/medical_access.log
```

### Django Logs prüfen
```bash
tail -f /path/to/medical/medical.log
```

### Port prüfen
```bash
netstat -tlnp | grep :8000  # Django Server
netstat -tlnp | grep :80    # Apache
```

### React Build prüfen
```bash
ls -la /path/to/medical/frontend/build/
# Sollte index.html und static/ Ordner enthalten
```

## 🌐 URL Struktur

- **Frontend**: `http://your-domain.com/` → React App
- **API**: `http://your-domain.com/api/` → Django API
- **Admin**: `http://your-domain.com/admin/` → Django Admin
- **Static**: `http://your-domain.com/static/` → Django Static Files

## ⚡ Performance Optimierung

### Gzip Kompression aktivieren
```apache
LoadModule deflate_module modules/mod_deflate.so

<Location />
    SetOutputFilter DEFLATE
    SetEnvIfNoCase Request_URI \
        \.(?:gif|jpe?g|png)$ no-gzip dont-vary
    SetEnvIfNoCase Request_URI \
        \.(?:exe|t?gz|zip|bz2|sit|rar)$ no-gzip dont-vary
</Location>
```

### Browser Caching
```apache
<LocationMatch "\.(css|js|png|jpg|jpeg|gif|ico|svg)$">
    ExpiresActive On
    ExpiresDefault "access plus 1 month"
</LocationMatch>
```

## 🔒 Sicherheit

### HTTPS Redirect
```apache
<VirtualHost *:80>
    ServerName your-domain.com
    Redirect permanent / https://your-domain.com/
</VirtualHost>
```

### Security Headers
```apache
Header always set X-Content-Type-Options nosniff
Header always set X-Frame-Options DENY
Header always set X-XSS-Protection "1; mode=block"
Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"
```

## 📊 Monitoring

### Apache Status aktivieren
```bash
sudo a2enmod status
```

In der Apache-Konfiguration:
```apache
<Location /server-status>
    SetHandler server-status
    Require local
</Location>
```

Dann erreichbar unter: `http://your-domain.com/server-status`
