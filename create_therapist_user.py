#!/usr/bin/env python3
import os
import sys
import django

# Django-Setup
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'medical.settings')
django.setup()

from core.models import User, Practitioner

def create_therapist_user():
    """Erstellt einen Test-Therapeuten"""
    
    # Erstelle zuerst den Practitioner
    practitioner = Practitioner.objects.create(
        first_name="Max",
        last_name="Mustermann",
        email="max.mustermann@example.com",
        is_active=True
    )
    
    # Erstelle dann den User
    user = User.objects.create_user(
        username="therapeut",
        email="max.mustermann@example.com",
        password="test123",
        first_name="Max",
        last_name="Mustermann",
        is_therapist=True,  # Wichtig: Therapeut-Flag setzen
        is_active=True
    )
    
    print(f"✅ Therapeut erstellt:")
    print(f"   Username: {user.username}")
    print(f"   Passwort: test123")
    print(f"   Name: {user.first_name} {user.last_name}")
    print(f"   Therapeut: {user.is_therapist}")
    print(f"   Practitioner-ID: {practitioner.id}")
    
    return user, practitioner

if __name__ == "__main__":
    try:
        user, practitioner = create_therapist_user()
        print("\n🎉 Therapeut erfolgreich erstellt!")
        print("Sie können sich jetzt mit 'therapeut' / 'test123' anmelden.")
    except Exception as e:
        print(f"❌ Fehler beim Erstellen des Therapeuten: {e}")
        sys.exit(1) 