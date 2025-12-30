import React, { useState, useEffect } from "react";
import Sidebar from "../../Components/Sidebar/Sidebar";
import Header from "../../Components/Header/Header";
import AdminTimetableForm from "./AdminTimetableForm";
import AdminTimetableAnalytics from "./AdminTimetableAnalytics";
import styles from "./TimetableCreation.module.css";
import { getStoredRole } from "../../utils/auth";
import axios from "axios";
import { API_ENDPOINTS, getAuthHeaders } from "../../config/api";

const AdminTimetablePage = () => {
  const [view, setView] = useState("view"); // view | create | analytics
  const [selectedClass, setSelectedClass] = useState("10A");
  const [selectedGrade, setSelectedGrade] = useState(10);
  const [selectedSection, setSelectedSection] = useState("A");
  const [selectedTerm, setSelectedTerm] = useState(1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [generating, setGenerating] = useState(false);
  const [classes, setClasses] = useState([]);
  const role = getStoredRole() || "admin";

  // Fetch available classes
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const res = await axios.get(API_ENDPOINTS.STUDENTS.BASE, {
          headers: getAuthHeaders(),
        });
        // Extract unique grade-section combinations
        const classSet = new Set();
        res.data.forEach(student => {
          if (student.grade && student.section) {
            classSet.add(`${student.grade}${student.section}`);
          }
        });
        setClasses(Array.from(classSet).sort());
      } catch (err) {
        console.error("Error fetching classes:", err);
      }
    };
    fetchClasses();
  }, []);

  // Parse class selection
  useEffect(() => {
    if (selectedClass) {
      const match = selectedClass.match(/(\d+)([A-Z])/);
      if (match) {
        setSelectedGrade(parseInt(match[1]));
        setSelectedSection(match[2]);
      }
    }
  }, [selectedClass]);

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      await axios.post(
        API_ENDPOINTS.TIMETABLE.GENERATE,
        {
          grade: selectedGrade,
          section: selectedSection,
          term: selectedTerm,
          year: selectedYear,
        },
        { headers: getAuthHeaders() }
      );
      alert("✅ Timetable generated successfully!");
      // Refresh view
      setView("view");
    } catch (err) {
      console.error("Error generating timetable:", err);
      alert("❌ Failed to generate timetable. " + (err.response?.data?.message || err.message));
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className={styles.dashboard}>
      <Sidebar role={role} />
      <main className={styles.main}>
        <Header title="Timetable Management" />
        <div className={styles.toolbar}>
          <button onClick={() => setView("view")}>View Timetable</button>
          <button onClick={() => setView("create")}>Create/Edit Timetable</button>
          <button onClick={() => setView("analytics")}>Analytics</button>

          <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}>
            {classes.length > 0 ? (
              classes.map(cls => <option key={cls} value={cls}>Grade {cls}</option>)
            ) : (
              <>
                <option value="10A">Grade 10A</option>
                <option value="10B">Grade 10B</option>
                <option value="11A">Grade 11A</option>
              </>
            )}
          </select>

          <select value={selectedTerm} onChange={(e) => setSelectedTerm(Number(e.target.value))}>
            <option value={1}>Term 1</option>
            <option value={2}>Term 2</option>
            <option value={3}>Term 3</option>
          </select>

          <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))}>
            <option value={new Date().getFullYear()}>{new Date().getFullYear()}</option>
            <option value={new Date().getFullYear() - 1}>{new Date().getFullYear() - 1}</option>
            <option value={new Date().getFullYear() + 1}>{new Date().getFullYear() + 1}</option>
          </select>

          <button 
            onClick={handleGenerate} 
            disabled={generating}
            style={{ marginLeft: "10px", padding: "8px 16px", backgroundColor: "#10b981", color: "white", border: "none", borderRadius: "4px", cursor: generating ? "not-allowed" : "pointer" }}
          >
            {generating ? "Generating..." : "🔄 Auto-Generate Timetable"}
          </button>
        </div>

        {view === "view" && (
          <AdminTimetableForm 
            selectedClass={selectedClass} 
            term={selectedTerm} 
            year={selectedYear}
            grade={selectedGrade}
            section={selectedSection}
          />
        )}
        {view === "create" && (
          <AdminTimetableForm 
            selectedClass={selectedClass} 
            term={selectedTerm} 
            year={selectedYear}
            grade={selectedGrade}
            section={selectedSection}
            editable 
          />
        )}
        {view === "analytics" && <AdminTimetableAnalytics />}
      </main>
    </div>
  );
};

export default AdminTimetablePage;
