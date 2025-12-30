import React, { useState } from "react";
import Sidebar from "../../Components/Sidebar/Sidebar";
import Header from "../../Components/Header/Header";
import styles from "./StudentDetailsPage.module.css";

const StudentDetailsPage = () => {
  const [activeTab, setActiveTab] = useState("personal");

  const student = {
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
            <h2>📚 Academic Results</h2>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Term 1</th>
                  <th>Term 2</th>
                  <th>Term 3</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(student.academic.subjects).map(([subject, marks]) => (
                  <tr key={subject}>
                    <td>{subject}</td>
                    {marks.map((m, i) => (
                      <td key={i}>{m}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <p><b>Total Average:</b> {student.academic.average}%</p>
            <p><b>Rank in Class:</b> #{student.academic.rank}</p>
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
            <h2>🗓 Attendance</h2>
            <p><b>Total Days:</b> {student.attendance.totalDays}</p>
            <p><b>Attended:</b> {student.attendance.attended}</p>
            <p>
              <b>Percentage:</b>{" "}
              <span
                className={`${styles.attendanceBadge} ${
                  student.attendance.percentage < 60
                    ? styles.low
                    : student.attendance.percentage < 80
                    ? styles.medium
                    : styles.high
                }`}
              >
                {student.attendance.percentage}%
              </span>
            </p>
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
