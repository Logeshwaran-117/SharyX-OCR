// src/components/ProtectedRoute.jsx
import { Navigate } from "react-router-dom";

function ProtectedRoute({ children, isAuthenticated }) {
    // If not authenticated, force redirect to login
    return isAuthenticated ? children : <Navigate to="/login" />;
}

export default ProtectedRoute;