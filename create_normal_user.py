#!/usr/bin/env python3
import os
import sys
import django

# Django Setup
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'medical.settings')
django.setup()

from core.models import User, UserRole, ModulePermission

def create_normal_user():
    # Hole die Standard-Rolle (Staff)
    try:
        staff_role = UserRole.objects.get(name='Staff')
    except UserRole.DoesNotExist:
        print("Staff-Rolle nicht gefunden. Erstelle sie...")
        staff_role = UserRole.objects.create(
            name='Staff',
            description='Standard-Mitarbeiterrolle',
            permissions={},
            is_active=True
        )
    
    # Erstelle einen normalen User
    username = 'mitarbeiter1'
    email = 'mitarbeiter1@example.com'
    password = 'mitarbeiter1'
    
    # Prüfe ob User bereits existiert
    if User.objects.filter(username=username).exists():
        print(f"User '{username}' existiert bereits!")
        return
    
    # Erstelle den User
    user = User.objects.create_user(
        username=username,
        email=email,
        password=password,
        first_name='Max',
        last_name='Mustermann',
        is_staff=False,
        is_superuser=False,
        is_active=True
    )
    
    # Setze die Rolle und Admin-Status
    user.role = staff_role
    user.is_admin = False
    user.is_employee = True
    user.employee_id = 'EMP001'
    user.department = 'Rezeption'
    user.save()
    
    # Erstelle Module-Berechtigungen für den User
    modules = [
        'patients', 'appointments', 'prescriptions', 'treatments', 
        'finance', 'reports', 'billing', 'settings'
    ]
    
    for module in modules:
        ModulePermission.objects.create(
            user=user,
            module=module,
            permission='read',  # Nur Leserechte
            granted_by=User.objects.filter(is_superuser=True).first(),
            is_active=True
        )
    
    print(f"✅ User '{username}' erfolgreich erstellt!")
    print(f"   Username: {username}")
    print(f"   Password: {password}")
    print(f"   Rolle: {staff_role.name}")
    print(f"   Admin: Nein")
    print(f"   Berechtigungen: Nur Leserechte für alle Module")

if __name__ == '__main__':
    create_normal_user() 