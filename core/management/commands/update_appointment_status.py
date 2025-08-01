from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import datetime, timedelta
from core.models import Appointment

class Command(BaseCommand):
    help = 'Aktualisiert automatisch den Status von Terminen'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Zeigt nur an, was geändert würde, ohne tatsächlich zu ändern',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        now = timezone.now()
        
        self.stdout.write(f"Prüfe Termine zum {now.strftime('%d.%m.%Y %H:%M')}...")
        
        # Termine in der Vergangenheit auf "completed" setzen
        past_appointments = Appointment.objects.filter(
            appointment_date__lt=now,
            status__in=['planned', 'confirmed']
        )
        
        if dry_run:
            self.stdout.write(f"Würde {past_appointments.count()} Termine auf 'completed' setzen:")
            for app in past_appointments:
                self.stdout.write(f"  - Termin {app.id}: {app.patient} am {app.appointment_date.strftime('%d.%m.%Y %H:%M')}")
        else:
            updated_count = past_appointments.update(status='completed')
            self.stdout.write(f"✅ {updated_count} Termine auf 'completed' gesetzt")
        
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