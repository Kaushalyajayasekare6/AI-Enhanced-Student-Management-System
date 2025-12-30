import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import styles from "./Role.module.css";
import { API_ENDPOINTS } from "../../config/api";
import { setAuth } from "../../utils/auth";

const Role = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const selectedRole = location.state?.role;

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!selectedRole) {
      setError("Role not found! Please select role again.");
      setTimeout(() => navigate("/login"), 2000);
      return;
    }

    if (!username.trim() || !password.trim()) {
      setError("Please fill in all fields");
      return;
    }

    try {
      setLoading(true);
      const res = await axios.post(API_ENDPOINTS.AUTH.LOGIN, {
        username: username.trim(),
        password,
        role: selectedRole,
      });

      if (res.data.token && res.data.role) {
        setAuth(res.data.token, res.data.role, username.trim());
        
        // Navigate based on role
        const dashboardRoutes = {
          student: "/StudentDashboard",
          teacher: "/TeacherDashboard",
          admin: "/AdminDashboard",
        };
        
        navigate(dashboardRoutes[selectedRole] || "/login");
      } else {
        setError("Invalid response from server");
      }
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || "Login failed. Please try again.";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.loginCard}>
        <h1 className={styles.title}>
          {selectedRole ? selectedRole.toUpperCase() : "Unknown Role"} Login
        </h1>
        <p className={styles.subtitle}>
          Enter your username and password to continue
        </p>

        <form className={styles.loginForm} onSubmit={handleSubmit}>
          <div className={styles.inputGroup}>
            <label className={styles.label}>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={styles.input}
              required
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={styles.input}
              required
            />
          </div>

          {error && (
            <div className={styles.errorMessage}>
              {error}
            </div>
          )}

          <button type="submit" className={styles.loginButton} disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <p className={styles.notice}>
          Forgot password? Contact your administrator.
        </p>
      </div>
    </div>
  );
};

export default Role;
