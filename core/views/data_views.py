from rest_framework import viewsets
from rest_framework.response import Response
from ..models import DiagnosisGroup, Surcharge, Bundesland, LocalHoliday
from ..serializers import (
    DiagnosisGroupSerializer, 
    SurchargeSerializer,
    BundeslandSerializer,
    LocalHolidaySerializer
)

class DiagnosisGroupViewSet(viewsets.ModelViewSet):
    queryset = DiagnosisGroup.objects.all()
    serializer_class = DiagnosisGroupSerializer

class SurchargeViewSet(viewsets.ModelViewSet):
    queryset = Surcharge.objects.all()
    serializer_class = SurchargeSerializer

class BundeslandViewSet(viewsets.ModelViewSet):
    queryset = Bundesland.objects.all()
    serializer_class = BundeslandSerializer

class LocalHolidayViewSet(viewsets.ModelViewSet):
    queryset = LocalHoliday.objects.all()
    serializer_class = LocalHolidaySerializer 