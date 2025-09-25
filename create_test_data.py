#!/usr/bin/env python3
"""
Erweitertes Skript zum Erstellen von Testdaten für die Abrechnung
mit realistischen Behandlungen aus dem deutschen Heilmittelkatalog
"""

import os
import sys
import django
from datetime import date, timedelta
from decimal import Decimal
import random

# Django-Setup
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'medical.settings')
django.setup()

from core.models import (
    InsuranceProvider, InsuranceProviderGroup, Treatment, 
    Surcharge, Patient, PatientInsurance, Prescription, 
    Appointment, Practitioner, Room, Practice, Bundesland,
    Doctor, ICDCode
)

def create_test_data():
    """Erstellt erweiterte Testdaten für die Abrechnung"""
    
    print("Erstelle erweiterte Testdaten für die Abrechnung...")
    
    # 1. Versicherungsgruppen erstellen
    print("1. Erstelle Versicherungsgruppen...")
    gesetzlich, created = InsuranceProviderGroup.objects.get_or_create(
        name="Gesetzliche Krankenkassen"
    )
    if created:
        gesetzlich.description = "Alle gesetzlichen Krankenkassen (GKV) mit einheitlichen Preisen"
        gesetzlich.save()
    
    privat, created = InsuranceProviderGroup.objects.get_or_create(
        name="Private Krankenversicherungen"
    )
    if created:
        privat.description = "Private Krankenversicherungen mit individuellen Tarifen"
        privat.save()
    
    bg_unfall, created = InsuranceProviderGroup.objects.get_or_create(
        name="Berufsgenossenschaften & Unfallkassen"
    )
    if created:
        bg_unfall.description = "BG und Unfallkassen (DGUV) - keine Zuzahlung"
        bg_unfall.save()
    
    postbeamte, created = InsuranceProviderGroup.objects.get_or_create(
        name="Postbeamtenkrankenkasse"
    )
    if created:
        postbeamte.description = "Postbeamtenkrankenkasse - A- und B-Versicherte"
        postbeamte.save()
    
    # 2. Krankenkassen erstellen
    print("2. Erstelle Krankenkassen...")
    kassen = []
    
    # Gesetzliche Krankenkassen (GKV) - Hauptgruppe für Abrechnung
    aok, created = InsuranceProvider.objects.get_or_create(
        name="AOK NordWest",
        provider_id="AOK002",
        group=gesetzlich
    )
    kassen.append(aok)
    
    barmer, created = InsuranceProvider.objects.get_or_create(
        name="Barmer",
        provider_id="BAR002",
        group=gesetzlich
    )
    kassen.append(barmer)
    
    tk, created = InsuranceProvider.objects.get_or_create(
        name="Techniker Krankenkasse",
        provider_id="TK002",
        group=gesetzlich
    )
    kassen.append(tk)
    
    daek, created = InsuranceProvider.objects.get_or_create(
        name="DAK-Gesundheit",
        provider_id="DAK002",
        group=gesetzlich
    )
    kassen.append(daek)
    
    ikk, created = InsuranceProvider.objects.get_or_create(
        name="IKK classic",
        provider_id="IKK002",
        group=gesetzlich
    )
    kassen.append(ikk)
    
    # Berufsgenossenschaften & Unfallkassen (DGUV)
    bg_gesundheit, created = InsuranceProvider.objects.get_or_create(
        name="BG für Gesundheit und Wohlfahrtspflege",
        provider_id="BGW001",
        group=bg_unfall
    )
    kassen.append(bg_gesundheit)
    
    uk_nord, created = InsuranceProvider.objects.get_or_create(
        name="Unfallkasse Nord",
        provider_id="UKN001",
        group=bg_unfall
    )
    kassen.append(uk_nord)
    
    # Postbeamtenkrankenkasse
    postbeamten_kk, created = InsuranceProvider.objects.get_or_create(
        name="Postbeamtenkrankenkasse",
        provider_id="PBK001",
        group=postbeamte
    )
    kassen.append(postbeamten_kk)
    
    # Private Krankenversicherungen
    allianz, created = InsuranceProvider.objects.get_or_create(
        name="Allianz Private Krankenversicherung",
        provider_id="ALL002",
        group=privat
    )
    kassen.append(allianz)
    
    # 3. Behandlungen erstellen (mit korrekten GKV-Preisen 2023)
    print("3. Erstelle Behandlungen mit GKV-Preisen 2023...")
    treatments = []
    
    # Krankengymnastik (X0501) - 26,12€
    physio_kg, created = Treatment.objects.get_or_create(
        treatment_name="Krankengymnastik"
    )
    if created:
        physio_kg.description = "Krankengymnastik: Einzelbehandlung nach Heilmittelkatalog"
        physio_kg.duration_minutes = 20
        physio_kg.is_self_pay = False
        physio_kg.accounting_code = "050"
        physio_kg.tariff_indicator = "01"
        physio_kg.prescription_type_indicator = "VKZ 10"
        physio_kg.is_telemedicine = False
        physio_kg.legs_code = f"{physio_kg.accounting_code}.{physio_kg.tariff_indicator}"
        physio_kg.save()
    if created:
        physio_kg.legs_code = f"{physio_kg.accounting_code}.{physio_kg.tariff_indicator}"
        physio_kg.save()
    treatments.append(physio_kg)
    
    # Krankengymnastik Telemedizin (X0521) - 26,12€
    physio_kg_tele, created = Treatment.objects.get_or_create(
        treatment_name="Krankengymnastik Telemedizin",
        description="Krankengymnastik: Einzelbehandlung als telemedizinische Leistung",
        duration_minutes=20,
        is_self_pay=False,
        accounting_code="052",
        tariff_indicator="21",
        prescription_type_indicator="VKZ 20",
        is_telemedicine=True
    )
    if created:
        physio_kg_tele.legs_code = f"{physio_kg_tele.accounting_code}.{physio_kg_tele.tariff_indicator}"
        physio_kg_tele.save()
    treatments.append(physio_kg_tele)
    
    # Manuelle Therapie (X1201) - 31,37€
    manuelle_therapie, created = Treatment.objects.get_or_create(
        treatment_name="Manuelle Therapie",
        description="Manuelle Therapie nach Heilmittelkatalog",
        duration_minutes=20,
        is_self_pay=False,
        accounting_code="120",
        tariff_indicator="01",
        prescription_type_indicator="VKZ 10",
        is_telemedicine=False
    )
    if created:
        manuelle_therapie.legs_code = f"{manuelle_therapie.accounting_code}.{manuelle_therapie.tariff_indicator}"
        manuelle_therapie.save()
    treatments.append(manuelle_therapie)
    
    # Manuelle Therapie Telemedizin (X1221) - 31,37€
    manuelle_therapie_tele, created = Treatment.objects.get_or_create(
        treatment_name="Manuelle Therapie Telemedizin",
        description="Manuelle Therapie als telemedizinische Leistung",
        duration_minutes=20,
        is_self_pay=False,
        accounting_code="122",
        tariff_indicator="21",
        prescription_type_indicator="VKZ 20",
        is_telemedicine=True
    )
    if created:
        manuelle_therapie_tele.legs_code = f"{manuelle_therapie_tele.accounting_code}.{manuelle_therapie_tele.tariff_indicator}"
        manuelle_therapie_tele.save()
    treatments.append(manuelle_therapie_tele)
    
    # Klassische Massage (X0106) - 19,06€
    klassische_massage, created = Treatment.objects.get_or_create(
        treatment_name="Klassische Massage",
        description="Klassische Massagetherapie (KMT) nach Heilmittelkatalog",
        duration_minutes=20,
        is_self_pay=False,
        accounting_code="010",
        tariff_indicator="06",
        prescription_type_indicator="VKZ 10",
        is_telemedicine=False
    )
    if created:
        klassische_massage.legs_code = f"{klassische_massage.accounting_code}.{klassische_massage.tariff_indicator}"
        klassische_massage.save()
    treatments.append(klassische_massage)
    
    # Bindegewebsmassage (X0107) - 22,90€
    bindegewebsmassage, created = Treatment.objects.get_or_create(
        treatment_name="Bindegewebsmassage",
        description="Bindegewebsmassage (BGM) nach Heilmittelkatalog",
        duration_minutes=20,
        is_self_pay=False,
        accounting_code="010",
        tariff_indicator="07",
        prescription_type_indicator="VKZ 10",
        is_telemedicine=False
    )
    if created:
        bindegewebsmassage.legs_code = f"{bindegewebsmassage.accounting_code}.{bindegewebsmassage.tariff_indicator}"
        bindegewebsmassage.save()
    treatments.append(bindegewebsmassage)
    
    # Manuelle Lymphdrainage 45min (X0201) - 47,54€
    mld_45, created = Treatment.objects.get_or_create(
        treatment_name="Manuelle Lymphdrainage 45min",
        description="Manuelle Lymphdrainage MLD - 45 Minuten (Großbehandlung)",
        duration_minutes=45,
        is_self_pay=False,
        accounting_code="020",
        tariff_indicator="01",
        prescription_type_indicator="VKZ 10",
        is_telemedicine=False
    )
    if created:
        mld_45.legs_code = f"{mld_45.accounting_code}.{mld_45.tariff_indicator}"
        mld_45.save()
    treatments.append(mld_45)
    
    # Manuelle Lymphdrainage 60min (X0202) - 63,40€
    mld_60, created = Treatment.objects.get_or_create(
        treatment_name="Manuelle Lymphdrainage 60min",
        description="Manuelle Lymphdrainage MLD - 60 Minuten (Ganzbehandlung)",
        duration_minutes=60,
        is_self_pay=False,
        accounting_code="020",
        tariff_indicator="02",
        prescription_type_indicator="VKZ 10",
        is_telemedicine=False
    )
    if created:
        mld_60.legs_code = f"{mld_60.accounting_code}.{mld_60.tariff_indicator}"
        mld_60.save()
    treatments.append(mld_60)
    
    # KG Atmungsorgane (X0702) - 78,38€
    kg_atmung, created = Treatment.objects.get_or_create(
        treatment_name="KG Atmungsorgane",
        description="KG zur Behandlung schwerer Erkrankungen der Atmungsorgane",
        duration_minutes=30,
        is_self_pay=False,
        accounting_code="070",
        tariff_indicator="02",
        prescription_type_indicator="VKZ 10",
        is_telemedicine=False
    )
    if created:
        kg_atmung.legs_code = f"{kg_atmung.accounting_code}.{kg_atmung.tariff_indicator}"
        kg_atmung.save()
    treatments.append(kg_atmung)
    
    # KG-ZNS Bobath Kinder (X0708) - 51,85€
    kg_bobath_kinder, created = Treatment.objects.get_or_create(
        treatment_name="KG-ZNS Bobath Kinder",
        description="KG-ZNS-Kinder nach Bobath",
        duration_minutes=30,
        is_self_pay=False,
        accounting_code="070",
        tariff_indicator="08",
        prescription_type_indicator="VKZ 10",
        is_telemedicine=False
    )
    if created:
        kg_bobath_kinder.legs_code = f"{kg_bobath_kinder.accounting_code}.{kg_bobath_kinder.tariff_indicator}"
        kg_bobath_kinder.save()
    treatments.append(kg_bobath_kinder)
    
    # KG-ZNS Bobath Erwachsene (X0710) - 41,48€
    kg_bobath_erwachsene, created = Treatment.objects.get_or_create(
        treatment_name="KG-ZNS Bobath Erwachsene",
        description="KG-ZNS nach Bobath",
        duration_minutes=25,
        is_self_pay=False,
        accounting_code="071",
        tariff_indicator="10",
        prescription_type_indicator="VKZ 10",
        is_telemedicine=False
    )
    if created:
        kg_bobath_erwachsene.legs_code = f"{kg_bobath_erwachsene.accounting_code}.{kg_bobath_erwachsene.tariff_indicator}"
        kg_bobath_erwachsene.save()
    treatments.append(kg_bobath_erwachsene)
    
    # Elektrotherapie (X1302) - 7,43€
    elektrotherapie, created = Treatment.objects.get_or_create(
        treatment_name="Elektrotherapie",
        description="Elektrotherapie nach Heilmittelkatalog",
        duration_minutes=15,
        is_self_pay=False,
        accounting_code="130",
        tariff_indicator="02",
        prescription_type_indicator="VKZ 10",
        is_telemedicine=False
    )
    if created:
        elektrotherapie.legs_code = f"{elektrotherapie.accounting_code}.{elektrotherapie.tariff_indicator}"
        elektrotherapie.save()
    treatments.append(elektrotherapie)
    
    # Warmpackung (X1501) - 14,24€
    warmpackung, created = Treatment.objects.get_or_create(
        treatment_name="Warmpackung",
        description="Warmpackung nach Heilmittelkatalog",
        duration_minutes=20,
        is_self_pay=False,
        accounting_code="150",
        tariff_indicator="01",
        prescription_type_indicator="VKZ 10",
        is_telemedicine=False
    )
    if created:
        warmpackung.legs_code = f"{warmpackung.accounting_code}.{warmpackung.tariff_indicator}"
        warmpackung.save()
    treatments.append(warmpackung)
    
    # Übungsbehandlung Einzel (X0301) - 12,06€
    uebung_einzel, created = Treatment.objects.get_or_create(
        treatment_name="Übungsbehandlung Einzel",
        description="Übungsbehandlung: Einzelbehandlung",
        duration_minutes=15,
        is_self_pay=False,
        accounting_code="030",
        tariff_indicator="01",
        prescription_type_indicator="VKZ 10",
        is_telemedicine=False
    )
    if created:
        uebung_einzel.legs_code = f"{uebung_einzel.accounting_code}.{uebung_einzel.tariff_indicator}"
        uebung_einzel.save()
    treatments.append(uebung_einzel)
    
    # Selbstzahler-Behandlungen
    wellness_massage, created = Treatment.objects.get_or_create(
        treatment_name="Wellness-Massage",
        description="Entspannende Wellness-Massage (Selbstzahler)",
        duration_minutes=60,
        is_self_pay=True,
        self_pay_price=Decimal('45.00'),
        accounting_code=None,
        tariff_indicator=None,
        prescription_type_indicator=None,
        is_telemedicine=False
    )
    treatments.append(wellness_massage)
    
    # 4. Preiskonfigurationen erstellen (GKV-Preise 2025)
    print("4. Erstelle Preiskonfigurationen mit GKV-Preisen 2025...")
    
    # GKV-Preise 2025 (ab 01.07.2025) - 4,01% Erhöhung gegenüber 2023
    # Quelle: https://thevea.de/praxis-wissen/preisliste-zuzahlung-physiotherapie/
    gkv_prices_2025 = {
        physio_kg: Decimal('27.17'),  # X0501 (26.12€ + 4.01%)
        physio_kg_tele: Decimal('27.17'),  # X0521 (26.12€ + 4.01%)
        manuelle_therapie: Decimal('32.63'),  # X1201 (31.37€ + 4.01%)
        manuelle_therapie_tele: Decimal('32.63'),  # X1221 (31.37€ + 4.01%)
        klassische_massage: Decimal('19.82'),  # X0106 (19.06€ + 4.01%)
        bindegewebsmassage: Decimal('23.82'),  # X0107 (22.90€ + 4.01%)
        mld_45: Decimal('49.45'),  # X0201 (47.54€ + 4.01%)
        mld_60: Decimal('65.94'),  # X0202 (63.40€ + 4.01%)
        kg_atmung: Decimal('81.52'),  # X0702 (78.38€ + 4.01%)
        kg_bobath_kinder: Decimal('53.93'),  # X0708 (51.85€ + 4.01%)
        kg_bobath_erwachsene: Decimal('43.14'),  # X0710 (41.48€ + 4.01%)
        elektrotherapie: Decimal('7.73'),  # X1302 (7.43€ + 4.01%)
        warmpackung: Decimal('14.81'),  # X1501 (14.24€ + 4.01%)
        uebung_einzel: Decimal('12.54'),  # X0301 (12.06€ + 4.01%)
    }
    
    # Private Krankenversicherung Preise (höhere Sätze)
    privat_prices = {
        physio_kg: Decimal('35.00'),
        physio_kg_tele: Decimal('35.00'),
        manuelle_therapie: Decimal('45.00'),
        manuelle_therapie_tele: Decimal('45.00'),
        klassische_massage: Decimal('30.00'),
        bindegewebsmassage: Decimal('35.00'),
        mld_45: Decimal('65.00'),
        mld_60: Decimal('85.00'),
        kg_atmung: Decimal('95.00'),
        kg_bobath_kinder: Decimal('70.00'),
        kg_bobath_erwachsene: Decimal('60.00'),
        elektrotherapie: Decimal('15.00'),
        warmpackung: Decimal('25.00'),
        uebung_einzel: Decimal('20.00'),
    }
    
    # Erstelle Surcharges für gesetzliche Krankenkassen (GKV 2025)
    for treatment, kk_price in gkv_prices_2025.items():
        Surcharge.objects.get_or_create(
            treatment=treatment,
            insurance_provider_group=gesetzlich,
            insurance_payment=kk_price,
            patient_payment=Decimal('0.00'),  # Zuzahlung wird separat berechnet
            valid_from=date(2025, 7, 1),  # Gültig ab 01.07.2025
            valid_until=date(2026, 12, 31)
        )
    
    # Erstelle Surcharges für private Krankenversicherungen
    for treatment, kk_price in privat_prices.items():
        Surcharge.objects.get_or_create(
            treatment=treatment,
            insurance_provider_group=privat,
            insurance_payment=kk_price,
            patient_payment=Decimal('0.00'),
            valid_from=date(2024, 1, 1),
            valid_until=date(2025, 12, 31)
        )
    
    # Erstelle Surcharges für BG/Unfallkassen (DGUV) - gleiche Preise wie GKV, aber keine Zuzahlung
    for treatment, kk_price in gkv_prices_2025.items():
        Surcharge.objects.get_or_create(
            treatment=treatment,
            insurance_provider_group=bg_unfall,
            insurance_payment=kk_price,
            patient_payment=Decimal('0.00'),  # Keine Zuzahlung bei BG/Unfallkassen
            valid_from=date(2025, 5, 1),  # Gültig ab 01.05.2025
            valid_until=date(2026, 12, 31)
        )
    
    # Erstelle Surcharges für Postbeamtenkrankenkasse - gleiche Preise wie GKV
    for treatment, kk_price in gkv_prices_2025.items():
        Surcharge.objects.get_or_create(
            treatment=treatment,
            insurance_provider_group=postbeamte,
            insurance_payment=kk_price,
            patient_payment=Decimal('0.00'),  # Keine Zuzahlung bei Postbeamten
            valid_from=date(2025, 7, 1),
            valid_until=date(2026, 12, 31)
        )
    
    # 5. Patienten erstellen
    print("5. Erstelle Patienten...")
    patients_data = [
        # Gesetzlich versicherte Patienten (GKV) - Hauptfokus für Abrechnung
        {
            'first_name': 'Max',
            'last_name': 'Mustermann',
            'dob': date(1980, 1, 1),
            'gender': 'Male',
            'email': 'max.mustermann@example.com',
            'phone_number': '0123456789',
            'street_address': 'Musterstraße 1',
            'city': 'Musterstadt',
            'postal_code': '12345',
            'country': 'Deutschland',
            'insurance': aok,
            'insurance_number': 'AOK001234',
            'is_private': False
        },
        {
            'first_name': 'Anna',
            'last_name': 'Schmidt',
            'dob': date(1975, 5, 15),
            'gender': 'Female',
            'email': 'anna.schmidt@example.com',
            'phone_number': '0123456790',
            'street_address': 'Hauptstraße 42',
            'city': 'Berlin',
            'postal_code': '10115',
            'country': 'Deutschland',
            'insurance': barmer,
            'insurance_number': 'BAR567890',
            'is_private': False
        },
        {
            'first_name': 'Hans',
            'last_name': 'Müller',
            'dob': date(1965, 12, 10),
            'gender': 'Male',
            'email': 'hans.mueller@example.com',
            'phone_number': '0123456791',
            'street_address': 'Bahnhofstraße 7',
            'city': 'Hamburg',
            'postal_code': '20095',
            'country': 'Deutschland',
            'insurance': tk,
            'insurance_number': 'TK123456',
            'is_private': False
        },
        {
            'first_name': 'Peter',
            'last_name': 'Fischer',
            'dob': date(1985, 3, 8),
            'gender': 'Male',
            'email': 'peter.fischer@example.com',
            'phone_number': '0123456792',
            'street_address': 'Kirchstraße 15',
            'city': 'München',
            'postal_code': '80331',
            'country': 'Deutschland',
            'insurance': daek,
            'insurance_number': 'DAK789012',
            'is_private': False
        },
        {
            'first_name': 'Maria',
            'last_name': 'Weber',
            'dob': date(1990, 7, 22),
            'gender': 'Female',
            'email': 'maria.weber@example.com',
            'phone_number': '0123456793',
            'street_address': 'Gartenweg 3',
            'city': 'Köln',
            'postal_code': '50667',
            'country': 'Deutschland',
            'insurance': ikk,
            'insurance_number': 'IKK345678',
            'is_private': False
        },
        # BG/Unfallkassen Patienten
        {
            'first_name': 'Klaus',
            'last_name': 'Schulz',
            'dob': date(1970, 9, 14),
            'gender': 'Male',
            'email': 'klaus.schulz@example.com',
            'phone_number': '0123456794',
            'street_address': 'Industriestraße 25',
            'city': 'Dortmund',
            'postal_code': '44135',
            'country': 'Deutschland',
            'insurance': bg_gesundheit,
            'insurance_number': 'BGW901234',
            'is_private': False
        },
        {
            'first_name': 'Sabine',
            'last_name': 'Klein',
            'dob': date(1982, 11, 5),
            'gender': 'Female',
            'email': 'sabine.klein@example.com',
            'phone_number': '0123456795',
            'street_address': 'Schulstraße 8',
            'city': 'Hannover',
            'postal_code': '30159',
            'country': 'Deutschland',
            'insurance': uk_nord,
            'insurance_number': 'UKN567890',
            'is_private': False
        },
        # Postbeamtenkrankenkasse
        {
            'first_name': 'Thomas',
            'last_name': 'Becker',
            'dob': date(1978, 4, 18),
            'gender': 'Male',
            'email': 'thomas.becker@example.com',
            'phone_number': '0123456796',
            'street_address': 'Poststraße 12',
            'city': 'Bremen',
            'postal_code': '28195',
            'country': 'Deutschland',
            'insurance': postbeamten_kk,
            'insurance_number': 'PBK123789',
            'is_private': False
        },
        {
            'first_name': 'Sabine',
            'last_name': 'Klein',
            'dob': date(1972, 7, 12),
            'gender': 'Female',
            'email': 'sabine.klein@example.com',
            'phone_number': '0123456794',
            'street_address': 'Rosenweg 8',
            'city': 'Frankfurt',
            'postal_code': '60311',
            'country': 'Deutschland',
            'insurance': barmer,
            'insurance_number': 'BAR234567',
            'is_private': False
        },
        {
            'first_name': 'Klaus',
            'last_name': 'Wagner',
            'dob': date(1958, 11, 3),
            'gender': 'Male',
            'email': 'klaus.wagner@example.com',
            'phone_number': '0123456795',
            'street_address': 'Eichenallee 22',
            'city': 'Stuttgart',
            'postal_code': '70173',
            'country': 'Deutschland',
            'insurance': tk,
            'insurance_number': 'TK789012',
            'is_private': False
        },
        {
            'first_name': 'Monika',
            'last_name': 'Schulz',
            'dob': date(1983, 4, 18),
            'gender': 'Female',
            'email': 'monika.schulz@example.com',
            'phone_number': '0123456796',
            'street_address': 'Lindenstraße 5',
            'city': 'Düsseldorf',
            'postal_code': '40213',
            'country': 'Deutschland',
            'insurance': aok,
            'insurance_number': 'AOK567890',
            'is_private': False
        },
        {
            'first_name': 'Thomas',
            'last_name': 'Becker',
            'dob': date(1978, 9, 25),
            'gender': 'Male',
            'email': 'thomas.becker@example.com',
            'phone_number': '0123456797',
            'street_address': 'Kastanienweg 12',
            'city': 'Dortmund',
            'postal_code': '44135',
            'country': 'Deutschland',
            'insurance': barmer,
            'insurance_number': 'BAR345678',
            'is_private': False
        },
        {
            'first_name': 'Petra',
            'last_name': 'Hoffmann',
            'dob': date(1969, 2, 14),
            'gender': 'Female',
            'email': 'petra.hoffmann@example.com',
            'phone_number': '0123456798',
            'street_address': 'Ahornstraße 9',
            'city': 'Essen',
            'postal_code': '45127',
            'country': 'Deutschland',
            'insurance': tk,
            'insurance_number': 'TK456789',
            'is_private': False
        },
        {
            'first_name': 'Wolfgang',
            'last_name': 'Schäfer',
            'dob': date(1955, 6, 30),
            'gender': 'Male',
            'email': 'wolfgang.schaefer@example.com',
            'phone_number': '0123456799',
            'street_address': 'Ulmenweg 16',
            'city': 'Leipzig',
            'postal_code': '04109',
            'country': 'Deutschland',
            'insurance': aok,
            'insurance_number': 'AOK678901',
            'is_private': False
        },
        # Private Patienten (weniger, da nicht Hauptfokus)
        {
            'first_name': 'Maria',
            'last_name': 'Weber',
            'dob': date(1990, 8, 22),
            'gender': 'Female',
            'email': 'maria.weber@example.com',
            'phone_number': '0123456792',
            'street_address': 'Gartenweg 15',
            'city': 'München',
            'postal_code': '80331',
            'country': 'Deutschland',
            'insurance': allianz,
            'insurance_number': 'ALL789012',
            'is_private': True
        },
        {
            'first_name': 'Stefan',
            'last_name': 'Krause',
            'dob': date(1987, 12, 5),
            'gender': 'Male',
            'email': 'stefan.krause@example.com',
            'phone_number': '0123456800',
            'street_address': 'Villa Rosa 3',
            'city': 'Hamburg',
            'postal_code': '20354',
            'country': 'Deutschland',
            'insurance': allianz,
            'insurance_number': 'ALL123456',
            'is_private': True
        }
    ]
    
    patients = []
    for patient_data in patients_data:
        patient, created = Patient.objects.get_or_create(
            first_name=patient_data['first_name'],
            last_name=patient_data['last_name'],
            defaults={
                "dob": patient_data['dob'],
                "gender": patient_data['gender'],
                "email": patient_data['email'],
                "phone_number": patient_data['phone_number'],
                "street_address": patient_data['street_address'],
                "city": patient_data['city'],
                "postal_code": patient_data['postal_code'],
                "country": patient_data['country']
            }
        )
        
        # Versicherung erstellen
        PatientInsurance.objects.get_or_create(
            patient=patient,
            insurance_provider=patient_data['insurance'],
            insurance_number=patient_data['insurance_number'],
            valid_from=date(2024, 1, 1),
            valid_to=date(2025, 12, 31),
            is_private=patient_data['is_private']
        )
        
        patients.append(patient)
    
    # 6. Behandler und Räume erstellen
    print("6. Erstelle Behandler und Räume...")
    practitioner, created = Practitioner.objects.get_or_create(
        first_name="Dr.",
        last_name="Therapeut",
        email="therapeut@example.com"
    )
    
    # Erstelle zuerst eine Praxis, falls keine existiert
    bundesland, created = Bundesland.objects.get_or_create(
        name="Nordrhein-Westfalen",
        defaults={"abbreviation": "NW"}
    )
    
    practice, created = Practice.objects.get_or_create(
        name="Testpraxis",
        defaults={
            "owner_name": "Dr. Test",
            "bundesland": bundesland,
            "street_address": "Teststraße 1",
            "postal_code": "12345",
            "city": "Teststadt",
            "phone": "0123456789",
            "email": "test@example.com",
            "opening_hours": {
                "monday": {"start": "08:00", "end": "18:00"},
                "tuesday": {"start": "08:00", "end": "18:00"},
                "wednesday": {"start": "08:00", "end": "18:00"},
                "thursday": {"start": "08:00", "end": "18:00"},
                "friday": {"start": "08:00", "end": "18:00"},
                "saturday": {"start": "08:00", "end": "12:00"},
                "sunday": {"start": "00:00", "end": "00:00"}
            }
        }
    )
    
    room, created = Room.objects.get_or_create(
        name="Behandlungsraum 1",
        description="Standard Behandlungsraum",
        practice=practice,
        is_active=True,
        defaults={
            "opening_hours": {
                "monday": {"start": "08:00", "end": "18:00"},
                "tuesday": {"start": "08:00", "end": "18:00"},
                "wednesday": {"start": "08:00", "end": "18:00"},
                "thursday": {"start": "08:00", "end": "18:00"},
                "friday": {"start": "08:00", "end": "18:00"},
                "saturday": {"start": "08:00", "end": "12:00"},
                "sunday": {"start": "00:00", "end": "00:00"}
            }
        }
    )
    
    # 7. ICD-Codes erstellen
    print("7. Erstelle ICD-Codes...")
    icd_codes = [
        {
            'code': 'M79.3',
            'title': 'Schmerzen in der Hand',
            'description': 'Schmerzen in der Hand, nicht näher bezeichnet'
        },
        {
            'code': 'M54.5',
            'title': 'Schmerzen im unteren Rückenbereich',
            'description': 'Schmerzen im unteren Rückenbereich'
        },
        {
            'code': 'M25.5',
            'title': 'Schmerzen im Gelenk',
            'description': 'Schmerzen im Gelenk, nicht näher bezeichnet'
        },
        {
            'code': 'M79.4',
            'title': 'Schmerzen in der Extremität',
            'description': 'Schmerzen in der Extremität, nicht näher bezeichnet'
        },
        {
            'code': 'M51.1',
            'title': 'Lumbale und andere Bandscheibenschäden',
            'description': 'Lumbale und andere Bandscheibenschäden mit Radikulopathie'
        }
    ]
    
    created_icd_codes = []
    for icd_data in icd_codes:
        icd_code, created = ICDCode.objects.get_or_create(
            code=icd_data['code'],
            defaults={
                "title": icd_data['title'],
                "description": icd_data['description']
            }
        )
        created_icd_codes.append(icd_code)
    
    # 8. Arzt erstellen
    doctor, created = Doctor.objects.get_or_create(
        license_number="TEST001",
        defaults={
            "first_name": "Dr.",
            "last_name": "Testarzt",
            "email": "testarzt@example.com",
            "phone_number": "0123456789"
        }
    )
    
    # 9. Verordnungen erstellen
    print("8. Erstelle Verordnungen...")
    prescriptions = []
    
    # Realistische Verordnungsdaten für GKV-Patienten
    gkv_prescriptions_data = [
        {
            'patient_name': 'Max Mustermann',
            'treatment': physio_kg,
            'icd_code': 'M54.5',
            'sessions': 10,
            'frequency': 'weekly_2',
            'therapy_goals': 'Schmerzlinderung und Verbesserung der Beweglichkeit im unteren Rückenbereich'
        },
        {
            'patient_name': 'Anna Schmidt',
            'treatment': manuelle_therapie,
            'icd_code': 'M79.3',
            'sessions': 8,
            'frequency': 'weekly_2',
            'therapy_goals': 'Behandlung von Schmerzen in der Hand nach Überlastung'
        },
        {
            'patient_name': 'Hans Müller',
            'treatment': physio_kg,
            'icd_code': 'M51.1',
            'sessions': 12,
            'frequency': 'weekly_3',
            'therapy_goals': 'Intensive Behandlung bei Bandscheibenvorfall mit Radikulopathie'
        },
        {
            'patient_name': 'Peter Fischer',
            'treatment': klassische_massage,
            'icd_code': 'M79.4',
            'sessions': 6,
            'frequency': 'weekly_1',
            'therapy_goals': 'Entspannung und Durchblutungsförderung bei Muskelschmerzen'
        },
        {
            'patient_name': 'Sabine Klein',
            'treatment': elektrotherapie,
            'icd_code': 'M25.5',
            'sessions': 8,
            'frequency': 'weekly_2',
            'therapy_goals': 'Schmerztherapie bei Gelenkbeschwerden'
        },
        {
            'patient_name': 'Klaus Wagner',
            'treatment': physio_kg,
            'icd_code': 'M54.5',
            'sessions': 15,
            'frequency': 'weekly_3',
            'therapy_goals': 'Langzeittherapie bei chronischen Rückenschmerzen'
        },
        {
            'patient_name': 'Monika Schulz',
            'treatment': warmpackung,
            'icd_code': 'M79.4',
            'sessions': 5,
            'frequency': 'weekly_1',
            'therapy_goals': 'Wärmetherapie zur Schmerzlinderung'
        },
        {
            'patient_name': 'Thomas Becker',
            'treatment': manuelle_therapie,
            'icd_code': 'M79.3',
            'sessions': 10,
            'frequency': 'weekly_2',
            'therapy_goals': 'Manuelle Therapie bei Handgelenksbeschwerden'
        },
        {
            'patient_name': 'Petra Hoffmann',
            'treatment': physio_kg,
            'icd_code': 'M51.1',
            'sessions': 12,
            'frequency': 'weekly_3',
            'therapy_goals': 'Komplexe Behandlung bei Bandscheibenproblemen'
        },
        {
            'patient_name': 'Wolfgang Schäfer',
            'treatment': klassische_massage,
            'icd_code': 'M79.4',
            'sessions': 8,
            'frequency': 'weekly_2',
            'therapy_goals': 'Massage zur Lockerung verspannter Muskulatur'
        }
    ]
    
    # Erstelle Verordnungen für GKV-Patienten
    for prescription_data in gkv_prescriptions_data:
        patient = Patient.objects.filter(
            first_name=prescription_data['patient_name'].split()[0],
            last_name=prescription_data['patient_name'].split()[1]
        ).first()
        
        if patient:
            patient_insurance = patient.insurances.filter(
                valid_from__lte=date.today(),
                valid_to__gte=date.today(),
                is_private=False  # Nur GKV-Patienten
            ).first()
            
            if patient_insurance:
                icd_code = ICDCode.objects.filter(code=prescription_data['icd_code']).first()
                
                if icd_code:
                    # Prüfe ob bereits eine Verordnung existiert
                    existing_prescription = Prescription.objects.filter(
                        patient=patient,
                        treatment_1=prescription_data['treatment'],
                        patient_insurance=patient_insurance
                    ).first()
                    
                    if existing_prescription:
                        prescription = existing_prescription
                        print(f"  - Bestehende GKV-Verordnung gefunden für {patient}")
                    else:
                        # Erstelle neue GKV-Verordnung
                        prescription = Prescription.objects.create(
                            patient=patient,
                            treatment_1=prescription_data['treatment'],
                            patient_insurance=patient_insurance,
                            doctor=doctor,
                            diagnosis_code=icd_code,
                            diagnosis_text=f"Diagnose: {icd_code.title}",
                            number_of_sessions=prescription_data['sessions'],
                            therapy_frequency_type=prescription_data['frequency'],
                            therapy_goals=prescription_data['therapy_goals'],
                            status="Open",
                            prescription_date=date.today() - timedelta(days=random.randint(0, 30))
                        )
                        print(f"  - Neue GKV-Verordnung erstellt für {patient}: {prescription_data['treatment'].treatment_name}")
                    
                    prescriptions.append(prescription)
    
    # Erstelle auch einige Verordnungen für private Patienten
    for patient in patients:
        patient_insurance = patient.insurances.filter(
            valid_from__lte=date.today(),
            valid_to__gte=date.today(),
            is_private=True  # Nur private Patienten
        ).first()
        
        if patient_insurance:
            # Wähle zufällige Behandlung und ICD-Code für private Patienten
            treatment = random.choice([physio_kg, manuelle_therapie, klassische_massage])
            icd_code = random.choice(created_icd_codes)
            
            # Prüfe ob bereits eine Verordnung existiert
            existing_prescription = Prescription.objects.filter(
                patient=patient,
                treatment_1=treatment,
                patient_insurance=patient_insurance
            ).first()
            
            if existing_prescription:
                prescription = existing_prescription
                print(f"  - Bestehende private Verordnung gefunden für {patient}")
            else:
                # Erstelle neue private Verordnung
                prescription = Prescription.objects.create(
                    patient=patient,
                    treatment_1=treatment,
                    patient_insurance=patient_insurance,
                    doctor=doctor,
                    diagnosis_code=icd_code,
                    diagnosis_text=f"Diagnose: {icd_code.title}",
                    number_of_sessions=random.randint(6, 12),
                    therapy_frequency_type=random.choice(["weekly_1", "weekly_2"]),
                    therapy_goals="Therapieziele werden individuell angepasst",
                    status="Open",
                    prescription_date=date.today() - timedelta(days=random.randint(0, 30))
                )
                print(f"  - Neue private Verordnung erstellt für {patient}: {treatment.treatment_name}")
            
            prescriptions.append(prescription)
    
    # 10. Termine erstellen
    print("9. Erstelle Termine...")
    start_date = date.today() - timedelta(days=60)
    end_date = date.today()
    
    for prescription in prescriptions:
        # Erstelle 3-8 Termine pro Verordnung
        num_appointments = random.randint(3, 8)
        
        for i in range(num_appointments):
            # Zufälliges Datum in den letzten 60 Tagen
            days_ago = random.randint(0, 60)
            appointment_date = date.today() - timedelta(days=days_ago)
            
            if start_date <= appointment_date <= end_date:
                # Konvertiere date zu datetime
                from datetime import datetime
                hour = random.randint(8, 17)  # 8:00 - 17:00
                minute = random.choice([0, 15, 30, 45])
                appointment_datetime = datetime.combine(appointment_date, datetime.min.time().replace(hour=hour, minute=minute))
                
                appointment, created = Appointment.objects.get_or_create(
                    patient=prescription.patient,
                    prescription=prescription,
                    practitioner=practitioner,
                    treatment=prescription.treatment_1,
                    room=room,
                    appointment_date=appointment_datetime,
                    status='completed',
                    duration_minutes=prescription.treatment_1.duration_minutes
                )
                
                if created:
                    print(f"  - Termin erstellt: {prescription.patient} am {appointment_date} - {prescription.treatment_1.treatment_name}")
    
    print("\n✅ Erweiterte Testdaten erfolgreich erstellt!")
    print(f"  - {len(patients)} Patienten")
    print(f"  - {len(kassen)} Krankenkassen")
    print(f"  - {len(treatments)} Behandlungen")
    print(f"  - {len(prescriptions)} Verordnungen")
    print(f"  - {Appointment.objects.count()} Termine")
    print(f"  - {Surcharge.objects.count()} Preiskonfigurationen")
    print(f"  - {len(created_icd_codes)} ICD-Codes")

if __name__ == "__main__":
    create_test_data() 