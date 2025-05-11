import { useNavigate } from 'react-router-dom';
import { Button } from '@mui/material';

function Logout() {
  const navigate = useNavigate();

  const handleLogout = () => {
    // Token und andere Daten entfernen
    localStorage.clear();
    
    // Zur Login-Seite navigieren und History zurücksetzen
    navigate('/login', { replace: true });
    
    // Falls die Navigation nicht funktioniert, verwenden wir window.location
    setTimeout(() => {
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }, 100);
  };

  return (
    <Button 
      onClick={handleLogout}
      color="inherit"
    >
      Logout
    </Button>
  );
}

export default Logout;
