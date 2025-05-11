import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import DashboardLayout from './components/DashboardLayout';
import Home from './components/Home';
import Calendar from './components/Calendar';
import PatientList from './components/PatientList';
import PatientDetail from './components/PatientDetail'; 
import PrescriptionList from './components/PrescriptionList';
import InsuranceManagement from './components/InsuranceManagement';
import Settings from './components/Settings';
import TreatmentList from './components/TreatmentList';
import PrescriptionDetail from './components/PrescriptionDetail'; 
import TreatmentDetail from './components/TreatmentDetail';
import PrivateRoute from './components/PrivateRoute'; // Import PrivateRoute
import Login from './components/Login';
import NewAppointment from './components/AppointmentsNew'; 
import PatientNew from './components/PatientNew';
import PrescriptionNew from './components/PrescriptionNew';
import TreatmentNew from './components/TreatmentNew';
import AnalysisTabs from './components/AnalysisTabs';
import DataOverview from './components/DataOverview';
import PatientAnalysis from './components/PatientAnalysis';
import AppointmentDetail from './components/AppointmentDetail';
import BillingCycleList from './components/BillingCycleList';
import BillingCycleNew from './components/BillingCycleNew';
import InsuranceProviderList from './components/InsuranceProviderList';
import InsuranceProviderDetail from './components/InsuranceProviderDetail';
import InsuranceProviderNew from './components/InsuranceProviderNew';
import InsuranceProviderEdit from './components/InsuranceProviderEdit';
import InsuranceGroupList from './components/InsuranceGroupList';
import InsuranceGroupNew from './components/InsuranceGroupNew';
import InsuranceGroupEdit from './components/InsuranceGroupEdit';
import PrescriptionEdit from './components/PrescriptionEdit';
import Profile from './components/Profile';
import ProfileEdit from './components/ProfileEdit';
import AppointmentList from './components/AppointmentList';
import TreatmentEdit from './components/TreatmentEdit';
import InsuranceGroupDetail from './components/InsuranceGroupDetail';
import Register from './components/Register';
import AppointmentSeries from './components/AppointmentSeries';
import AppointmentSeriesForm from './components/AppointmentSeriesForm';
import PracticeDetail from './components/PracticeDetail';
import CategoryDetail from './components/CategoryDetail';
import SpecializationDetail from './components/SpecializationDetail';
import ICDCodeDetail from './components/ICDCodeDetail';
import DiagnosisGroupDetail from './components/DiagnosisGroupDetail';
import BillingCycleDetail from './components/BillingCycleDetail';
import SurchargeDetail from './components/SurchargeDetail';
import EmergencyContactDetail from './components/EmergencyContactDetail';
import PracticeSettingsDetail from './components/PracticeSettingsDetail';
import CalendarSettingsDetail from './components/CalendarSettingsDetail';
import BundeslandDetail from './components/BundeslandDetail';
import LocalHolidayDetail from './components/LocalHolidayDetail';
import WorkingHourDetail from './components/WorkingHourDetail';
import CategoryNew from './components/CategoryNew';
import SpecializationNew from './components/SpecializationNew';
import ICDCodeNew from './components/ICDCodeNew';
import DiagnosisGroupNew from './components/DiagnosisGroupNew';
import SurchargeNew from './components/SurchargeNew';
import EmergencyContactNew from './components/EmergencyContactNew';
import BundeslandNew from './components/BundeslandNew';
import LocalHolidayNew from './components/LocalHolidayNew';
import WorkingHourNew from './components/WorkingHourNew';
import CategoryEdit from './components/CategoryEdit';
import SpecializationEdit from './components/SpecializationEdit';
import ICDCodeEdit from './components/ICDCodeEdit';
import DiagnosisGroupEdit from './components/DiagnosisGroupEdit';
import SurchargeEdit from './components/SurchargeEdit';
import EmergencyContactEdit from './components/EmergencyContactEdit';
import BundeslandEdit from './components/BundeslandEdit';
import LocalHolidayEdit from './components/LocalHolidayEdit';
import WorkingHourEdit from './components/WorkingHourEdit';
import DoctorNew from './components/DoctorNew';
import DoctorDetail from './components/DoctorDetail';
import BulkBillingForm from './components/BulkBillingForm';
import FinanceOverview from './components/FinanceOverview';
import PatientEdit from './components/PatientEdit';


