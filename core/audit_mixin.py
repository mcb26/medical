from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.db.models.signals import post_save, post_delete, pre_save
from django.dispatch import receiver
from django.core.exceptions import ObjectDoesNotExist
import json

User = get_user_model()


class AuditMixin(models.Model):
    """Mixin für automatisches Audit-Logging"""
    
    class Meta:
        abstract = True

    def save(self, *args, **kwargs):
        # Speichere alte Werte vor dem Speichern
        if self.pk:
            try:
                old_instance = self.__class__.objects.get(pk=self.pk)
                self._old_instance = old_instance
            except ObjectDoesNotExist:
                self._old_instance = None
        else:
            self._old_instance = None
        
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        # Speichere alte Werte vor dem Löschen
        self._old_instance = self
        super().delete(*args, **kwargs)


@receiver(post_save)
def audit_post_save(sender, instance, created, **kwargs):
    """Signal-Handler für CREATE und UPDATE"""
    if not hasattr(instance, '_old_instance'):
        return
    
    # Nur für Models mit AuditMixin
    if not isinstance(instance, AuditMixin):
        return
    
    # Hole den aktuellen Benutzer (falls verfügbar)
    user = getattr(instance, '_current_user', None)
    user_initials = ''
    if user and hasattr(user, 'initials'):
        user_initials = user.initials or ''
    
    action = 'create' if created else 'update'
    
    if created:
        # CREATE: Logge alle Felder
        from core.models import AuditLog
        AuditLog.objects.create(
            user=user,
            user_initials=user_initials,
            model_name=instance.__class__.__name__,
            object_id=instance.pk,
            action=action,
            field_name='',
            old_value='',
            new_value=f"Objekt erstellt: {instance}",
            notes=f"Neues {instance.__class__.__name__} erstellt"
        )
    else:
        # UPDATE: Logge geänderte Felder
        if hasattr(instance, '_old_instance') and instance._old_instance:
            from core.models import AuditLog
            old_instance = instance._old_instance
            
            for field in instance._meta.fields:
                old_value = getattr(old_instance, field.name, None)
                new_value = getattr(instance, field.name, None)
                
                # Konvertiere zu String für Vergleich
                if old_value is not None:
                    old_value = str(old_value)
                if new_value is not None:
                    new_value = str(new_value)
                
                # Logge nur wenn sich der Wert geändert hat
                if old_value != new_value:
                    AuditLog.objects.create(
                        user=user,
                        user_initials=user_initials,
                        model_name=instance.__class__.__name__,
                        object_id=instance.pk,
                        action=action,
                        field_name=field.name,
                        old_value=old_value or '',
                        new_value=new_value or '',
                        notes=f"Feld '{field.verbose_name or field.name}' geändert"
                    )


@receiver(post_delete)
def audit_post_delete(sender, instance, **kwargs):
    """Signal-Handler für DELETE"""
    if not isinstance(instance, AuditMixin):
        return
    
    # Hole den aktuellen Benutzer (falls verfügbar)
    user = getattr(instance, '_current_user', None)
    user_initials = ''
    if user and hasattr(user, 'initials'):
        user_initials = user.initials or ''
    
    from core.models import AuditLog
    AuditLog.objects.create(
        user=user,
        user_initials=user_initials,
        model_name=instance.__class__.__name__,
        object_id=instance.pk,
        action='delete',
        field_name='',
        old_value=f"Gelöschtes Objekt: {instance}",
        new_value='',
        notes=f"{instance.__class__.__name__} gelöscht"
    )


def set_current_user(user):
    """Setze den aktuellen Benutzer für Audit-Logging"""
    def decorator(func):
        def wrapper(*args, **kwargs):
            # Setze den Benutzer für alle Model-Instanzen
            for arg in args:
                if hasattr(arg, '_current_user'):
                    arg._current_user = user
            return func(*args, **kwargs)
        return wrapper
    return decorator


