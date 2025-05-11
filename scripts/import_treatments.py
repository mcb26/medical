from django.utils import timezone
from core.models import Treatment, Category
from datetime import datetime

def import_treatments():
    # Stelle sicher, dass die Kategorie existiert
    category, _ = Category.objects.get_or_create(name="Physiotherapie")
    
    # Standard-Werte
    default_duration = 30
    default_is_self_pay = False
    valid_from = datetime(2024, 1, 1)
    valid_until = datetime(2025, 12, 31)

    treatments_data = [
        {
            "position_number": "X0501",
            "treatment_name": "Allgemeine Krankengymnastik",
            "description": "Allgemeine Krankengymnastik - Einzelbehandlung",
        },
        {
            "position_number": "X0102",
            "treatment_name": "Unterwasserdruckstrahlmassage",
            "description": "Unterwasserdruckstrahlmassage - Einzelbehandlung",
        },
        {
            "position_number": "X0106",
            "treatment_name": "Klassische Massagetherapie",
            "description": "Klassische Massagetherapie - Einzelbehandlung",
        },
        {
            "position_number": "X0107",
            "treatment_name": "Bindegewebsmassage",
            "description": "Bindegewebsmassage - Einzelbehandlung",
        },
        {
            "position_number": "X0108",
            "treatment_name": "Segment-, Periost-, Colonmassage",
            "description": "Segment-, Periost-, Colonmassage - Einzelbehandlung",
        },
        {
            "position_number": "X0201",
            "treatment_name": "Manuelle Lymphdrainage 45 Min.",
            "description": "Manuelle Lymphdrainage - 45 Minuten",
            "duration_minutes": 45
        },
        {
            "position_number": "X0202",
            "treatment_name": "Manuelle Lymphdrainage 60 Min.",
            "description": "Manuelle Lymphdrainage - 60 Minuten",
            "duration_minutes": 60
        },
        {
            "position_number": "X0204",
            "treatment_name": "Kompressionsbandagierung",
            "description": "Kompressionsbandagierung einer Extremität",
        },
        {
            "position_number": "X0205",
            "treatment_name": "Manuelle Lymphdrainage 30 Min.",
            "description": "Manuelle Lymphdrainage - 30 Minuten",
        },
        {
            "position_number": "X0301",
            "treatment_name": "Übungsbehandlung",
            "description": "Übungsbehandlung - Einzelbehandlung",
        },
        {
            "position_number": "X0305",
            "treatment_name": "Übungsbehandlung Bewegungsbad",
            "description": "Übungsbehandlung im Bewegungsbad - Einzelbehandlung",
        },
        {
            "position_number": "X0306",
            "treatment_name": "Chirogymnastik",
            "description": "Chirogymnastik - Einzelbehandlung",
        },
        {
            "position_number": "X0401",
            "treatment_name": "Übungsbehandlung: Gruppe 2-5 Pat.",
            "description": "Übungsbehandlung in der Gruppe mit 2-5 Patienten",
        },
        {
            "position_number": "X0402",
            "treatment_name": "Übungsbehandlung Bewegungsbad: Gruppe 2-3 Pat.",
            "description": "Übungsbehandlung im Bewegungsbad in der Gruppe mit 2-3 Patienten",
        },
        {
            "position_number": "X0405",
            "treatment_name": "Übungsbehandlung Bewegungsbad: Gruppe 4-5 Pat.",
            "description": "Übungsbehandlung im Bewegungsbad in der Gruppe mit 4-5 Patienten",
        },
        {
            "position_number": "X0507",
            "treatment_name": "Gerätegestützte Krankengymnastik",
            "description": "Gerätegestützte Krankengymnastik - Parallele Einzelbehandlung bis 3 Pat.",
        },
        {
            "position_number": "X0521",
            "treatment_name": "Allgemeine Krankengymnastik - TL",
            "description": "Allgemeine Krankengymnastik - Therapieleitung",
        },
        {
            "position_number": "X0601",
            "treatment_name": "Allgemeine Krankengymnastik: Gruppe 2-5 Pat.",
            "description": "Allgemeine Krankengymnastik in der Gruppe mit 2-5 Patienten",
        },
        {
            "position_number": "X0621",
            "treatment_name": "Allgemeine Krankengymnastik: Gruppe 2-5 Pat. - TL",
            "description": "Allgemeine Krankengymnastik in der Gruppe mit 2-5 Patienten - Therapieleitung",
        },
        {
            "position_number": "X0702",
            "treatment_name": "Krankengymnastik Mukoviszidose",
            "description": "Krankengymnastik bei Mukoviszidose",
        },
        {
            "position_number": "X0708",
            "treatment_name": "Krankengymnastik ZNS-Kinder Bobath",
            "description": "Krankengymnastik nach Bobath für Kinder",
        },
        {
            "position_number": "X0709",
            "treatment_name": "Krankengymnastik ZNS-Kinder Vojta",
            "description": "Krankengymnastik nach Vojta für Kinder",
        },
        {
            "position_number": "X0710",
            "treatment_name": "Krankengymnastik ZNS Bobath",
            "description": "Krankengymnastik nach Bobath - Einzelbehandlung",
        },
        {
            "position_number": "X0711",
            "treatment_name": "Krankengymnastik ZNS Vojta",
            "description": "Krankengymnastik nach Vojta - Einzelbehandlung",
        },
        {
            "position_number": "X0712",
            "treatment_name": "Krankengymnastik ZNS PNF",
            "description": "Krankengymnastik nach PNF - Einzelbehandlung",
        },
        {
            "position_number": "X0720",
            "treatment_name": "Krankengymnastik ZNS Bobath - TL",
            "description": "Krankengymnastik nach Bobath - Therapieleitung",
        },
        {
            "position_number": "X0722",
            "treatment_name": "Krankengymnastik Mukoviszidose - TL",
            "description": "Krankengymnastik bei Mukoviszidose - Therapieleitung",
        },
        {
            "position_number": "X0728",
            "treatment_name": "Krankengymnastik ZNS-Kinder Bobath - TL",
            "description": "Krankengymnastik nach Bobath für Kinder - Therapieleitung",
        },
        {
            "position_number": "X0805",
            "treatment_name": "Krankengymnastik cerebrale Schädigungen bis 14 Jahre",
            "description": "Krankengymnastik bei cerebralen Schädigungen für Kinder bis 14 Jahre - Gruppe 2-4 Kinder",
        },
        {
            "position_number": "X0902",
            "treatment_name": "Krankengymnastik im Bewegungsbad",
            "description": "Krankengymnastik im Bewegungsbad - Einzelbehandlung",
        },
        {
            "position_number": "X1004",
            "treatment_name": "Krankengymnastik im Bewegungsbad: Gruppe 2-3 Pat.",
            "description": "Krankengymnastik im Bewegungsbad in der Gruppe mit 2-3 Patienten",
        },
        {
            "position_number": "X1005",
            "treatment_name": "Krankengymnastik im Bewegungsbad: Gruppe 4-5 Pat.",
            "description": "Krankengymnastik im Bewegungsbad in der Gruppe mit 4-5 Patienten",
        },
        {
            "position_number": "X1104",
            "treatment_name": "Traktionsbehandlung Gerät",
            "description": "Traktionsbehandlung mit Gerät",
        },
        {
            "position_number": "X1201",
            "treatment_name": "Manuelle Therapie",
            "description": "Manuelle Therapie - Einzelbehandlung",
        },
        {
            "position_number": "X1221",
            "treatment_name": "Manuelle Therapie - TL",
            "description": "Manuelle Therapie - Therapieleitung",
        },
        {
            "position_number": "X1302",
            "treatment_name": "Elektrotherapie",
            "description": "Elektrotherapie - Einzelbehandlung",
        },
        {
            "position_number": "X1303",
            "treatment_name": "Elektrostimulation bei Paresen",
            "description": "Elektrostimulation bei Lähmungen",
        },
        {
            "position_number": "X1310",
            "treatment_name": "Hydroelektrisches Teilbad",
            "description": "Hydroelektrisches Teilbad - Einzelbehandlung",
        },
        {
            "position_number": "X1312",
            "treatment_name": "Hydroelektrisches Vollbad",
            "description": "Hydroelektrisches Vollbad - Einzelbehandlung",
        },
        {
            "position_number": "X1501",
            "treatment_name": "Warmpackung",
            "description": "Warmpackung - Einzelbehandlung",
        },
        {
            "position_number": "X1517",
            "treatment_name": "Wärmetherapie Heißluft",
            "description": "Wärmetherapie mit Heißluft",
        },
        {
            "position_number": "X1530",
            "treatment_name": "Heiße Rolle",
            "description": "Wärmetherapie mit heißer Rolle",
        },
        {
            "position_number": "X1531",
            "treatment_name": "Ultraschall-Wärmetherapie",
            "description": "Wärmetherapie mit Ultraschall",
        },
        {
            "position_number": "X1532",
            "treatment_name": "Bäder mit Peloiden: Vollbad",
            "description": "Peloidbad als Vollbad",
        },
        {
            "position_number": "X1533",
            "treatment_name": "Bäder mit Peloiden: Teilbad",
            "description": "Peloidbad als Teilbad",
        },
        {
            "position_number": "X1534",
            "treatment_name": "Kältetherapie",
            "description": "Kältetherapie - Einzelbehandlung",
        },
        {
            "position_number": "X1714",
            "treatment_name": "Kohlensäurebad",
            "description": "Kohlensäurebad - Einzelbehandlung",
        },
        {
            "position_number": "X1732",
            "treatment_name": "Kohlensäuregasbad als Voll-, Dreiviertel- oder Halbbad",
            "description": "Kohlensäuregasbad als Voll-, Dreiviertel- oder Halbbad - Einzelbehandlung",
        },
        {
            "position_number": "X1733",
            "treatment_name": "Kohlensäuregasbad als Teilbad",
            "description": "Kohlensäuregasbad als Teilbad - Einzelbehandlung",
        },
        {
            "position_number": "X1801",
            "treatment_name": "Inhalationstherapie",
            "description": "Inhalationstherapie - Einzelbehandlung",
        },
        {
            "position_number": "X2001",
            "treatment_name": "Standardisierte Heilmittelkombination",
            "description": "Standardisierte Heilmittelkombination - Einzelbehandlung",
        }
    ]

    for treatment_data in treatments_data:
        # Setze Standardwerte wenn nicht anders angegeben
        treatment_data.setdefault('duration_minutes', default_duration)
        
        treatment, created = Treatment.objects.get_or_create(
            position_number=treatment_data['position_number'],
            defaults={
                'treatment_name': treatment_data['treatment_name'],
                'description': treatment_data['description'],
                'duration_minutes': treatment_data['duration_minutes'],
                'category': category,
                'is_self_pay': default_is_self_pay,
            }
        )
        
        print(f"Behandlung {'erstellt' if created else 'existiert bereits'}: {treatment.position_number} - {treatment.treatment_name}")

    print("\nBehandlungen erfolgreich importiert!")

if __name__ == "__main__":
    import_treatments() 