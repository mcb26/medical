#!/bin/bash

# Setup Script für Medical App auf devmc2.eu

echo "🚀 Medical App Setup für devmc2.eu..."

# Repository klonen/updaten
echo "📦 Repository klonen/updaten..."
if [ ! -d "/var/www/medical" ]; then
    sudo git clone https://github.com/mcb26/medical.git /var/www/medical
else
    cd /var/www/medical
    sudo git pull origin main
fi

# Berechtigungen setzen
echo "🔐 Berechtigungen setzen..."
sudo chown -R www-data:www-data /var/www/medical
sudo chmod -R 755 /var/www/medical

# Python Virtual Environment
echo "🐍 Python Virtual Environment..."
cd /var/www/medical
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi
source venv/bin/activate
pip install -r requirements.txt

# Django Setup
echo "⚙️ Django Setup..."
python manage.py migrate
python manage.py collectstatic --noinput
python manage.py createsuperuser --noinput --username admin --email admin@devmc2.eu || echo "Superuser bereits vorhanden"

# React Frontend Build
echo "⚛️ React Frontend Build..."
cd frontend
npm install
npm run build
cd ..

# Apache Konfiguration
echo "🌐 Apache Konfiguration..."
sudo cp apache-devmc2.conf /etc/apache2/sites-available/medical-devmc2.conf

# Apache Module aktivieren
echo "📦 Apache Module aktivieren..."
sudo a2enmod rewrite
sudo a2enmod proxy
sudo a2enmod proxy_http
sudo a2enmod ssl
sudo a2enmod headers
sudo a2enmod deflate

# Site aktivieren
echo "🌐 Site aktivieren..."
sudo a2ensite medical-devmc2.conf
sudo a2dissite 000-default.conf

# SSL Zertifikat prüfen
echo "🔒 SSL Zertifikat prüfen..."
if [ ! -f "/etc/letsencrypt/live/devmc2.eu/fullchain.pem" ]; then
    echo "⚠️ SSL Zertifikat nicht gefunden!"
    echo "Führen Sie aus: sudo certbot --apache -d devmc2.eu -d www.devmc2.eu"
else
    echo "✅ SSL Zertifikat vorhanden"
fi

# Apache Syntax prüfen
echo "🔍 Apache Konfiguration prüfen..."
sudo apache2ctl configtest

if [ $? -eq 0 ]; then
    echo "✅ Apache Konfiguration ist gültig!"
    echo ""
    echo "📋 Nächste Schritte:"
    echo "1. Apache neu starten:"
    echo "   sudo systemctl restart apache2"
    echo ""
    echo "2. Django Server starten:"
    echo "   cd /var/www/medical"
    echo "   source venv/bin/activate"
    echo "   python manage.py runserver 127.0.0.1:8000"
    echo ""
    echo "3. Systemd Service erstellen (optional):"
    echo "   sudo nano /etc/systemd/system/medical-django.service"
    echo ""
    echo "🌐 Ihre App wird dann unter https://www.devmc2.eu erreichbar sein!"
else
    echo "❌ Apache Konfiguration hat Fehler!"
    echo "Bitte überprüfen Sie die Konfiguration."
fi
