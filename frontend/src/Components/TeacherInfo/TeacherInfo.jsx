import React from "react";
import styles from "./TeacherInfo.module.css";

const teacherData = {
  name: "Mr. Dinesh Perera",
  email: "dinesh.perera@classschool.com",
  phone: "+94 77 123 4567",
  role: "Class Teacher of Grade 10",
  department: "Mathematics"
};

const TeacherInfo = () => {
  return (
    <div className={styles.card}>
      <h2>Personal Details</h2>
      <div className={styles.info}>
        <span className={styles.label}>Name:</span>
        <span className={styles.value}>{teacherData.name}</span>
      </div>
      <div className={styles.info}>
        <span className={styles.label}>Email:</span>
        <span className={styles.value}>{teacherData.email}</span>
      </div>
      <div className={styles.info}>
        <span className={styles.label}>Phone:</span>
        <span className={styles.value}>{teacherData.phone}</span>
      </div>
      <div className={styles.info}>
        <span className={styles.label}>Role:</span>
        <span className={styles.value}>{teacherData.role}</span>
      </div>
      <div className={styles.info}>
        <span className={styles.label}>Department:</span>
        <span className={styles.value}>{teacherData.department}</span>
      </div>
    </div>
  );
};

export default TeacherInfo;
