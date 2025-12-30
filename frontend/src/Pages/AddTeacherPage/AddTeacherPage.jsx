import React from "react";
import Sidebar from "../../Components/Sidebar/Sidebar";
import Header from "../../Components/Header/Header";
import AddTeacherForm from "../../Components/AddTeacherForm/AddTeacherForm";
import styles from "./AddTeacherPage.module.css";

const AddTeacherPage = () => {
  return (
    <div className={styles.dashboard}>
      <Sidebar activePage="dashboard" />
      <div className={styles.content}>
        <Header />
        <AddTeacherForm />
      </div>
    </div>
  );
};

export default AddTeacherPage;
