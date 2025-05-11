from django import forms
from .models import Patient, PatientInvoice

class PatientInvoiceForm(forms.ModelForm):
    patient = forms.ModelChoiceField(queryset=Patient.objects.all())
    start_date = forms.DateField(widget=forms.DateInput(attrs={'type': 'date'}))
    end_date = forms.DateField(widget=forms.DateInput(attrs={'type': 'date'}))

    class Meta:
        model = PatientInvoice
        fields = ['patient', 'start_date', 'end_date']

    def clean(self):
        cleaned_data = super().clean()
        start_date = cleaned_data.get('start_date')
        end_date = cleaned_data.get('end_date')

        if start_date and end_date and start_date > end_date:
            raise forms.ValidationError("Das Startdatum muss vor dem Enddatum liegen.")

        return cleaned_data 