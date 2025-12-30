import React from "react";
import styles from "./ParentForm.module.css";

const ParentForm = ({ student = {}, role }) => {
  return (
    <section className={styles.formSection}>
      <h3>Parent Information</h3>
      <form className={styles.form}>
        <div className={styles.row}>
          <input type="text" placeholder="Father Name" value={student.fatherName || ""} disabled />
          <input type="text" placeholder="Father Contact" value={student.fatherContact || ""} disabled />
        </div>
        <div className={styles.row}>
          <input type="text" placeholder="Mother Name" value={student.motherName || ""} disabled />
          <input type="text" placeholder="Mother Contact" value={student.motherContact || ""} disabled />
        </div>
        {role === "student" && (
          <div className={styles.note}>
            * Contact details are read-only. Please contact admin for updates.
          </div>
        )}
      </form>
    </section>
  );
};

export default ParentForm;