function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<PrivateRoute><DashboardLayout /></PrivateRoute>}>
          <Route path="/" element={<Home />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/patients" element={<PatientList />} />
          <Route path="/patients/:id" element={<PatientDetail />} />
          <Route path="/prescriptions" element={<PrescriptionList />} />
          <Route path="/insurance-management" element={<InsuranceManagement />} />
          <Route path="/insurance-providers" element={<InsuranceProviderList />} />
          <Route path="/insurance-providers/new" element={<InsuranceProviderNew />} />
          <Route path="/insurance-providers/:id" element={<InsuranceProviderDetail />} />
          <Route path="/insurance-providers/:id/edit" element={<InsuranceProviderEdit />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/treatments" element={<TreatmentList />} />
          <Route path="/treatments/new" element={<TreatmentNew />} />
          <Route path="/treatments/:id" element={<TreatmentDetail />} />
          <Route path="/treatments/:id/edit" element={<TreatmentEdit />} />
          <Route path="/appointments/new" element={<NewAppointment />} />
          <Route path="/appointments/:id" element={<AppointmentDetail />} />
          <Route path="/appointments" element={<AppointmentList />} />
          <Route path="/prescriptions/:id" element={<PrescriptionDetail />} />
          <Route path="/patients/new" element={<PatientNew />} />
          <Route path="/prescriptions/new" element={<PrivateRoute><PrescriptionNew /></PrivateRoute>} />
          <Route path="/analysis" element={<AnalysisTabs />} />
          <Route path="/dataoverview" element={<DataOverview />} />
          <Route path="/patient-analysis" element={<PatientAnalysis />} />
          <Route path="/finance" element={<FinanceOverview />} />
          <Route path="/prescriptions/:id/edit" element={<PrescriptionEdit />} />
          <Route path="/billing-cycles" element={<BillingCycleList />} />
          <Route path="/billing-cycles/new" element={<BillingCycleNew />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/profile/edit" element={<ProfileEdit />} />
          <Route path="/insurance-groups" element={<InsuranceGroupList />} />
          <Route path="/insurance-groups/new" element={<InsuranceGroupNew />} />
          <Route path="/insurance-groups/:id" element={<InsuranceGroupDetail />} />
          <Route path="/insurance-groups/:id/edit" element={<InsuranceGroupEdit />} />
          <Route path="/practice" element={<PracticeDetail />} />
          <Route path="/categories/:id" element={<CategoryDetail />} />
          <Route path="/specializations/:id" element={<SpecializationDetail />} />
          <Route path="/icdcodes/:id" element={<ICDCodeDetail />} />
          <Route path="/diagnosis-groups/:id" element={<DiagnosisGroupDetail />} />
          <Route path="/billing-cycles/:id" element={<BillingCycleDetail />} />
          <Route path="/surcharges/:id" element={<SurchargeDetail />} />
          <Route path="/emergency-contacts/:id" element={<EmergencyContactDetail />} />
          <Route path="/practice-settings/:id" element={<PracticeSettingsDetail />} />
          <Route path="/calendar-settings/:id" element={<CalendarSettingsDetail />} />
          <Route path="/bundesland/:id" element={<BundeslandDetail />} />
          <Route path="/local-holidays/:id" element={<LocalHolidayDetail />} />
          <Route path="/working-hours/:id" element={<WorkingHourDetail />} />
          <Route path="/categories/new" element={<CategoryNew />} />
          <Route path="/specializations/new" element={<SpecializationNew />} />
          <Route path="/icdcodes/new" element={<ICDCodeNew />} />
          <Route path="/diagnosis-groups/new" element={<DiagnosisGroupNew />} />
          <Route path="/surcharges/new" element={<SurchargeNew />} />
          <Route path="/emergency-contacts/new" element={<EmergencyContactNew />} />
          <Route path="/bundesland/new" element={<BundeslandNew />} />
          <Route path="/local-holidays/new" element={<LocalHolidayNew />} />
          <Route path="/working-hours/new" element={<WorkingHourNew />} />
          <Route path="/categories/:id/edit" element={<CategoryEdit />} />
          <Route path="/specializations/:id/edit" element={<SpecializationEdit />} />
          <Route path="/icdcodes/:id/edit" element={<ICDCodeEdit />} />
          <Route path="/diagnosis-groups/:id/edit" element={<DiagnosisGroupEdit />} />
          <Route path="/surcharges/:id/edit" element={<SurchargeEdit />} />
          <Route path="/emergency-contacts/:id/edit" element={<EmergencyContactEdit />} />
          <Route path="/bundesland/:id/edit" element={<BundeslandEdit />} />
          <Route path="/local-holidays/:id/edit" element={<LocalHolidayEdit />} />
          <Route path="/working-hours/:id/edit" element={<WorkingHourEdit />} />
          <Route path="/patients/:id/edit" element={<PatientEdit />} />
        </Route>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/appointments/series/new" element={
          <PrivateRoute>
            <AppointmentSeries />
          </PrivateRoute>
        } />
        <Route path="/appointments/create_series" element={<AppointmentSeriesForm />} />
        <Route path="/doctors/new" element={<DoctorNew />} />
        <Route path="/doctors/:id" element={<DoctorDetail />} />
        <Route path="/billing-cycles/bulk" element={<BulkBillingForm />} />
      </Routes>
    </Router>
  );
}

export default App;
