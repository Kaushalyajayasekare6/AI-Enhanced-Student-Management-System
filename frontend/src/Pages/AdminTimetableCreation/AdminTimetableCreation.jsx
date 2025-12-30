import React, { useState, useEffect } from "react";
import axios from "axios";
import Sidebar from "../../Components/Sidebar/Sidebar";
import Header from "../../Components/Header/Header";
import { API_ENDPOINTS, getAuthHeaders } from "../../config/api";
import styles from "./AdminTimetableCreation.module.css";

const AdminTimetableCreation = () => {
  const [formData, setFormData] = useState({
    grade: "",
    section: "",
    stream: "",
    term: "",
    year: new Date().getFullYear(),
  });

  const [suggestions, setSuggestions] = useState(null);
  const [loading, setLoading] = useState(false);
  const [timetableData, setTimetableData] = useState(null);
  const [step, setStep] = useState("select"); // select, review, confirm
  const [teachers, setTeachers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [existingTimetable, setExistingTimetable] = useState(null);

  // Fetch available data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [teachersRes, classesRes] = await Promise.all([
          axios.get(API_ENDPOINTS.TEACHERS.ALL, { headers: getAuthHeaders() }),
          axios.get(API_ENDPOINTS.STUDENTS.ALL_CLASSES, { headers: getAuthHeaders() }),
        ]);
        setTeachers(teachersRes.data.teachers || []);
        setClasses(classesRes.data || []);
      } catch (err) {
        console.error("Error fetching data:", err);
      }
    };
    fetchData();
  }, []);

  // Generate intelligent suggestions
  const handleGenerateSuggestions = async () => {
    if (!formData.grade || !formData.section || !formData.term) {
      alert("Please fill: Grade, Section, Term");
      return;
    }

    setLoading(true);
    try {
      // Check if timetable exists
      const checkRes = await axios.get(
        `${API_ENDPOINTS.TIMETABLE.GET}?grade=${formData.grade}&section=${formData.section}&term=${formData.term}&year=${formData.year}`,
        { headers: getAuthHeaders() }
      );
      
      if (checkRes.data) {
        setExistingTimetable(checkRes.data);
        alert("Timetable already exists for this class/term. Delete it first to create a new one.");
        setLoading(false);
        return;
      }
    } catch (err) {
      // Timetable doesn't exist, proceed
    }

    // Get intelligent suggestions from backend
    try {
      const res = await axios.post(
        `${API_ENDPOINTS.TIMETABLE.BASE}/suggestions`,
        formData,
        { headers: getAuthHeaders() }
      );

      setSuggestions(res.data);
      setStep("review");
    } catch (err) {
      alert("Error generating suggestions: " + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  // Create timetable
  const handleCreateTimetable = async (autoGenerate = true) => {
    setLoading(true);
    try {
      const payload = autoGenerate
        ? formData
        : { ...formData, slots: timetableData };

      const res = await axios.post(
        autoGenerate ? `${API_ENDPOINTS.TIMETABLE.BASE}/generate` : `${API_ENDPOINTS.TIMETABLE.BASE}/create`,
        payload,
        { headers: getAuthHeaders() }
      );

      alert("✅ Timetable created successfully!");
      setStep("select");
      setFormData({
        grade: "",
        section: "",
        stream: "",
        term: "",
        year: new Date().getFullYear(),
      });
      setSuggestions(null);
    } catch (err) {
      alert("Error: " + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const getClassStudents = (grade, section) => {
    return classes.filter(c => c.grade === parseInt(grade) && c.section === section).length;
  };

  return (
    <div className={styles.container}>
      <Sidebar />
      <div className={styles.mainContent}>
        <Header />
        
        <div className={styles.content}>
          <h1>📅 Intelligent Timetable Creation</h1>

          {step === "select" && (
            <div className={styles.formSection}>
              <h2>Step 1: Select Class & Term</h2>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label>Grade *</label>
                  <select
                    value={formData.grade}
                    onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                  >
                    <option value="">Select Grade</option>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].map(g => (
                      <option key={g} value={g}>{`Grade ${g}`}</option>
                    ))}
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label>Section *</label>
                  <select
                    value={formData.section}
                    onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                  >
                    <option value="">Select Section</option>
                    {["A", "B", "C", "D", "E"].map(s => (
                      <option key={s} value={s}>{`Section ${s}`}</option>
                    ))}
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label>Stream (if applicable)</label>
                  <select
                    value={formData.stream}
                    onChange={(e) => setFormData({ ...formData, stream: e.target.value })}
                  >
                    <option value="">None</option>
                    <option value="Science">Science</option>
                    <option value="Arts">Arts</option>
                    <option value="Commerce">Commerce</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label>Term *</label>
                  <select
                    value={formData.term}
                    onChange={(e) => setFormData({ ...formData, term: e.target.value })}
                  >
                    <option value="">Select Term</option>
                    <option value="1">Term 1</option>
                    <option value="2">Term 2</option>
                    <option value="3">Term 3</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label>Year</label>
                  <input
                    type="number"
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                  />
                </div>
              </div>

              <div className={styles.stats}>
                <div className={styles.stat}>
                  <h3>Students in Class</h3>
                  <p>{getClassStudents(formData.grade, formData.section) || 0}</p>
                </div>
                <div className={styles.stat}>
                  <h3>Active Teachers</h3>
                  <p>{teachers.filter(t => !t.leaveDate).length}</p>
                </div>
                <div className={styles.stat}>
                  <h3>Teachers with Subjects</h3>
                  <p>{teachers.filter(t => !t.leaveDate && t.subjects?.length > 0).length}</p>
                </div>
              </div>

              <button
                className={styles.primaryBtn}
                onClick={handleGenerateSuggestions}
                disabled={loading}
              >
                {loading ? "🔄 Generating..." : "🚀 Generate Intelligent Timetable"}
              </button>
            </div>
          )}

          {step === "review" && suggestions && (
            <div className={styles.reviewSection}>
              <h2>Step 2: Review Suggestions</h2>
              
              <div className={styles.suggestionCard}>
                <h3>✨ AI Recommendations</h3>
                <div className={styles.suggestions}>
                  {suggestions.recommendations?.map((rec, idx) => (
                    <div key={idx} className={styles.suggestion}>
                      <span className={styles.icon}>
                        {rec.type === "warning" ? "⚠️" : "✅"}
                      </span>
                      <p>{rec.message}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className={styles.analysisGrid}>
                <div className={styles.analysisCard}>
                  <h4>Teacher Distribution</h4>
                  <ul>
                    {suggestions.teacherLoad?.map((teacher, idx) => (
                      <li key={idx}>
                        {teacher.name}: <strong>{teacher.classes} classes</strong>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className={styles.analysisCard}>
                  <h4>Subject Coverage</h4>
                  <ul>
                    {suggestions.subjectCoverage?.map((subject, idx) => (
                      <li key={idx}>
                        {subject.name}: <strong>{subject.hoursPerWeek} hrs/week</strong>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className={styles.analysisCard}>
                  <h4>Schedule Optimization</h4>
                  <ul>
                    <li>⏰ Time Slots: <strong>6 per day</strong></li>
                    <li>📅 Days: <strong>5 days/week</strong></li>
                    <li>🔄 Balance: <strong>{suggestions.balanceScore}%</strong></li>
                  </ul>
                </div>
              </div>

              <div className={styles.actions}>
                <button
                  className={styles.secondaryBtn}
                  onClick={() => setStep("select")}
                >
                  ← Back
                </button>
                <button
                  className={styles.primaryBtn}
                  onClick={() => handleCreateTimetable(true)}
                  disabled={loading}
                >
                  {loading ? "Creating..." : "✅ Create Timetable"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminTimetableCreation;
