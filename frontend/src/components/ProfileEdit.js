import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
	Box,
	TextField,
	Button,
	Typography,
	Paper,
	Grid,
	Alert,
	MenuItem,
	FormControl,
	InputLabel,
	Select
} from '@mui/material';
import api from '../api/axios';

const ProfileEdit = () => {
	const navigate = useNavigate();
	const [userData, setUserData] = useState({
		username: '',
		email: '',
		first_name: '',
		last_name: '',
		phone: '',
		address: '',
		city: '',
		postal_code: '',
		country: '',
		date_of_birth: '',
		gender: '',
		title: '',
		position: '',
		department: '',
	});
	const [error, setError] = useState('');
	const [success, setSuccess] = useState('');

	useEffect(() => {
		const fetchUserData = async () => {
			try {
				const response = await api.get('/users/me/');
				setUserData(response.data);
			} catch (error) {
				setError('Fehler beim Laden der Benutzerdaten');
			}
		};
		fetchUserData();
	}, []);

	const handleChange = (e) => {
		const { name, value } = e.target;
		setUserData(prev => ({
			...prev,
			[name]: value
		}));
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		try {
			await api.put('/users/me/', userData);
			setSuccess('Profil erfolgreich aktualisiert');
			setTimeout(() => navigate('/profile'), 2000);
		} catch (error) {
			setError('Fehler beim Aktualisieren des Profils');
		}
	};

	const handleDateChange = (date) => {
		setUserData(prev => ({
			...prev,
			date_of_birth: date ? date.format('YYYY-MM-DD') : null
		}));
	};

	return (
		<Box sx={{ p: 3 }}>
			<Paper sx={{ p: 3 }}>
				<Typography variant="h5" gutterBottom>
					Profil bearbeiten
				</Typography>
				
				{error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
				{success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

				<form onSubmit={handleSubmit}>
					<Grid container spacing={2}>
						<Grid item xs={12} sm={6}>
							<TextField
								fullWidth
								label="Benutzername"
								name="username"
								value={userData.username}
								onChange={handleChange}
								disabled
							/>
						</Grid>
						<Grid item xs={12} sm={6}>
							<FormControl fullWidth>
								<InputLabel>Titel</InputLabel>
								<Select
									name="title"
									value={userData.title || ''}
									onChange={handleChange}
									label="Titel"
								>
									<MenuItem value="">Kein Titel</MenuItem>
									<MenuItem value="Dr.">Dr.</MenuItem>
									<MenuItem value="Prof.">Prof.</MenuItem>
									<MenuItem value="Prof. Dr.">Prof. Dr.</MenuItem>
								</Select>
							</FormControl>
						</Grid>
						<Grid item xs={12} sm={6}>
							<TextField
								fullWidth
								label="Vorname"
								name="first_name"
								value={userData.first_name}
								onChange={handleChange}
							/>
						</Grid>
						<Grid item xs={12} sm={6}>
							<TextField
								fullWidth
								label="Nachname"
								name="last_name"
								value={userData.last_name}
								onChange={handleChange}
							/>
						</Grid>
						<Grid item xs={12}>
							<TextField
								fullWidth
								label="E-Mail"
								name="email"
								type="email"
								value={userData.email}
								onChange={handleChange}
							/>
						</Grid>
						<Grid item xs={12} sm={6}>
							<TextField
								fullWidth
								label="Telefon"
								name="phone"
								value={userData.phone || ''}
								onChange={handleChange}
							/>
						</Grid>
						<Grid item xs={12} sm={6}>
							<FormControl fullWidth>
								<InputLabel>Geschlecht</InputLabel>
								<Select
									name="gender"
									value={userData.gender || ''}
									onChange={handleChange}
									label="Geschlecht"
								>
									<MenuItem value="">Nicht angegeben</MenuItem>
									<MenuItem value="M">Männlich</MenuItem>
									<MenuItem value="F">Weiblich</MenuItem>
									<MenuItem value="D">Divers</MenuItem>
								</Select>
							</FormControl>
						</Grid>
						<Grid item xs={12}>
							<TextField
								fullWidth
								label="Adresse"
								name="address"
								value={userData.address || ''}
								onChange={handleChange}
							/>
						</Grid>
						<Grid item xs={12} sm={6}>
							<TextField
								fullWidth
								label="PLZ"
								name="postal_code"
								value={userData.postal_code || ''}
								onChange={handleChange}
							/>
						</Grid>
						<Grid item xs={12} sm={6}>
							<TextField
								fullWidth
								label="Stadt"
								name="city"
								value={userData.city || ''}
								onChange={handleChange}
							/>
						</Grid>
						<Grid item xs={12}>
							<TextField
								fullWidth
								label="Land"
								name="country"
								value={userData.country || ''}
								onChange={handleChange}
							/>
						</Grid>
						<Grid item xs={12} sm={6}>
							<TextField
								fullWidth
								label="Position"
								name="position"
								value={userData.position || ''}
								onChange={handleChange}
							/>
						</Grid>
						<Grid item xs={12} sm={6}>
							<TextField
								fullWidth
								label="Abteilung"
								name="department"
								value={userData.department || ''}
								onChange={handleChange}
							/>
						</Grid>
						<Grid item xs={12}>
							<Box sx={{ mt: 2 }}>
								<Button
									type="submit"
									variant="contained"
									color="primary"
									sx={{ mr: 2 }}
								>
									Speichern
								</Button>
								<Button
									variant="outlined"
									onClick={() => navigate('/profile')}
								>
									Abbrechen
								</Button>
							</Box>
						</Grid>
					</Grid>
				</form>
			</Paper>
		</Box>
	);
};

export default ProfileEdit; 