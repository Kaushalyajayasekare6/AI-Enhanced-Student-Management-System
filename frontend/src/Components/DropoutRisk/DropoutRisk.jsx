import React from "react";
import styles from "./DropoutRisk.module.css";

// Dummy student data
const studentData = {
  name: "John Doe",
  attendance: 78, // %
  averageMarks: 65, // 0-100
  weakSubjects: ["Maths", "Science", "Physics"],
  classTeacher: "Mrs. Kumari",
  teacherEmail: "kumari@classschool.com"
};

// Function to calculate dropout risk
const getRiskLevel = (attendance, marks) => {
  const score = (attendance * 0.5) + (marks * 0.5);
  if (score >= 75) return { level: "Low Risk", color: "#22c55e", gradient: "linear-gradient(90deg,#22c55e,#16a34a)" };
  if (score >= 60) return { level: "Moderate Risk", color: "#facc15", gradient: "linear-gradient(90deg,#facc15,#ca8a04)" };
  if (score >= 45) return { level: "High Risk", color: "#f97316", gradient: "linear-gradient(90deg,#f97316,#c2410c)" };
  return { level: "Critical Risk", color: "#ef4444", gradient: "linear-gradient(90deg,#ef4444,#b91c1c)" };
};

const DropoutRisk = () => {
  const risk = getRiskLevel(studentData.attendance, studentData.averageMarks);

  return (
    <div className={styles.container}>
      <h2 className={styles.heading}>Hello, {studentData.name}</h2>

      <div className={styles.cardsWrapper}>
        {/* Attendance Card */}
        <div className={styles.card}>
          <h3>Attendance</h3>
          <div className={styles.progressBar}>
            <div
              className={styles.progress}
              style={{ width: `${studentData.attendance}%` }}
              title={`${studentData.attendance}% attendance`}
            />
          </div>
          <span className={styles.progressLabel}>{studentData.attendance}%</span>
        </div>

        {/* Dropout Risk Card */}
        <div className={styles.card}>
          <h3>Dropout Risk Level</h3>
          <div
            className={styles.riskLevel}
            style={{ background: risk.gradient }}
          >
            {risk.level}
          </div>
        </div>

        {/* Weak Subjects Card */}
        <div className={styles.card}>
          <h3>Weak Subjects</h3>
          <div className={styles.subjectsWrapper}>
            {studentData.weakSubjects.map((subj, idx) => (
              <span key={idx} className={styles.subjectChip}>{subj}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Contact Button */}
      <button
        className={styles.contactBtn}
        onClick={() =>
          window.location.href = `mailto:${studentData.teacherEmail}?subject=Dropout%20Risk%20Inquiry`
        }
      >
        Contact Class Teacher
      </button>
    </div>
  );
};

export default DropoutRisk;
