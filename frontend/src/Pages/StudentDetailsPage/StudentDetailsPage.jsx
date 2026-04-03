import React, { useState } from "react";
import { useLocation } from "react-router-dom";
import Sidebar from "../../Components/Sidebar/Sidebar";
import Header from "../../Components/Header/Header";
import styles from "./StudentDetailsPage.module.css";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";

const StudentDetailsPage = () => {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState("personal");

  const studentFromState = location.state?.student;

  const student = studentFromState ? {
    enrollmentNo: studentFromState.enrollmentNo || `ST-${studentFromState.id || "unknown"}`,
    firstName: studentFromState.firstName || studentFromState.name || "Unknown",
    lastName: studentFromState.lastName || "",
    grade: studentFromState.grade || "N/A",
    dropoutRisk: studentFromState.riskLevel || "N/A",
    attendance: {
      totalDays: studentFromState.attendance || "N/A",
      attended: "N/A",
      percentage: studentFromState.attendance || "N/A",
    },
    academic: {
      subjects: {},
      average: studentFromState.avgMarks || "N/A",
      rank: "N/A",
    },
    parents: {
      father: { name: "N/A", contact: "N/A" },
      mother: { name: "N/A", contact: "N/A" },
    },
    ...studentFromState,
  } : {
    enrollmentNo: "ST12345",
    firstName: "Kasun",
    lastName: "Perera",
    gender: "Male",
    dob: "2007-05-12",
    bcNumber: "BC78945",
    enrollmentDate: "2020-01-05",
    grade: "10A",
    contact: "0771234567",
    email: "kasun@example.com",
    address: "123 Main Street, Colombo",
    district: "Colombo",
    pincode: "00500",
    username: "kasunp",
    parents: {
      father: { name: "Mr. Perera", contact: "0779876543" },
      mother: { name: "Mrs. Perera", contact: "0712345678" },
    },
    academic: {
      subjects: {
        Maths: [65, 72, 68],
        Science: [55, 62, 58],
        English: [70, 74, 72],
        History: [50, 45, 60],
        ICT: [80, 85, 82],
      },
      average: 65,
      rank: 12,
    },
    attendance: {
      totalDays: 180,
      attended: 150,
      percentage: 83,
    },
    dropoutRisk: "Medium",
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "personal":
        return (
          <div className={styles.section}>
            <h2>👤 Personal Information</h2>
            <div className={styles.infoGrid}>
              <p><b>Enrollment No:</b> {student.enrollmentNo}</p>
              <p><b>Name:</b> {student.firstName} {student.lastName}</p>
              <p><b>Gender:</b> {student.gender}</p>
              <p><b>Date of Birth:</b> {student.dob}</p>
              <p><b>Grade:</b> {student.grade}</p>
              <p><b>BC Number:</b> {student.bcNumber}</p>
              <p><b>Enrollment Date:</b> {student.enrollmentDate}</p>
            </div>
          </div>
        );
      case "academic":
        return (
          <div className={styles.section}>
            <h2>📚 Academic Performance</h2>
            
            {/* Marks Pattern Line Chart */}
            <div className={styles.chartContainer}>
              <h3>Subject Marks Trend</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={[
                  { term: "Term 1", ...Object.fromEntries(Object.entries(student.academic.subjects).map(([subj, marks]) => [subj, marks[0]])) },
                  { term: "Term 2", ...Object.fromEntries(Object.entries(student.academic.subjects).map(([subj, marks]) => [subj, marks[1]])) },
                  { term: "Term 3", ...Object.fromEntries(Object.entries(student.academic.subjects).map(([subj, marks]) => [subj, marks[2]])) },
                ]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="term" stroke="#6b7280" />
                  <YAxis stroke="#6b7280" domain={[0, 100]} />
                  <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px" }} />
                  <Legend />
                  {Object.keys(student.academic.subjects).map((subject, idx) => (
                    <Line key={subject} type="monotone" dataKey={subject} stroke={["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6"][idx % 5]} strokeWidth={2} dot={{ fill: ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6"][idx % 5], r: 4 }} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Subject Performance Radar */}
            <div className={styles.chartContainer}>
              <h3>Subject Performance Radar</h3>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={Object.entries(student.academic.subjects).map(([subj, marks]) => ({ subject: subj, value: Math.round((marks[0] + marks[1] + marks[2]) / 3) }))}>
                  <PolarGrid stroke="#e5e7eb" />
                  <PolarAngleAxis dataKey="subject" stroke="#6b7280" />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} stroke="#6b7280" />
                  <Radar name="Average Score" dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* Subject Marks Table */}
            <div className={styles.tableWrapper}>
              <h3>Detailed Marks</h3>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Subject</th>
                    <th>Term 1</th>
                    <th>Term 2</th>
                    <th>Term 3</th>
                    <th>Average</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(student.academic.subjects).map(([subject, marks]) => (
                    <tr key={subject}>
                      <td>{subject}</td>
                      {marks.map((m, i) => (
                        <td key={i}>{m}</td>
                      ))}
                      <td><b>{Math.round((marks[0] + marks[1] + marks[2]) / 3)}</b></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className={styles.statsRow}>
              <div className={styles.stat}>
                <span className={styles.label}>Total Average:</span>
                <span className={styles.value}>{student.academic.average}%</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.label}>Rank in Class:</span>
                <span className={styles.value}>#{student.academic.rank}</span>
              </div>
            </div>
          </div>
        );
      case "dropout":
        return (
          <div className={styles.section}>
            <h2>📉 Dropout Risk</h2>
            <p>
              Current Risk Level:{" "}
              <span
                className={`${styles.riskBadge} ${styles[student.dropoutRisk.toLowerCase()]}`}
              >
                {student.dropoutRisk}
              </span>
            </p>
          </div>
        );
      case "attendance":
        return (
          <div className={styles.section}>
            <h2>🗓 Attendance Record</h2>
            
            <div className={styles.chartContainer}>
              <h3>Attendance Overview</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={[{ name: "Attended", value: student.attendance.attended || 0 }, { name: "Absent", value: (student.attendance.totalDays || 0) - (student.attendance.attended || 0) }]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" stroke="#6b7280" />
                  <YAxis stroke="#6b7280" />
                  <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px" }} />
                  <Bar dataKey="value" fill="#10b981" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <div className={styles.label}>Total School Days</div>
                <div className={styles.bigValue}>{student.attendance.totalDays}</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.label}>Days Attended</div>
                <div className={styles.bigValue}>{student.attendance.attended}</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.label}>Attendance %</div>
                <div className={`${styles.bigValue} ${student.attendance.percentage >= 80 ? styles.good : student.attendance.percentage >= 60 ? styles.warning : styles.danger}`}>
                  {student.attendance.percentage}%
                </div>
              </div>
            </div>

            <div className={styles.progressBar}>
              <div className={styles.progressFill} style={{ width: `${student.attendance.percentage}%`, background: student.attendance.percentage >= 80 ? "#10b981" : student.attendance.percentage >= 60 ? "#f59e0b" : "#ef4444" }}></div>
            </div>
            <p style={{ fontSize: "12px", color: "#6b7280", marginTop: "8px" }}>
              {student.attendance.percentage >= 80 ? "✅ Good attendance" : student.attendance.percentage >= 60 ? "⚠️ Needs improvement" : "❌ Critical - Below 60%"}
            </p>
          </div>
        );
      case "assignments":
        return (
          <div className={styles.section}>
            <h2>📋 Assignments & Tasks</h2>
            
            <div className={styles.assignmentsList}>
              <div className={styles.assignmentCard}>
                <div className={styles.assignmentHeader}>
                  <span className={styles.assignmentTitle}>Maths Project - Algebra</span>
                  <span className={`${styles.badge} ${styles.completed}`}>✓ Completed</span>
                </div>
                <p>Submitted on: 2024-03-20</p>
                <p>Score: 18/20</p>
              </div>

              <div className={styles.assignmentCard}>
                <div className={styles.assignmentHeader}>
                  <span className={styles.assignmentTitle}>Science Practical Report</span>
                  <span className={`${styles.badge} ${styles.completed}`}>✓ Completed</span>
                </div>
                <p>Submitted on: 2024-03-18</p>
                <p>Score: 16/20</p>
              </div>

              <div className={styles.assignmentCard}>
                <div className={styles.assignmentHeader}>
                  <span className={styles.assignmentTitle}>English Essay - Literature</span>
                  <span className={`${styles.badge} ${styles.pending}`}>⏱ Pending</span>
                </div>
                <p>Due Date: 2024-03-30</p>
                <p className={styles.daysLeft}>⚠️ 4 days remaining</p>
              </div>

              <div className={styles.assignmentCard}>
                <div className={styles.assignmentHeader}>
                  <span className={styles.assignmentTitle}>History Group Project</span>
                  <span className={`${styles.badge} ${styles.overdue}`}>✗ Overdue</span>
                </div>
                <p>Due Date: 2024-03-15</p>
                <p className={styles.daysOverdue}>❌ 11 days overdue</p>
              </div>
            </div>

            <div className={styles.assignmentStats}>
              <div className={styles.stat}>
                <span className={styles.label}>Total Assignments:</span>
                <span className={styles.value}>24</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.label}>Completed:</span>
                <span className={`${styles.value} ${styles.good}`}>18</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.label}>Pending:</span>
                <span className={`${styles.value} ${styles.warning}`}>4</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.label}>Overdue:</span>
                <span className={`${styles.value} ${styles.danger}`}>2</span>
              </div>
            </div>
          </div>
        );
      case "parents":
        return (
          <div className={styles.section}>
            <h2>👪 Parent Information</h2>
            <p><b>Father:</b> {student.parents.father.name} ({student.parents.father.contact})</p>
            <p><b>Mother:</b> {student.parents.mother.name} ({student.parents.mother.contact})</p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className={styles.dashboard}>
      <Sidebar activePage="studentdetails" />
      <main className={styles.main}>
        <Header />
        <h1 className={styles.pageTitle}>Student Details</h1>
        <p className={styles.pageSubtitle}>Full profile and academic overview</p>

        {/* Navigation Tabs */}
        <div className={styles.navbar}>
          <button
            onClick={() => setActiveTab("personal")}
            className={activeTab === "personal" ? styles.active : ""}
          >
            Personal
          </button>
          <button
            onClick={() => setActiveTab("academic")}
            className={activeTab === "academic" ? styles.active : ""}
          >
            Academic
          </button>
          <button
            onClick={() => setActiveTab("dropout")}
            className={activeTab === "dropout" ? styles.active : ""}
          >
            Dropout Risk
          </button>
          <button
            onClick={() => setActiveTab("attendance")}
            className={activeTab === "attendance" ? styles.active : ""}
          >
            Attendance
          </button>
          <button
            onClick={() => setActiveTab("assignments")}
            className={activeTab === "assignments" ? styles.active : ""}
          >
            Assignments
          </button>
          <button
            onClick={() => setActiveTab("parents")}
            className={activeTab === "parents" ? styles.active : ""}
          >
            Parents
          </button>
        </div>

        {/* Tab Content */}
        <div className={styles.content}>{renderTabContent()}</div>
      </main>
    </div>
  );
};

export default StudentDetailsPage;
