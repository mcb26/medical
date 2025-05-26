from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from core.services.appointment_series import AppointmentSeriesService

class AppointmentSeriesPreviewView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, prescription_id):
        try:
            config = request.data
            preview_appointments = AppointmentSeriesService.generate_preview(prescription_id, config)
            return Response(preview_appointments)
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            ) 