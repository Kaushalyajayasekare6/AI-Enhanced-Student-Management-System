import React from "react";
import styles from "./TeacherForm.module.css";

// Dummy data for teacher
const teacherData = {
  name: "Mr. Dinesh Perera",
  email: "dinesh.perera@classschool.com",
  phone: "+94 77 123 4567",
  role: "Class Teacher of Grade 10",
  assignedClasses: ["Grade 10A", "Grade 10B"],
  subjects: ["Maths", "Algorithms", "Physics"]
};

const TeacherForm = () => {
  return (
    <div className={styles.formCard}>
      <h2>Teacher Information</h2>
      <div className={styles.infoRow}>
        <strong>Name:</strong> <span>{teacherData.name}</span>
      </div>
      <div className={styles.infoRow}>
        <strong>Email:</strong> <span>{teacherData.email}</span>
      </div>
      <div className={styles.infoRow}>
        <strong>Phone:</strong> <span>{teacherData.phone}</span>
      </div>
      <div className={styles.infoRow}>
        <strong>Role:</strong> <span>{teacherData.role}</span>
      </div>
      <div className={styles.infoRow}>
        <strong>Assigned Classes:</strong>{" "}
        <span>{teacherData.assignedClasses.join(", ")}</span>
      </div>
      <div className={styles.infoRow}>
        <strong>Subjects:</strong>{" "}
        <span>{teacherData.subjects.join(", ")}</span>
      </div>
    </div>
  );
};

export default TeacherForm;
