from rest_framework import viewsets
from rest_framework.response import Response
from ..models import DiagnosisGroup, Surcharge, Bundesland
from ..serializers import (
    DiagnosisGroupSerializer, 
    SurchargeSerializer,
    BundeslandSerializer
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