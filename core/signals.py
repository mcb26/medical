from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .models import WorkingHour, Practitioner

@receiver(post_save, sender=WorkingHour)
def update_practitioner_working_hours(sender, instance, created, **kwargs):
    """
    Signal, das ausgelöst wird, wenn eine Arbeitszeit gespeichert wird.
    Aktualisiert die working_hours des zugehörigen Practitioners.
    """
    print(f"WorkingHour Signal: {'created' if created else 'updated'} for {instance.practitioner}")
    instance.practitioner.save()  # Dies triggert die Aktualisierung der Arbeitszeiten

@receiver(post_delete, sender=WorkingHour)
def handle_working_hour_delete(sender, instance, **kwargs):
    """
    Signal, das ausgelöst wird, wenn eine Arbeitszeit gelöscht wird.
    Aktualisiert die working_hours des zugehörigen Practitioners.
    """
    print(f"WorkingHour Signal: deleted for {instance.practitioner}")
    instance.practitioner.save()  # Dies triggert die Aktualisierung der Arbeitszeiten 