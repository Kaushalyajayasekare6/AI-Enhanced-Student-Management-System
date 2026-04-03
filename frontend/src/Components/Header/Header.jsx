import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FaBars } from "react-icons/fa";
import styles from "./Header.module.css";
import { clearAuth, getStoredUsername } from "../../utils/auth";
import { useLayout } from "../../contexts/LayoutContext";

const Header = ({ title, showBack = false, onBack }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const username = getStoredUsername();
  const { toggleSidebar, isMobile } = useLayout();

  const handleBack = onBack || (() => navigate(-1));
  const hasBack = showBack || location.state?.from;

  const handleLogout = () => {
    clearAuth();
    navigate("/login");
  };

  return (
    <header className={styles.header}>
      <div className={styles.leftSection}>
        {isMobile && (
          <button className={styles.hamburger} onClick={toggleSidebar}>
            <FaBars />
          </button>
        )}
        {hasBack && (
          <button className={styles.backBtn} onClick={handleBack}>
            ← Back
          </button>
        )}
        <div className={styles.breadcrumb}>
          {title || "Dashboard"}
          {username && ` — ${username}`}
        </div>
      </div>
      <button className={styles.logout} onClick={handleLogout}>
        Logout →
      </button>
    </header>
  );
};

export default Header;
