#!/bin/bash

# Apache Setup Script für Medical App

echo "🚀 Apache Setup für Medical App..."

# Apache Module aktivieren
echo "📦 Apache Module aktivieren..."
sudo a2enmod rewrite
sudo a2enmod proxy
sudo a2enmod proxy_http
sudo a2enmod ssl
sudo a2enmod headers

# Apache Konfiguration kopieren
echo "⚙️ Apache Konfiguration erstellen..."
sudo cp apache-config.conf /etc/apache2/sites-available/medical.conf

# Site aktivieren
echo "🌐 Site aktivieren..."
sudo a2ensite medical.conf

# Standard Site deaktivieren (optional)
echo "⚠️ Standard Site deaktivieren (optional)..."
sudo a2dissite 000-default.conf

# Apache Syntax prüfen
echo "🔍 Apache Konfiguration prüfen..."
sudo apache2ctl configtest

if [ $? -eq 0 ]; then
    echo "✅ Apache Konfiguration ist gültig!"
    echo ""
    echo "📋 Nächste Schritte:"
    echo "1. Bearbeiten Sie /etc/apache2/sites-available/medical.conf:"
    echo "   - Ersetzen Sie 'your-domain.com' mit Ihrer Domain"
    echo "   - Ersetzen Sie '/path/to/medical/' mit dem tatsächlichen Pfad"
    echo "   - Konfigurieren Sie SSL-Zertifikate für HTTPS"
    echo ""
    echo "2. Apache neu starten:"
    echo "   sudo systemctl restart apache2"
    echo ""
    echo "3. Django Server starten:"
    echo "   cd /path/to/medical"
    echo "   source venv/bin/activate"
    echo "   python manage.py runserver 127.0.0.1:8000"
    echo ""
    echo "🌐 Ihre App wird dann unter http://your-domain.com erreichbar sein!"
else
    echo "❌ Apache Konfiguration hat Fehler!"
    echo "Bitte überprüfen Sie die Konfiguration."
fi
