import { Navigate, useLocation } from 'react-router-dom';
import { isAuthenticated } from '../services/auth';

function PrivateRoute({ children }) {
  const location = useLocation();

  if (!isAuthenticated()) {
    // Speichert die ursprünglich angeforderte URL für die Weiterleitung nach dem Login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

export default PrivateRoute;
