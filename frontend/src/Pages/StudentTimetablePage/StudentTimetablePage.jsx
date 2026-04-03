import React, { useState } from "react";
import StudentLayout from "../../Components/StudentLayout/StudentLayout";
import StudentTimetable from "../../Components/StudentTimetable/StudentTimetable";
import styles from "./StudentTimetablePage.module.css";
import jsPDF from "jspdf";
import { getStoredRole } from "../../utils/auth";

const StudentTimetablePage = () => {
  const role = getStoredRole() || "student";
  const [view, setView] = useState("week"); // "day" or "week"
  const [selectedDay, setSelectedDay] = useState("Mon");
  const [dateRange, setDateRange] = useState({ from: "", to: "" });

  const exportPDF = () => {
    const doc = new jsPDF();
    const table = document.getElementById("timetable-table");
    doc.html(table, {
      callback: function (doc) {
        doc.save("timetable.pdf");
      },
      x: 10,
      y: 10,
      html2canvas: { scale: 0.5 },
    });
  };

  return (
    <StudentLayout title="Student Timetable" role={role}>
      <h2 className={styles.pageTitle}>Student Timetable</h2>
      <p className={styles.pageSubtitle}>Manage your class schedule efficiently</p>

      {/* Controls */}
      <div className={styles.controls}>
        <div className={styles.viewToggle}>
          <button
            className={view === "day" ? styles.active : ""}
            onClick={() => setView("day")}
          >
            Daily
          </button>
          <button
            className={view === "week" ? styles.active : ""}
            onClick={() => setView("week")}
          >
            Weekly
          </button>
        </div>

        {view === "day" && (
          <select
            value={selectedDay}
            onChange={(e) => setSelectedDay(e.target.value)}
          >
            <option value="Mon">Monday</option>
            <option value="Tue">Tuesday</option>
            <option value="Wed">Wednesday</option>
            <option value="Thu">Thursday</option>
            <option value="Fri">Friday</option>
          </select>
        )}

        <div className={styles.dateRange}>
          <input
            type="date"
            value={dateRange.from}
            onChange={(e) =>
              setDateRange({ ...dateRange, from: e.target.value })
            }
          />
          <span>to</span>
          <input
            type="date"
            value={dateRange.to}
            onChange={(e) =>
              setDateRange({ ...dateRange, to: e.target.value })
            }
          />
        </div>

        <button onClick={exportPDF} className={styles.exportBtn}>
          Export PDF
        </button>
      </div>

      <StudentTimetable view={view} selectedDay={selectedDay} />
    </StudentLayout>
  );
};

export default StudentTimetablePage;
