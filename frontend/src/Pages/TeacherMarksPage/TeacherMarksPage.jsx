import React, { useState, useMemo, useEffect } from "react";
import Sidebar from "../../Components/Sidebar/Sidebar";
import Header from "../../Components/Header/Header";
import styles from "./TeacherMarksPage.module.css";
import { getStoredRole } from "../../utils/auth";
import axios from "axios";
import { API_ENDPOINTS, getAuthHeaders } from "../../config/api";

const currentYear = new Date().getFullYear();
const terms = [1, 2, 3];

// Subject definitions based on grade
const SUBJECTS_BY_GRADE = {
  "1-5": [
    { key: "english", label: "English" },
    { key: "sinhala", label: "Sinhala" },
    { key: "maths", label: "Maths" },
    { key: "science", label: "Science" },
    { key: "religion", label: "Religion" },
  ],
  "6-9": [
    { key: "english", label: "English" },
    { key: "sinhala", label: "Sinhala" },
    { key: "maths", label: "Maths" },
    { key: "science", label: "Science" },
    { key: "religious", label: "Religious" },
    { key: "art", label: "Art" },
    { key: "geography", label: "Geography" },
    { key: "citizenship", label: "Citizenship" },
    { key: "tamil", label: "Tamil" },
    { key: "pts", label: "PTS (Physical Training)" },
    { key: "health", label: "Health" },
    { key: "history", label: "History" },
  ],
  "10-11": [
    { key: "english", label: "English" },
    { key: "sinhala", label: "Sinhala" },
    { key: "maths", label: "Maths" },
    { key: "science", label: "Science" },
    { key: "buddhism", label: "Buddhism" },
    { key: "history", label: "History" },
    { key: "cat1", label: "1st Category" },
    { key: "cat2", label: "2nd Category" },
    { key: "cat3", label: "3rd Category" },
  ],
  "12": [
    { key: "english", label: "English" },
    { key: "sinhala", label: "Sinhala" },
    { key: "maths", label: "Maths" },
    { key: "subject4", label: "Subject 4" },
  ],
};

const getSubjectsByGrade = (gradeInput) => {
  if (gradeInput == null) return [];

  // If given a number already
  if (typeof gradeInput === "number") {
    const gradeNum = gradeInput;
    if (gradeNum >= 1 && gradeNum <= 5) return SUBJECTS_BY_GRADE["1-5"];
    if (gradeNum >= 6 && gradeNum <= 9) return SUBJECTS_BY_GRADE["6-9"];
    if (gradeNum >= 10 && gradeNum <= 11) return SUBJECTS_BY_GRADE["10-11"];
    if (gradeNum === 12) return SUBJECTS_BY_GRADE["12"];
    return [];
  }

  const str = String(gradeInput);

  // Handle explicit ranges like "1-5" or "Grade 1-5"
  const rangeMatch = str.match(/(\d+)\s*-\s*(\d+)/);
  if (rangeMatch) {
    const start = Number(rangeMatch[1]);
    const end = Number(rangeMatch[2]);
    if (start === 1 && end === 5) return SUBJECTS_BY_GRADE["1-5"];
    if (start === 6 && end === 9) return SUBJECTS_BY_GRADE["6-9"];
  }

  // Extract first number from strings like "Grade 8" or "8"
  const numMatch = str.match(/(\d+)/);
  if (numMatch) {
    const gradeNum = Number(numMatch[1]);
    if (gradeNum >= 1 && gradeNum <= 5) return SUBJECTS_BY_GRADE["1-5"];
    if (gradeNum >= 6 && gradeNum <= 9) return SUBJECTS_BY_GRADE["6-9"];
    if (gradeNum >= 10 && gradeNum <= 11) return SUBJECTS_BY_GRADE["10-11"];
    if (gradeNum === 12) return SUBJECTS_BY_GRADE["12"];
  }

  return [];
};

