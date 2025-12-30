import React from "react";
import styles from "./StudentForm.module.css";

const StudentForm = ({ student = {}, role }) => {
  return (
    <section className={styles.formSection}>
      <h3>Student Information</h3>
      <form className={styles.form}>
        <div className={styles.row}>
          <input type="text" placeholder="Enrollment No" value={student.enrollmentNo || ""} disabled />
          <input type="text" placeholder="BC No" value={student.bcNumber || ""} disabled />
        </div>
        <div className={styles.row}>
          <input type="text" placeholder="Full Name" value={student.fullName || ""} disabled />
        </div>
        <div className={styles.row}>
          <input type="text" placeholder="Contact No" value={student.contactNumber || ""} disabled={role !== "admin"} />
          <input type="date" placeholder="Date of Birth" value={student.dob || ""} disabled />
        </div>
        <div className={styles.row}>
          <input type="text" placeholder="Grade" value={student.grade || ""} disabled />
          <input type="text" placeholder="Address" value={student.address || ""} disabled={role !== "admin"} />
        </div>
      </form>
    </section>
  );
};

export default StudentForm;
