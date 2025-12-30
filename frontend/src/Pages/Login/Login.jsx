import { useState } from "react";
import { useNavigate } from "react-router-dom"; 
import styles from "./Login.module.css";
import { FaUser, FaChalkboardTeacher, FaUserCog } from "react-icons/fa";

export default function Login() {
  const [selectedRole, setSelectedRole] = useState(null);
  const navigate = useNavigate();

  const roles = [
    { id: "student", label: "Student", icon: <FaUser size={40} /> },
    { id: "teacher", label: "Teacher", icon: <FaChalkboardTeacher size={40} /> },
    { id: "admin", label: "Admin", icon: <FaUserCog size={40} /> },
  ];

  const handleLogin = () => {
    if (selectedRole) {
      navigate("/role", { state: { role: selectedRole } });
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.box}>
        <h1 className={styles.title}>Select Your Role</h1>
        <p className={styles.subtitle}>
          Choose your role to proceed with login
        </p>

        <div className={styles.roles}>
          {roles.map((role) => (
            <button
              key={role.id}
              onClick={() => setSelectedRole(role.id)}
              className={`${styles.roleCard} ${
                selectedRole === role.id ? styles.active : ""
              }`}
            >
              {role.icon}
              <span className={styles.roleLabel}>{role.label}</span>
            </button>
          ))}
        </div>

        <button
          onClick={handleLogin}
          disabled={!selectedRole}
          className={`${styles.loginButton} ${!selectedRole ? styles.disabled : ""}`}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
