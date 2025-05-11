import React from 'react';
import { 
    Grid, 
    TextField, 
    Button,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Box
} from '@mui/material';
import { useFormik } from 'formik';
import * as Yup from 'yup';

const PracticeForm = ({ practice, onSubmit }) => {
    const formik = useFormik({
        initialValues: {
            name: practice?.name || '',
            owner_name: practice?.owner_name || '',
            bundesland: practice?.bundesland || '',
            street_address: practice?.street_address || '',
            postal_code: practice?.postal_code || '',
            city: practice?.city || '',
            phone: practice?.phone || '',
            email: practice?.email || '',
            institution_code: practice?.institution_code || '',
            tax_id: practice?.tax_id || ''
        },
        validationSchema: Yup.object({
            name: Yup.string().required('Erforderlich'),
            owner_name: Yup.string().required('Erforderlich'),
            bundesland: Yup.string().required('Erforderlich'),
            street_address: Yup.string().required('Erforderlich'),
            postal_code: Yup.string().required('Erforderlich'),
            city: Yup.string().required('Erforderlich'),
            phone: Yup.string().required('Erforderlich'),
            email: Yup.string().email('Ungültige E-Mail').required('Erforderlich'),
            institution_code: Yup.string().required('Erforderlich'),
            tax_id: Yup.string().required('Erforderlich')
        }),
        onSubmit: values => {
            onSubmit(values);
        },
    });

    return (
        <form onSubmit={formik.handleSubmit}>
            <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                    <TextField
                        fullWidth
                        label="Praxisname"
                        {...formik.getFieldProps('name')}
                        error={formik.touched.name && Boolean(formik.errors.name)}
                        helperText={formik.touched.name && formik.errors.name}
                    />
                </Grid>
                <Grid item xs={12} md={6}>
                    <TextField
                        fullWidth
                        label="Inhaber"
                        {...formik.getFieldProps('owner_name')}
                        error={formik.touched.owner_name && Boolean(formik.errors.owner_name)}
                        helperText={formik.touched.owner_name && formik.errors.owner_name}
                    />
                </Grid>
                <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                        <InputLabel>Bundesland</InputLabel>
                        <Select
                            {...formik.getFieldProps('bundesland')}
                            error={formik.touched.bundesland && Boolean(formik.errors.bundesland)}
                            label="Bundesland"
                        >
                            <MenuItem value="BW">Baden-Württemberg</MenuItem>
                            <MenuItem value="BY">Bayern</MenuItem>
                            <MenuItem value="BE">Berlin</MenuItem>
                            <MenuItem value="BB">Brandenburg</MenuItem>
                            <MenuItem value="HB">Bremen</MenuItem>
                            <MenuItem value="HH">Hamburg</MenuItem>
                            <MenuItem value="HE">Hessen</MenuItem>
                            <MenuItem value="MV">Mecklenburg-Vorpommern</MenuItem>
                            <MenuItem value="NI">Niedersachsen</MenuItem>
                            <MenuItem value="NW">Nordrhein-Westfalen</MenuItem>
                            <MenuItem value="RP">Rheinland-Pfalz</MenuItem>
                            <MenuItem value="SL">Saarland</MenuItem>
                            <MenuItem value="SN">Sachsen</MenuItem>
                            <MenuItem value="ST">Sachsen-Anhalt</MenuItem>
                            <MenuItem value="SH">Schleswig-Holstein</MenuItem>
                            <MenuItem value="TH">Thüringen</MenuItem>
                        </Select>
                    </FormControl>
                </Grid>
                <Grid item xs={12} md={6}>
                    <TextField
                        fullWidth
                        label="Straße"
                        {...formik.getFieldProps('street_address')}
                        error={formik.touched.street_address && Boolean(formik.errors.street_address)}
                        helperText={formik.touched.street_address && formik.errors.street_address}
                    />
                </Grid>
                <Grid item xs={12} md={6}>
                    <TextField
                        fullWidth
                        label="PLZ"
                        {...formik.getFieldProps('postal_code')}
                        error={formik.touched.postal_code && Boolean(formik.errors.postal_code)}
                        helperText={formik.touched.postal_code && formik.errors.postal_code}
                    />
                </Grid>
                <Grid item xs={12} md={6}>
                    <TextField
                        fullWidth
                        label="Stadt"
                        {...formik.getFieldProps('city')}
                        error={formik.touched.city && Boolean(formik.errors.city)}
                        helperText={formik.touched.city && formik.errors.city}
                    />
                </Grid>
                <Grid item xs={12} md={6}>
                    <TextField
                        fullWidth
                        label="Telefon"
                        {...formik.getFieldProps('phone')}
                        error={formik.touched.phone && Boolean(formik.errors.phone)}
                        helperText={formik.touched.phone && formik.errors.phone}
                    />
                </Grid>
                <Grid item xs={12} md={6}>
                    <TextField
                        fullWidth
                        label="E-Mail"
                        type="email"
                        {...formik.getFieldProps('email')}
                        error={formik.touched.email && Boolean(formik.errors.email)}
                        helperText={formik.touched.email && formik.errors.email}
                    />
                </Grid>
                <Grid item xs={12} md={6}>
                    <TextField
                        fullWidth
                        label="Betriebsstättennummer"
                        {...formik.getFieldProps('institution_code')}
                        error={formik.touched.institution_code && Boolean(formik.errors.institution_code)}
                        helperText={formik.touched.institution_code && formik.errors.institution_code}
                    />
                </Grid>
                <Grid item xs={12} md={6}>
                    <TextField
                        fullWidth
                        label="Steuernummer"
                        {...formik.getFieldProps('tax_id')}
                        error={formik.touched.tax_id && Boolean(formik.errors.tax_id)}
                        helperText={formik.touched.tax_id && formik.errors.tax_id}
                    />
                </Grid>
                <Grid item xs={12}>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                        <Button 
                            type="submit" 
                            variant="contained" 
                            color="primary"
                        >
                            Speichern
                        </Button>
                    </Box>
                </Grid>
            </Grid>
        </form>
    );
};

export default PracticeForm; 