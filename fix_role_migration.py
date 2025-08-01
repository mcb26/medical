#!/usr/bin/env python
import os
import sys
import django

# Django Setup
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'medical.settings')
django.setup()

from core.models import User, UserRole

def fix_role_migration():
    """Behebt den Foreign Key Fehler bei der Rollen-Migration"""
    print("🔧 Behebe Rollen-Migration...")
    
    # Erstelle Standard-Rollen falls sie nicht existieren
    default_roles = {
        'Staff': 'Standard-Mitarbeiter',
        'Admin': 'Administrator',
        'Manager': 'Manager',
        'Doctor': 'Arzt',
        'Nurse': 'Krankenschwester',
        'Receptionist': 'Empfang',
    }
    
    created_roles = {}
    for role_name, description in default_roles.items():
        role, created = UserRole.objects.get_or_create(
            name=role_name,
            defaults={
                'description': description,
                'permissions': {},
                'is_active': True
            }
        )
        created_roles[role_name] = role
        if created:
            print(f"✅ Rolle '{role_name}' erstellt")
        else:
            print(f"ℹ️  Rolle '{role_name}' existiert bereits")
    
    # Aktualisiere bestehende User
    users_updated = 0
    for user in User.objects.all():
        if hasattr(user, 'role') and user.role:
            # Wenn role ein String ist, konvertiere es zu einem UserRole Objekt
            if isinstance(user.role, str):
                role_name = user.role
                if role_name in created_roles:
                    user.role = created_roles[role_name]
                    user.save()
                    users_updated += 1
                    print(f"✅ User '{user.username}' zu Rolle '{role_name}' zugewiesen")
                else:
                    # Fallback: Setze auf Standard-Rolle
                    user.role = created_roles['Staff']
                    user.save()
                    users_updated += 1
                    print(f"⚠️  User '{user.username}' zu Standard-Rolle 'Staff' zugewiesen")
            elif user.role is None:
                # Fallback für User ohne Rolle
                user.role = created_roles['Staff']
                user.save()
                users_updated += 1
                print(f"⚠️  User '{user.username}' zu Standard-Rolle 'Staff' zugewiesen")
    
    print(f"\n🎉 Migration abgeschlossen! {users_updated} User aktualisiert.")
    print("💡 Sie können jetzt die Django-Migration ausführen.")

if __name__ == '__main__':
    fix_role_migration() 