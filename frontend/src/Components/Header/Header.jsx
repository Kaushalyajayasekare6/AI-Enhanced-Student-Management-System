import React from "react";
import { useNavigate } from "react-router-dom";
import styles from "./Header.module.css";
import { clearAuth, getStoredUsername } from "../../utils/auth";

const Header = ({ title }) => {
  const navigate = useNavigate();
  const username = getStoredUsername();

  const handleLogout = () => {
    clearAuth();
    navigate("/login");
  };

  return (
    <header className={styles.header}>
      <div className={styles.breadcrumb}>
        {title || "Dashboard"}
        {username && ` — ${username}`}
      </div>
      <button className={styles.logout} onClick={handleLogout}>
        Logout →
      </button>
    </header>
  );
};

export default Header;
