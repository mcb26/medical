# Generated manually

from django.db import migrations

def set_admin_for_superusers(apps, schema_editor):
    """Setze is_admin=True für alle Superuser"""
    User = apps.get_model('core', 'User')
    
    # Alle Superuser als Admin markieren
    superusers = User.objects.filter(is_superuser=True)
    superusers.update(is_admin=True)
    
    print(f"✅ {superusers.count()} Superuser als Admin markiert")

def reverse_set_admin_for_superusers(apps, schema_editor):
    """Reverse: Entferne is_admin für alle Superuser"""
    User = apps.get_model('core', 'User')
    
    # Alle Superuser von Admin-Status entfernen
    superusers = User.objects.filter(is_superuser=True)
    superusers.update(is_admin=False)
    
    print(f"❌ {superusers.count()} Superuser von Admin-Status entfernt")

class Migration(migrations.Migration):

    dependencies = [
        ('core', '0025_add_therapist_flag'),
    ]

    operations = [
        migrations.RunPython(
            set_admin_for_superusers,
            reverse_set_admin_for_superusers
        ),
    ] 