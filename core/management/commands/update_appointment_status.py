from django.core.management.base import BaseCommand
from django.utils import timezone
from core.models import Appointment
from datetime import timedelta


class Command(BaseCommand):
    help = 'Aktualisiert den Status von Terminen basierend auf ihrer Endzeit'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Zeigt an, welche Termine geändert würden, ohne sie tatsächlich zu ändern',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        now = timezone.now()
        
        # Finde alle geplanten Termine, deren Endzeit in der Vergangenheit liegt
        planned_appointments = Appointment.objects.filter(status='planned')
        
        appointments_to_update = []
        
        for appointment in planned_appointments:
            if appointment.appointment_date and appointment.duration_minutes:
                # Berechne die Endzeit des Termins
                end_time = appointment.appointment_date + timedelta(minutes=appointment.duration_minutes)
                
                # Wenn die Endzeit in der Vergangenheit liegt
                if end_time < now:
                    appointments_to_update.append(appointment)
        
        if dry_run:
            self.stdout.write(
                self.style.WARNING(
                    f'DRY RUN: {len(appointments_to_update)} Termine würden auf "completed" gesetzt werden:'
                )
            )
            for appointment in appointments_to_update:
                end_time = appointment.appointment_date + timedelta(minutes=appointment.duration_minutes)
                self.stdout.write(
                    f'  - Termin {appointment.id}: {appointment.patient} am {appointment.appointment_date.strftime("%d.%m.%Y %H:%M")} '
                    f'(Ende: {end_time.strftime("%d.%m.%Y %H:%M")})'
                )
        else:
            # Aktualisiere die Termine
            updated_count = 0
            for appointment in appointments_to_update:
                appointment.status = 'completed'
                appointment.save()
                updated_count += 1
            
            self.stdout.write(
                self.style.SUCCESS(
                    f'Erfolgreich {updated_count} Termine auf "completed" gesetzt.'
                )
            )
        
        # Abgeschlossene Termine auf "ready_to_bill" setzen (falls möglich)
        completed_appointments = Appointment.objects.filter(
            status='completed'
        )
        
        ready_to_bill_count = 0
        for appointment in completed_appointments:
            if appointment.can_be_billed():
                if dry_run:
                    self.stdout.write(f"  - Termin {appointment.id} würde auf 'ready_to_bill' gesetzt")
                else:
                    appointment.status = 'ready_to_bill'
                    appointment.save()
                    ready_to_bill_count += 1
        
        if not dry_run:
            self.stdout.write(f"✅ {ready_to_bill_count} Termine auf 'ready_to_bill' gesetzt")
        
        # Statistiken
        stats = {
            'planned': Appointment.objects.filter(status='planned').count(),
            'confirmed': Appointment.objects.filter(status='confirmed').count(),
            'completed': Appointment.objects.filter(status='completed').count(),
            'ready_to_bill': Appointment.objects.filter(status='ready_to_bill').count(),
            'billed': Appointment.objects.filter(status='billed').count(),
        }
        
        self.stdout.write("\n📊 Aktuelle Termin-Statistiken:")
        for status, count in stats.items():
            self.stdout.write(f"  {status}: {count}")
        
        if dry_run:
            self.stdout.write("\n🔍 Trockenlauf abgeschlossen - keine Änderungen vorgenommen")
        else:
            self.stdout.write("\n✅ Status-Aktualisierung abgeschlossen") 