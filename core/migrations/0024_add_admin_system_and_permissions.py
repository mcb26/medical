# Generated manually

from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone


def create_default_roles(apps, schema_editor):
    """Erstelle Standard-Rollen"""
    UserRole = apps.get_model('core', 'UserRole')
    
    default_roles = [
        ('Staff', 'Standard-Mitarbeiter'),
        ('Admin', 'Administrator'),
        ('Manager', 'Manager'),
        ('Doctor', 'Arzt'),
        ('Nurse', 'Krankenschwester'),
        ('Receptionist', 'Empfang'),
    ]
    
    for role_name, description in default_roles:
        UserRole.objects.get_or_create(
            name=role_name,
            defaults={
                'description': description,
                'permissions': {},
                'is_active': True,
                'created_at': django.utils.timezone.now(),
                'updated_at': django.utils.timezone.now(),
            }
        )


def migrate_user_roles(apps, schema_editor):
    """Migriere bestehende String-Rollen zu UserRole Objekten"""
    User = apps.get_model('core', 'User')
    UserRole = apps.get_model('core', 'UserRole')
    
    # Hole Standard-Rolle
    default_role = UserRole.objects.filter(name='Staff').first()
    if not default_role:
        default_role = UserRole.objects.first()
    
    # Aktualisiere alle User - setze alle auf Standard-Rolle
    User.objects.all().update(role=default_role)


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0023_add_theme_settings'),
    ]

    operations = [
        # Erstelle UserRole Tabelle
        migrations.CreateModel(
            name='UserRole',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=50, unique=True)),
                ('description', models.TextField()),
                ('permissions', models.JSONField()),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'Benutzerrolle',
                'verbose_name_plural': 'Benutzerrollen',
            },
        ),
        
        # Erstelle UserActivityLog Tabelle
        migrations.CreateModel(
            name='UserActivityLog',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('action', models.CharField(max_length=20)),
                ('module', models.CharField(max_length=50)),
                ('object_type', models.CharField(max_length=50)),
                ('object_id', models.CharField(max_length=50)),
                ('description', models.TextField()),
                ('ip_address', models.GenericIPAddressField(blank=True, null=True)),
                ('user_agent', models.TextField()),
                ('timestamp', models.DateTimeField(auto_now_add=True)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='core.user')),
            ],
            options={
                'verbose_name': 'Benutzeraktivitäts-Log',
                'verbose_name_plural': 'Benutzeraktivitäts-Logs',
            },
        ),
        
        # Erstelle ModulePermission Tabelle
        migrations.CreateModel(
            name='ModulePermission',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('module', models.CharField(choices=[('appointments', 'Terminkalender'), ('patients', 'Patienten'), ('prescriptions', 'Verordnungen'), ('treatments', 'Heilmittel'), ('reports', 'Berichte'), ('finance', 'Finanzen'), ('billing', 'Abrechnung'), ('settings', 'Einstellungen'), ('users', 'Benutzerverwaltung')], max_length=20)),
                ('permission', models.CharField(choices=[('none', 'Keine'), ('read', 'Lesen'), ('create', 'Erstellen'), ('update', 'Bearbeiten'), ('delete', 'Löschen'), ('full', 'Vollzugriff')], max_length=10)),
                ('granted_at', models.DateTimeField(auto_now_add=True)),
                ('expires_at', models.DateTimeField(blank=True, null=True)),
                ('is_active', models.BooleanField(default=True)),
                ('granted_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='granted_permissions', to='core.user')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='module_permissions', to='core.user')),
            ],
            options={
                'verbose_name': 'Modul-Berechtigung',
                'verbose_name_plural': 'Modul-Berechtigungen',
            },
        ),
        
        # Füge neue Felder zum User Model hinzu
        migrations.AddField(
            model_name='user',
            name='is_admin',
            field=models.BooleanField(default=False, help_text='Administratoren haben automatisch alle Berechtigungen', verbose_name='Administrator'),
        ),
        migrations.AddField(
            model_name='user',
            name='is_employee',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='user',
            name='employee_id',
            field=models.CharField(default='', max_length=20),
        ),
        migrations.AddField(
            model_name='user',
            name='hire_date',
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='user',
            name='is_locked',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='user',
            name='last_login_ip',
            field=models.GenericIPAddressField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='user',
            name='lock_reason',
            field=models.TextField(default=''),
        ),
        migrations.AddField(
            model_name='user',
            name='login_count',
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name='user',
            name='custom_permissions',
            field=models.JSONField(default=dict),
        ),
        migrations.AddField(
            model_name='user',
            name='can_access_appointments',
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name='user',
            name='can_access_finance',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='user',
            name='can_access_patients',
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name='user',
            name='can_access_prescriptions',
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name='user',
            name='can_access_reports',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='user',
            name='can_access_settings',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='user',
            name='can_access_treatments',
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name='user',
            name='can_manage_roles',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='user',
            name='can_manage_users',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='user',
            name='supervisor',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='subordinates', to='core.user'),
        ),
        
        # Ändere role Feld zu ForeignKey
        migrations.AlterField(
            model_name='user',
            name='role',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='core.userrole'),
        ),
        
        # Erstelle Standard-Rollen
        migrations.RunPython(create_default_roles),
        
        # Migriere bestehende Rollen
        migrations.RunPython(migrate_user_roles),
        

    ] 