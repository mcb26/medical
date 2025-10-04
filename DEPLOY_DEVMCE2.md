# Deployment auf devmc2.eu

## 🚀 Schnellstart für devmc2.eu

### 1. Automatisches Setup ausführen
```bash
# Auf Ihrem Server ausführen:
sudo ./setup-devmc2.sh
```

### 2. SSL Zertifikat (falls noch nicht vorhanden)
```bash
sudo certbot --apache -d devmc2.eu -d www.devmc2.eu
```

### 3. Django Service starten
```bash
# Service-Datei kopieren
sudo cp medical-django.service /etc/systemd/system/

# Service aktivieren und starten
sudo systemctl daemon-reload
sudo systemctl enable medical-django
sudo systemctl start medical-django

# Status prüfen
sudo systemctl status medical-django
```

## 📋 Manuelle Schritte (falls automatisches Setup nicht funktioniert)

### 1. Repository klonen
```bash
sudo git clone https://github.com/mcb26/medical.git /var/www/medical
sudo chown -R www-data:www-data /var/www/medical
```

### 2. Python Environment
```bash
cd /var/www/medical
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 3. Django Setup
```bash
python manage.py migrate
python manage.py collectstatic --noinput
python manage.py createsuperuser
```

### 4. React Build
```bash
cd frontend
npm install
npm run build
cd ..
```

### 5. Apache Konfiguration
```bash
sudo cp apache-devmc2.conf /etc/apache2/sites-available/medical-devmc2.conf
sudo a2ensite medical-devmc2.conf
sudo a2dissite 000-default.conf
sudo systemctl restart apache2
```

## 🔧 Konfiguration

### Apache Konfiguration
Die Apache-Konfiguration ist bereits für `devmc2.eu` optimiert:
- HTTPS Redirect
- SSL Zertifikat (Let's Encrypt)
- React Router Support
- Django API Proxy
- Security Headers
- Gzip Kompression

### Django Settings
Verwenden Sie `settings_production.py` für Production:
```python
DEBUG = False
ALLOWED_HOSTS = ['devmc2.eu', 'www.devmc2.eu']
```

### Verzeichnisstruktur
```
/var/www/medical/
├── frontend/build/          # React App
├── staticfiles/             # Django Static Files
├── media/                   # Django Media Files
├── venv/                    # Python Virtual Environment
├── manage.py
└── medical/
    └── settings_production.py
```

## 🌐 URLs

- **Frontend**: https://www.devmc2.eu/
- **API**: https://www.devmc2.eu/api/
- **Admin**: https://www.devmc2.eu/admin/
- **Static**: https://www.devmc2.eu/static/

## 🔍 Troubleshooting

### Logs prüfen
```bash
# Apache Logs
sudo tail -f /var/log/apache2/medical_devmc2_error.log
sudo tail -f /var/log/apache2/medical_devmc2_access.log

# Django Service Logs
sudo journalctl -u medical-django -f

# Django App Logs
tail -f /var/www/medical/medical.log
```

### Services prüfen
```bash
# Apache Status
sudo systemctl status apache2

# Django Service Status
sudo systemctl status medical-django

# Ports prüfen
netstat -tlnp | grep :80   # Apache
netstat -tlnp | grep :443  # Apache HTTPS
netstat -tlnp | grep :8000 # Django
```

### Berechtigungen prüfen
```bash
# Berechtigungen setzen
sudo chown -R www-data:www-data /var/www/medical
sudo chmod -R 755 /var/www/medical
```

## 🔄 Updates

### Code Updates
```bash
cd /var/www/medical
sudo git pull origin main
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py collectstatic --noinput
cd frontend && npm install && npm run build && cd ..
sudo systemctl restart medical-django
```

### SSL Zertifikat erneuern
```bash
sudo certbot renew
sudo systemctl reload apache2
```

## 🔒 Sicherheit

### Firewall
```bash
# UFW aktivieren
sudo ufw enable
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
```

### Backup
```bash
# Datenbank Backup
cd /var/www/medical
python manage.py dumpdata > backup_$(date +%Y%m%d_%H%M%S).json

# Vollständiges Backup
sudo tar -czf medical_backup_$(date +%Y%m%d_%H%M%S).tar.gz /var/www/medical
```

## 📊 Monitoring

### Apache Status aktivieren
```bash
sudo a2enmod status
```

Dann in Apache-Konfiguration hinzufügen:
```apache
<Location /server-status>
    SetHandler server-status
    Require local
</Location>
```

Erreichbar unter: https://www.devmc2.eu/server-status
