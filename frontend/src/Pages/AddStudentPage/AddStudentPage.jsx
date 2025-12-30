import React from "react";
import { useLocation } from "react-router-dom";
import Sidebar from "../../Components/Sidebar/Sidebar";
import Header from "../../Components/Header/Header";
import AddStudentForm from "../../Components/AddStudentForm/AddStudentForm";
import styles from "./AddStudentPage.module.css";
import { getStoredRole } from "../../utils/auth";

const AddStudentPage = () => {
  const location = useLocation();
  const { student, mode = "add", role } = location.state || {};
  const userRole = getStoredRole() || role || "admin";

  return (
    <div className={styles.dashboard}>
      <Sidebar role={userRole} />
      <div className={styles.content}>
        <Header />
        <h2 className={styles.pageTitle}>
          {mode === "add" && "Add New Student"}
          {mode === "edit" && "Edit Student"}
          {mode === "view" && "View Student"}
        </h2>
        <AddStudentForm student={student} mode={mode} role={role} />
      </div>
    </div>
  );
};

export default AddStudentPage;
