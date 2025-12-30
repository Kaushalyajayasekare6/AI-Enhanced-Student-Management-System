import React from "react";
import styles from "./TeacherClasses.module.css";

const classesData = [
  { className: "Grade 10A", subjects: ["Maths", "Algorithms", "Physics"] },
  { className: "Grade 10B", subjects: ["Maths", "ICT", "Chemistry"] },
  { className: "Grade 11A", subjects: ["Maths", "Biology", "Chemistry"] }
];

const TeacherClasses = () => {
  return (
    <div className={styles.card}>
      <h2>Assigned Classes</h2>
      {classesData.map((cls, idx) => (
        <div key={idx} className={styles.classCard}>
          <h3>{cls.className}</h3>
          <div className={styles.subjects}>
            {cls.subjects.map((subj, subIdx) => (
              <span key={subIdx} className={styles.subjectChip}>{subj}</span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default TeacherClasses;
