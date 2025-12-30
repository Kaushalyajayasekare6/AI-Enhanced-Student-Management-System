import React from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line, Legend } from "recharts";
import Sidebar from "../../Components/Sidebar/Sidebar";
import Header from "../../Components/Header/Header";
import styles from "./StudentOverviewPage.module.css";

// Mock student data
const student = {
  enrolment: "STU2025-001",
  name: "John Doe",
  age: 15,
  class: "10-A",
  bcNumber: "BC123456",
  teacher: "Mrs. Silva",
  attendance: [
    { month: "Jan", percent: 90 },
    { month: "Feb", percent: 85 },
    { month: "Mar", percent: 95 },
    { month: "Apr", percent: 88 },
    { month: "May", percent: 92 },
  ],
  marks: {
    1: [
      { subject: "Maths", marks: 78 },
      { subject: "Science", marks: 82 },
      { subject: "English", marks: 74 },
    ],
    2: [
      { subject: "Maths", marks: 81 },
      { subject: "Science", marks: 79 },
      { subject: "English", marks: 77 },
    ],
    3: [
      { subject: "Maths", marks: 85 },
      { subject: "Science", marks: 83 },
      { subject: "English", marks: 80 },
    ],
  },
  avgMarks: 80,
  classRank: 8,
  totalStudents: 40,
  dropoutRisk: "Low",
};

const StudentOverviewPage = () => {
  // Prepare marks data for chart
  const chartData = student.marks[1].map((subj, idx) => ({
    subject: subj.subject,
    Term1: subj.marks,
    Term2: student.marks[2][idx]?.marks,
    Term3: student.marks[3][idx]?.marks,
  }));

  return (
    <div className={styles.page}>
      <Sidebar />
      <main className={styles.main}>
        <Header title="Student Overview" />

        {/* Student Info Card */}
        <div className={styles.card}>
          <h2>{student.name} — {student.class}</h2>
          <p><b>Enrolment No:</b> {student.enrolment}</p>
          <p><b>Age:</b> {student.age}</p>
          <p><b>BC Number:</b> {student.bcNumber}</p>
          <p><b>Class Teacher:</b> {student.teacher}</p>
        </div>

        {/* Attendance Chart */}
        <div className={styles.card}>
          <h3>Attendance (%)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={student.attendance}>
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="percent" stroke="#2563eb" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Marks Chart */}
        <div className={styles.card}>
          <h3>Marks Comparison (Term-wise)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <XAxis dataKey="subject" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="Term1" fill="#2563eb" />
              <Bar dataKey="Term2" fill="#16a34a" />
              <Bar dataKey="Term3" fill="#f59e0b" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Summary */}
        <div className={styles.summary}>
          <div className={styles.stat}>
            <h4>Average Marks</h4>
            <p>{student.avgMarks}%</p>
          </div>
          <div className={styles.stat}>
            <h4>Class Rank</h4>
            <p>{student.classRank}/{student.totalStudents}</p>
          </div>
          <div className={styles.stat}>
            <h4>Dropout Risk</h4>
            <p className={`${styles.risk} ${styles[student.dropoutRisk.toLowerCase()]}`}>
              {student.dropoutRisk}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default StudentOverviewPage;
