const mockPrescriptions = [
    {
        id: 1,
        patient_name: "Max Mustermann",
        treatment_type: "Physiotherapie",
        status: "Open",
        frequency: "weekly_2",
        start_date: "2024-01-01",
        end_date: "2024-03-01"
    },
    // ... weitere Mock-Daten
];

const mockService = {
    getPrescriptions: async () => ({
        success: true,
        data: mockPrescriptions,
        total: mockPrescriptions.length
    }),
    // ... weitere Mock-Methoden
};

export default mockService; 