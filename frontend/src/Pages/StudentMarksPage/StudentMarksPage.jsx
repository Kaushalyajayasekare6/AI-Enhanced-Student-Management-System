import React, { useState, useEffect } from "react";
import StudentLayout from "../../Components/StudentLayout/StudentLayout";
import StudentMarks from "../../Components/StudentMarks/StudentMarks";
import styles from "./StudentMarksPage.module.css";
import jsPDF from "jspdf";
import { getStoredRole } from "../../utils/auth";
import axios from "axios";
import { API_ENDPOINTS, getAuthHeaders } from "../../config/api";

const StudentMarksPage = () => {
  const role = getStoredRole() || "student";
  const currentYear = new Date().getFullYear();
  const currentTerm = "2";
  const [view, setView] = useState("term");
  const [year, setYear] = useState(String(currentYear));
  const [term, setTerm] = useState(currentTerm);
  const [searchSubject, setSearchSubject] = useState("");
  const [classRank, setClassRank] = useState({ position: 0, total: 0, category: "N/A" });

  // Fetch class rank from database
  useEffect(() => {
    const fetchClassRank = async () => {
      try {
        // Get current student's marks
        const marksRes = await axios.get(API_ENDPOINTS.MARKS.MY_MARKS, {
          headers: getAuthHeaders(),
        });
        
        const { student, marks } = marksRes.data;
        if (!student || !marks || !Array.isArray(marks)) return;

        // Get student's class info
        const studentRes = await axios.get(API_ENDPOINTS.STUDENTS.ME, {
          headers: getAuthHeaders(),
        });
        
        const studentData = studentRes.data;
        if (!studentData || !studentData.grade || !studentData.section) return;

        // Get all students in the same class
        const classStudentsRes = await axios.get(
          `${API_ENDPOINTS.STUDENTS.BY_CLASS}?grade=${studentData.grade}&section=${studentData.section}`,
          { headers: getAuthHeaders() }
        );

        const classStudents = classStudentsRes.data?.students || [];
        if (classStudents.length === 0) return;

        // Get marks for all students in the class for selected year/term
        const allMarksPromises = classStudents.map(async (s) => {
          try {
            const res = await axios.get(API_ENDPOINTS.MARKS.STUDENT, {
              headers: getAuthHeaders(),
              params: { studentId: s._id, year: Number(year), term: Number(term) },
            });
            return { studentId: s._id, marks: res.data?.marks || [] };
          } catch {
            return { studentId: s._id, marks: [] };
          }
        });

        const allMarksResults = await Promise.all(allMarksPromises);

        // Calculate totals for each student
        const studentTotals = allMarksResults.map(({ studentId, marks: studentMarks }) => {
          const termMarks = studentMarks.find(
            m => m.year === Number(year) && m.term === Number(term)
          );
          if (!termMarks || !termMarks.marks) return { studentId, total: 0 };
          
          const markValues = Object.values(termMarks.marks).filter(
            v => v !== null && v !== undefined
          );
          const total = markValues.reduce((a, b) => a + b, 0);
          return { studentId, total };
        });

        // Sort by total (descending) and find current student's rank
        studentTotals.sort((a, b) => b.total - a.total);
        const currentStudentId = studentData._id || student.id;
        const rankIndex = studentTotals.findIndex(s => String(s.studentId) === String(currentStudentId));
        const position = rankIndex >= 0 ? rankIndex + 1 : 0;
        const total = studentTotals.length;

        // Determine category
        let category = "Average";
        if (position === 1) category = "Top";
        else if (position <= Math.ceil(total * 0.1)) category = "Top 10%";
        else if (position <= Math.ceil(total * 0.25)) category = "Top 25%";
        else if (position >= total - Math.ceil(total * 0.1)) category = "Needs Improvement";

        setClassRank({ position, total, category });
      } catch (err) {
        console.error("Error fetching class rank:", err);
        // Keep default values
      }
    };

    fetchClassRank();
  }, [year, term]);

  const exportPDF = () => {
    const doc = new jsPDF();
    const table = document.getElementById("marks-table");
    if (!table) {
      alert("Nothing to export");
      return;
    }
    doc.html(table, {
      callback: function (doc) {
        doc.save("student_marks.pdf");
      },
      x: 10,
      y: 10,
      html2canvas: { scale: 0.6 },
    });
  };

  // sanitize class rank category into a safe css key
  const categoryClass = classRank?.category
    ? classRank.category.toLowerCase().replace(/[^a-z0-9]+/g, "-")
    : "";

  return (
    <StudentLayout title="Marks & Predictions" role={role}>
      {/* Class rank summary */}
      <div className={`${styles.rankCard} ${styles[categoryClass] || ""}`}>
        Class Rank: <b>{classRank.position}</b> / {classRank.total} —{" "}
        <span>{classRank.category}</span>
      </div>

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.toggle}>
          <button
            className={view === "term" ? styles.active : ""}
            onClick={() => {
              setView("term");
              setYear(String(currentYear));
              setTerm(currentTerm);
            }}
          >
            Term
          </button>
          <button
            className={view === "year" ? styles.active : ""}
              onClick={() => setView("year")}
            >
              Full Year
            </button>
          </div>

          <div className={styles.filters}>
            <select value={year} onChange={(e) => setYear(e.target.value)}>
              <option value="2025">2025</option>
              <option value="2024">2024</option>
              <option value="2023">2023</option>
            </select>

            {view === "term" && (
              <select value={term} onChange={(e) => setTerm(e.target.value)}>
                <option value="1">Term 1</option>
                <option value="2">Term 2</option>
                <option value="3">Term 3</option>
              </select>
            )}

            <input
              placeholder="Search subject"
              value={searchSubject}
              onChange={(e) => setSearchSubject(e.target.value)}
            />
            <button onClick={exportPDF} className={styles.export}>
              Export PDF
            </button>
          </div>
        </div>

        {/* Marks + predictions */}
        <StudentMarks
          view={view}
          year={year}
          term={term}
          searchSubject={searchSubject}
        />
    </StudentLayout>
  );
};

export default StudentMarksPage;