const TeacherMarksPage = () => {
  const [studentsByGrade, setStudentsByGrade] = useState({});
  const [search, setSearch] = useState("");
  const [selectedTerm, setSelectedTerm] = useState(1);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const role = getStoredRole() || "teacher";

  // Fetch teacher's class students and marks
  const fetchStudentsAndMarks = async () => {
    try {
      setLoading(true);
      
      // Get students of teacher's assigned class
      const studentsRes = await axios.get(
        API_ENDPOINTS.ATTENDANCE.TEACHER_STUDENTS,
        { headers: getAuthHeaders() }
      );

      const classStudents = studentsRes.data.students || [];
      
      if (classStudents.length === 0) {
        alert("No students found in your assigned class.");
        setStudentsByGrade({});
        setLoading(false);
        return;
      }

      // Fetch marks from Marks API for the selected year and term
      let marksData = {};
      try {
        const marksRes = await axios.get(
          API_ENDPOINTS.MARKS.TEACHER_CLASS,
          { 
            headers: getAuthHeaders(),
            params: { year: selectedYear, term: selectedTerm }
          }
        );
        // marksRes.data is grouped by grade: { "Grade 1-5": { marks: [...], subjectsInfo: {...} }, ... }
        marksData = marksRes.data || {};
      } catch (marksErr) {
        console.warn("Could not fetch marks from API, using student.terms:", marksErr);
        // Fallback to student.terms if API fails
      }

      // Group students by grade and merge with marks data
      const grouped = {};
      classStudents.forEach((student) => {
        // Parse grade: "Grade 8" -> 8, or "8" -> 8
        const gradeStr = String(student.grade);
        const match = gradeStr.match(/\d+/);
        const gradeNum = match ? parseInt(match[0]) : 0;
        let gradeKey;
        
        if (gradeNum >= 1 && gradeNum <= 5) gradeKey = "Grade 1-5";
        else if (gradeNum >= 6 && gradeNum <= 9) gradeKey = "Grade 6-9";
        else if (gradeNum >= 10 && gradeNum <= 11) gradeKey = "Grade 10-11";
        else if (gradeNum === 12) gradeKey = "Grade 12";
        else gradeKey = `Grade ${gradeNum}`;

        if (!grouped[gradeKey]) {
          grouped[gradeKey] = {
            subjects: getSubjectsByGrade(gradeNum),
            students: [],
          };
        }

        // Get existing marks for this student
        let marks = {};
        
        // First try to get from Marks API data
        if (marksData[gradeKey] && marksData[gradeKey].marks) {
          const studentMarksRecord = marksData[gradeKey].marks.find(
            m => {
              const recordStudentId = m.studentId?._id || m.studentId?.id || m.studentId;
              return recordStudentId && String(recordStudentId) === String(student._id);
            }
          );
          if (studentMarksRecord && studentMarksRecord.marks) {
            marks = studentMarksRecord.marks;
          }
        }
        
        // Fallback to student.terms if no marks from API
        if (Object.keys(marks).length === 0 && student.terms && Array.isArray(student.terms)) {
          const termData = student.terms.find(
            (t) => t.year === selectedYear && t.term === selectedTerm
          );
          if (termData && termData.marks) {
            if (Array.isArray(termData.marks)) {
              termData.marks.forEach((m) => {
                marks[m.subject] = m.marks || m.mark || 0;
              });
            } else {
              marks = termData.marks;
            }
          }
        }

        grouped[gradeKey].students.push({
          _id: student._id,
          name: `${student.firstName || ""} ${student.lastName || ""}`.trim(),
          enrolment: student.enrollmentNo,
          grade: student.grade,
          marks: marks,
        });
      });

      setStudentsByGrade(grouped);
    } catch (err) {
      console.error("Error fetching students:", err);
      setStudentsByGrade({});
      alert(`❌ Unable to fetch students: ${err.response?.data?.message || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Fetch students and marks when year/term changes
  useEffect(() => {
    fetchStudentsAndMarks();
  }, [selectedYear, selectedTerm]);

  // Filter students by search across all grades
  const filteredStudentsByGrade = useMemo(() => {
    const filtered = {};
    Object.entries(studentsByGrade).forEach(([grade, gradeData]) => {
      const filteredStudents = gradeData.students.filter(
        (s) =>
          s.name.toLowerCase().includes(search.toLowerCase()) ||
          s.enrolment.toLowerCase().includes(search.toLowerCase())
      );
      if (filteredStudents.length > 0) {
        filtered[grade] = {
          ...gradeData,
          students: filteredStudents,
        };
      }
    });
    return filtered;
  }, [studentsByGrade, search]);

  // Handle mark change
  const handleMarkChange = (grade, studentId, subject, value) => {
    // Validate: marks must be between 0-100
    const numValue = value ? Number(value) : 0;
    if (numValue < 0 || numValue > 100) {
      alert("Marks must be between 0 and 100");
      return;
    }
    
    setStudentsByGrade((prev) => ({
      ...prev,
      [grade]: {
        ...prev[grade],
        students: prev[grade].students.map((s) =>
          s._id === studentId
            ? {
                ...s,
                marks: {
                  ...s.marks,
                  [subject]: numValue,
                },
              }
            : s
        ),
      },
    }));
  };

  // Calculate rank and totals for students
  const rankedStudents = (students, subjects) => {
    const withTotals = students.map((s) => {
      const markValues = subjects
        .map((subj) => s.marks[subj.key] || 0)
        .filter((m) => m > 0);
      const total = markValues.reduce((a, b) => a + b, 0);
      const avg = markValues.length ? (total / markValues.length).toFixed(2) : 0;
      return { ...s, total, avg: Number(avg) };
    });

    // Rank by total (descending)
    withTotals.sort((a, b) => b.total - a.total);
    return withTotals.map((s, i) => ({ ...s, place: i + 1 }));
  };

  // Save marks to database
  const saveMarks = async () => {
    try {
      setSaving(true);
      const savePromises = [];

      Object.values(studentsByGrade).forEach((gradeData) => {
        gradeData.students.forEach((student) => {
          if (Object.keys(student.marks).length > 0) {
            savePromises.push(
              axios.post(
                API_ENDPOINTS.MARKS.UPSERT,
                {
                  studentId: student._id,
                  year: selectedYear,
                  term: selectedTerm,
                  marks: student.marks,
                },
                { headers: getAuthHeaders() }
              )
            );
          }
        });
      });

      if (savePromises.length === 0) {
        alert("⚠️ No marks to save!");
        setSaving(false);
        return;
      }

      await Promise.all(savePromises);
      alert("✅ All marks saved successfully to database!");
      
      // Refresh the data to show saved marks
      await fetchStudentsAndMarks();
    } catch (err) {
      console.error("Error saving marks:", err);
      alert("❌ Failed to save marks. " + (err.response?.data?.message || err.message));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.dashboard}>
      <Sidebar role={role} />
      <main className={styles.main}>
        <Header />
        <h1 className={styles.pageTitle}>Manage Marks</h1>
        <p className={styles.pageSubtitle}>
          Add, edit, and review student marks by grade and term
        </p>

        {/* Filters */}
        <div className={styles.filters}>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
          >
            <option value={currentYear}>{currentYear}</option>
            <option value={currentYear - 1}>{currentYear - 1}</option>
            <option value={currentYear - 2}>{currentYear - 2}</option>
          </select>

          <select
            value={selectedTerm}
            onChange={(e) => setSelectedTerm(Number(e.target.value))}
          >
            {terms.map((t) => (
              <option key={t} value={t}>
                Term {t}
              </option>
            ))}
          </select>

          <input
            type="text"
            placeholder="Search by name or enrolment..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <div className={styles.loadingContainer}>
            <p>Loading students...</p>
          </div>
        ) : Object.keys(filteredStudentsByGrade).length === 0 ? (
          <div className={styles.loadingContainer}>
            <p>No students found. You may not be assigned to any classes.</p>
          </div>
        ) : (
          <>
            {/* Marks Tables by Grade */}
            {Object.entries(filteredStudentsByGrade).map(([grade, gradeData]) => {
              const ranked = rankedStudents(gradeData.students, gradeData.subjects);

              return (
                <div key={grade} className={styles.gradeSection}>
                  <div className={styles.tableHeader}>
                    <h3>
                      Grade {grade} — Term {selectedTerm}, {selectedYear}
                    </h3>
                    <span className={styles.studentCount}>
                      {ranked.length} students
                    </span>
                  </div>

                  <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>Enrolment</th>
                          <th>Name</th>
                          {gradeData.subjects.map((subj) => (
                            <th key={subj.key}>{subj.label}</th>
                          ))}
                          <th>Total</th>
                          <th>Average</th>
                          <th>Rank</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ranked.length === 0 ? (
                          <tr>
                            <td colSpan={gradeData.subjects.length + 4}>
                              No students in this grade
                            </td>
                          </tr>
                        ) : (
                          ranked.map((student) => (
                            <tr key={student._id}>
                              <td>{student.enrolment}</td>
                              <td>{student.name}</td>
                              {gradeData.subjects.map((subj) => (
                                <td key={subj.key}>
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={student.marks[subj.key] || ""}
                                    onChange={(e) =>
                                      handleMarkChange(
                                        grade,
                                        student._id,
                                        subj.key,
                                        e.target.value
                                      )
                                    }
                                    className={styles.markInput}
                                    placeholder="0"
                                  />
                                </td>
                              ))}
                              <td
                                className={
                                  student.total >= 300
                                    ? styles.highScore
                                    : styles.normalScore
                                }
                              >
                                {student.total}
                              </td>
                              <td
                                className={
                                  student.avg >= 75
                                    ? styles.excellent
                                    : student.avg >= 60
                                    ? styles.good
                                    : styles.needsImprovement
                                }
                              >
                                {student.avg}
                              </td>
                              <td className={styles.placeCell}>
                                <span
                                  className={
                                    student.place === 1
                                      ? styles.firstPlace
                                      : student.place === 2
                                      ? styles.secondPlace
                                      : student.place === 3
                                      ? styles.thirdPlace
                                      : styles.otherPlace
                                  }
                                >
                                  {student.place}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Grade Summary */}
                  {ranked.length > 0 && (
                    <div className={styles.gradeSummary}>
                      <span>
                        Grade Average:{" "}
                        <strong>
                          {(ranked.reduce((sum, s) => sum + s.avg, 0) / ranked.length).toFixed(2)}
                        </strong>
                      </span>
                      <span>
                        Top Student: <strong>{ranked[0].name}</strong>
                      </span>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Save Button */}
            <div className={styles.actions}>
              <button
                className={styles.saveBtn}
                onClick={saveMarks}
                disabled={saving || Object.keys(studentsByGrade).length === 0}
              >
                {saving ? "💾 Saving..." : "💾 Save All Marks to Database"}
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default TeacherMarksPage;