import { Navigate } from "react-router-dom";
import { isAuthenticated, isTokenExpired, clearAuth } from "../../utils/auth";

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  // Check if user is authenticated
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  // Check if token is expired
  if (isTokenExpired()) {
    clearAuth();
    return <Navigate to="/login" replace />;
  }

  // Check role-based access
  const userRole = localStorage.getItem("role");
  if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
    // Redirect to appropriate dashboard based on role
    switch (userRole) {
      case "student":
        return <Navigate to="/StudentDashboard" replace />;
      case "teacher":
        return <Navigate to="/TeacherDashboard" replace />;
      case "admin":
        return <Navigate to="/AdminDashboard" replace />;
      default:
        return <Navigate to="/login" replace />;
    }
  }

  return children;
};

export default ProtectedRoute;




