import React, { useState } from 'react';

function PatientForm() {
  const [patient, setPatient] = useState({
    first_name: '',
    last_name: '',
    email: '',
  });

  return (
    <div>
      <h1>Patient Form</h1>
      {/* Add form elements here */}
      <form>
        <input 
          type="text" 
          value={patient.first_name} 
          onChange={(e) => setPatient({ ...patient, first_name: e.target.value })} 
          placeholder="First Name" 
        />
        {/* Add other form elements */}
      </form>
    </div>
  );
}

export default PatientForm;
