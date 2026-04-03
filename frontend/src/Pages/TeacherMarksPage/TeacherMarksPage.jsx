import React, { useState, useEffect, useMemo, useCallback } from "react";
import Sidebar from "../../Components/Sidebar/Sidebar";
import Header from "../../Components/Header/Header";
import StudentMarks from "../../Components/StudentMarks/StudentMarks";
import styles from "./TeacherMarksPage.module.css";
import { getStoredRole } from "../../utils/auth";
import { API_ENDPOINTS, getAuthHeaders } from "../../config/api";
import axios from "axios";
import jsPDF from "jspdf";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";

const currentYear = new Date().getFullYear();
const terms = [1, 2, 3];

const TeacherMarksPage = () => {
  const [assignedClass, setAssignedClass] = useState(null);
  const [classStudents, setClassStudents] = useState([]);
  const [marksData, setMarksData] = useState({});
  const [predictionsByGrade, setPredictionsByGrade] = useState({});
  const [search, setSearch] = useState("");
  const [selectedTerm, setSelectedTerm] = useState(1);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [role] = useState(getStoredRole() || "teacher");
  const [predictionLoading, setPredictionLoading] = useState({});
  const [error, setError] = useState("");
  const [debugInfo, setDebugInfo] = useState("");

  const getClassTeachersEndpoint = () => {
    return API_ENDPOINTS.CLASS_TEACHERS.MY_CLASS;
  };

  const getAttendanceEndpoint = () => {
    return API_ENDPOINTS.ATTENDANCE.TEACHER_STUDENTS;
  };

  const fetchClassData = useCallback(async (assignment) => {
    try {
      setDebugInfo(`Fetching data for class ${assignment.grade}-${assignment.section}...`);
      
      const endpoint = getAttendanceEndpoint();
      const studentsRes = await axios.get(endpoint, { 
        headers: getAuthHeaders(),
        timeout: 10000
      });
      
      let students = studentsRes.data.students || [];
      
      // Filter students to exact assigned class
      students = students.filter(student => {
        const studentGrade = parseInt(student.grade?.match(/\d+/)?.[0] || 0);
        const gradeMatch = studentGrade === assignment.grade;
        const sectionMatch = student.section === assignment.section;
        const streamMatch = !assignment.stream || student.stream === assignment.stream;
        return gradeMatch && sectionMatch && streamMatch;
      });
      
      // Add marks to each student from marksData
      const classGradeKey = `Grade ${assignment.grade}`;
      const classMarks = marksData[classGradeKey]?.marks || [];
      students = students.map(student => {
        const studentMarkRecord = classMarks.find(m => 
          String(m.studentId?._id || m.studentId) === String(student._id)
        );
        return {
          ...student,
          marks: studentMarkRecord?.marks || {}
        };
      });
      
      setClassStudents(students);

    } catch (err) {
      console.error("❌ Class data error:", err);
      setError("Failed to load class data.");
      setDebugInfo(`Error: ${err.message}`);
    }
  }, [selectedYear, selectedTerm, marksData]);


  const fetchAssignedClass = async () => {
    try {
      setLoading(true);
      setError("");
      
      const endpoint = getClassTeachersEndpoint();
      console.log("🔹 Using endpoint:", endpoint);
      
      const headers = getAuthHeaders();
      
      setDebugInfo(`Fetching from: ${endpoint}`);
      
      const classRes = await axios.get(endpoint, { 
        headers: headers,
        timeout: 10000
      });
      
      if (classRes.data.assignment) {
        setAssignedClass(classRes.data.assignment);
        setDebugInfo(`✅ Found class: Grade ${classRes.data.assignment.grade}, Section ${classRes.data.assignment.section}`);
        
        await fetchClassData(classRes.data.assignment);
      } else {
        setError("You are not assigned to any class. Please contact administrator.");
        setDebugInfo("No assignment found.");
      }
      
    } catch (err) {
      console.error("❌ Error fetching assigned class:", err);
      
      setDebugInfo(`Error: ${err.message}`);
      
      if (err.response?.status === 401) {
        setError("Session expired. Please login again.");
      } else {
        setError(`Failed to load: ${err.response?.data?.message || err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignedClass();
  }, []);

  useEffect(() => {
    if (assignedClass) {
      fetchClassData(assignedClass);
    }
  }, [selectedTerm, selectedYear, fetchClassData]);

  const filteredStudents = useMemo(() => {
    return classStudents.filter(s => 
      s.name?.toLowerCase().includes(search.toLowerCase()) ||
      s.enrolment?.toLowerCase().includes(search.toLowerCase()) ||
      `${s.firstName || ''} ${s.lastName || ''}`.toLowerCase().includes(search.toLowerCase())
    );
  }, [classStudents, search]);

  const generateMarksPredictions = useCallback(async (classKey) => {
    if (filteredStudents.length === 0) return;

    try {
      setPredictionLoading(prev => ({...prev, [classKey]: true}));
      const predictions = await Promise.all(
        filteredStudents.map(async (student) => {
          const input = {
            studentId: student._id,
            year: selectedYear,
            term: selectedTerm,
          };
          const res = await axios.post(API_ENDPOINTS.ML.PREDICT_MARKS, input, { headers: getAuthHeaders() });
          return { ...student, predicted_marks: res.data };
        })
      );
      setPredictionsByGrade(prev => ({
        ...prev,
        [classKey]: { predictions, timestamp: new Date().toLocaleString() }
      }));
    } catch (err) {
      console.error('Marks prediction error:', err);
      alert('ML service error: ' + (err.response?.data?.message || err.message));
    } finally {
      setPredictionLoading(prev => ({...prev, [classKey]: false}));
    }
  }, [filteredStudents, selectedYear, selectedTerm]);

  const generateDropoutRisk = useCallback(async (classKey) => {
    if (filteredStudents.length === 0) return;

    try {
      setPredictionLoading(prev => ({...prev, [classKey]: true}));
      const predictions = await Promise.all(
        filteredStudents.map(async (student) => {
          const input = {
            studentId: student._id,
            year: selectedYear,
            term: selectedTerm,
          };
          const res = await axios.post(API_ENDPOINTS.ML.PREDICT_DROPOUT, input, { headers: getAuthHeaders() });
          return { ...student, dropout_risk: res.data };
        })
      );
      setPredictionsByGrade(prev => ({
        ...prev,
        [classKey]: { ...prev[classKey], dropout: predictions, dropout_timestamp: new Date().toLocaleString() }
      }));
    } catch (err) {
      console.error('Dropout prediction error:', err);
      alert('ML Dropout service error: ' + (err.response?.data?.message || err.message));
    } finally {
      setPredictionLoading(prev => ({...prev, [classKey]: false}));
    }
  }, [filteredStudents, selectedYear, selectedTerm]);

  const updateMark = (studentId, subject, value) => {
    setClassStudents(prev => 
      prev.map(s => 
        s._id === studentId 
          ? { ...s, marks: { ...s.marks, [subject]: Number(value) || 0 } }
          : s
      )
    );
  };

  const saveAllMarks = async () => {
    try {
      setSaving(true);
      const updates = filteredStudents
        .filter(s => Object.keys(s.marks || {}).length > 0)
        .map(student => ({
          studentId: student._id,
          year: selectedYear,
          term: selectedTerm,
          marks: student.marks || {}
        }));
      
      if (updates.length === 0) {
        alert('No marks to save');
        return;
      }
      
      await axios.post(API_ENDPOINTS.MARKS.BULK_UPSERT, { updates }, { headers: getAuthHeaders() });
      alert('✅ Marks saved successfully!');
    } catch (err) {
      alert('Save failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <Sidebar role={role} />
        <main className={styles.main}>
          <Header title="Marks Management & ML Predictions" />
          <div style={{padding: '2rem', textAlign: 'center', fontSize: '1.2rem'}}>
            Loading your assigned class...
          </div>
        </main>
      </div>
    );
  }

  const classKey = assignedClass ? `Grade ${assignedClass.grade}-${assignedClass.section}` : '';

  return (
    <div className={styles.container}>
      <Sidebar role={role} />
      <main className={styles.main}>
        <Header title="Marks Management & ML Predictions" />

        {error && (
          <div className={styles.error}>
            <h3>⚠️ {error}</h3>
            {debugInfo && (
              <details>
                <summary>Debug Info</summary>
                <pre>{debugInfo}</pre>
              </details>
            )}
          </div>
        )}

        {assignedClass && (
          <div className={styles.classInfo}>
            <h2>Class: Grade {assignedClass.grade} - {assignedClass.section}{assignedClass.stream ? ` (${assignedClass.stream})` : ""}</h2>
          </div>
        )}

        {assignedClass && classStudents.length === 0 && !loading && (
          <div style={{padding: '2rem', textAlign: 'center', color: '#666'}}>
            <h3>No students in this class yet</h3>
          </div>
        )}

        {assignedClass && classStudents.length > 0 && (
          <>
            <div className={styles.filters}>
              <select value={selectedTerm} onChange={e => setSelectedTerm(Number(e.target.value))}>
                {terms.map(t => <option key={t}>Term {t}</option>)}
              </select>
              <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))}>
                <option>{currentYear - 2}</option>
                <option>{currentYear - 1}</option>
                <option>{currentYear}</option>
              </select>
              <input 
                placeholder="Search students in class..." 
                value={search} 
                onChange={e => setSearch(e.target.value)} 
              />
              <button onClick={saveAllMarks} disabled={saving}>
                {saving ? 'Saving...' : `Save ${filteredStudents.length} Marks`}
              </button>
            </div>

            <div className={styles.gradeSection}>
              <div className={styles.gradeHeader}>
                <h2>{classKey} ({filteredStudents.length}/{classStudents.length} students)
                  <span className={styles.sectionLabel}>
                    Section {assignedClass.section}
                  </span>
                </h2>
                <div>
                  <button 
                    onClick={() => generateMarksPredictions(classKey)} 
                    className={styles.mlBtn} 
                    disabled={predictionLoading[classKey]}
                  >
                    {predictionLoading[classKey] ? 'Predicting...' : '🔮 Predict Marks'}
                  </button>
                  <button 
                    onClick={() => generateDropoutRisk(classKey)} 
                    className={styles.mlBtn} 
                    disabled={predictionLoading[classKey]}
                  >
                    {predictionLoading[classKey] ? 'Analyzing...' : '⚠️ Risk Analysis'}
                  </button>
                </div>
              </div>

              <table className={styles.marksTable}>
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>English</th>
                    <th>Sinhala</th>
                    <th>Maths</th>
                    <th>Science</th>
                    <th>Tamil</th>
                    <th>Religion</th>
                    <th>Avg</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map(student => {
                    const marks = marksData[`Grade ${assignedClass.grade}`]?.marks?.find(m => 
                      String(m.studentId?._id || m.studentId) === String(student._id)
                    )?.marks || student.marks || {};
                    
                    const avg = Object.values(marks).reduce((sum, v) => sum + (Number(v) || 0), 0) / 
                              Math.max(Object.keys(marks).length, 1);

                    return (
                      <tr key={student._id}>
                        <td>{`${student.firstName || ''} ${student.lastName || ''}`.trim()} 
                          <small>({student.enrolment || student.enrollmentNo})</small>
                        </td>
                        <td>
                          <input 
                            type="number" 
                            value={marks.english || ''} 
                            onChange={e => updateMark(student._id, 'english', e.target.value)} 
                            min="0" max="100"
                          />
                        </td>
                        <td>
                          <input 
                            type="number" 
                            value={marks.sinhala || ''} 
                            onChange={e => updateMark(student._id, 'sinhala', e.target.value)} 
                            min="0" max="100"
                          />
                        </td>
                        <td>
                          <input 
                            type="number" 
                            value={marks.maths || ''} 
                            onChange={e => updateMark(student._id, 'maths', e.target.value)} 
                            min="0" max="100"
                          />
                        </td>
                        <td>
                          <input 
                            type="number" 
                            value={marks.science || ''} 
                            onChange={e => updateMark(student._id, 'science', e.target.value)} 
                            min="0" max="100"
                          />
                        </td>
                        <td>
                          <input 
                            type="number" 
                            value={marks.tamil || ''} 
                            onChange={e => updateMark(student._id, 'tamil', e.target.value)} 
                            min="0" max="100"
                          />
                        </td>
                        <td>
                          <input 
                            type="number" 
                            value={marks.religion || ''} 
                            onChange={e => updateMark(student._id, 'religion', e.target.value)} 
                            min="0" max="100"
                          />
                        </td>
                        <td style={{fontWeight: 'bold', color: avg > 70 ? 'green' : avg > 50 ? 'orange' : 'red'}}>
                          {Math.round(avg)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {predictionsByGrade[classKey]?.predictions && (
                <div className={styles.predictionsTable}>
                  <h3>🔮 Marks Predictions (Top 10)</h3>
                  <table>
                    <thead>
                      <tr>
                        <th>Student</th>
                        <th>English</th>
                        <th>Math</th>
                        <th>Sinhala</th>
                        <th>Trend</th>
                      </tr>
                    </thead>
                    <tbody>
                      {predictionsByGrade[classKey].predictions.slice(0, 10).map(p => {
                        const eng = p.predicted_marks?.english;
                        const math = p.predicted_marks?.maths;
                        const sin = p.predicted_marks?.sinhala;
                        return (
                          <tr key={p._id}>
                            <td>{p.name || `${p.firstName} ${p.lastName}`}</td>
                            <td>{eng?.predicted?.toFixed(0)} ({eng?.confidence || 'N/A'})</td>
                            <td>{math?.predicted?.toFixed(0)}</td>
                            <td>{sin?.predicted?.toFixed(0)}</td>
                            <td>📈</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {predictionsByGrade[classKey]?.dropout && (
                <div className={styles.dropoutTable}>
                  <h3>⚠️ Dropout Risk Analysis (Top 10)</h3>
                  <table>
                    <thead>
                      <tr>
                        <th>Student</th>
                        <th>Risk</th>
                        <th>Score</th>
                        <th>Key Factors</th>
                      </tr>
                    </thead>
                    <tbody>
                      {predictionsByGrade[classKey].dropout.slice(0, 10).map(p => (
                        <tr key={p._id}>
                          <td>{p.name || `${p.firstName} ${p.lastName}`}</td>
                          <td>{p.dropout_risk?.risk_level || 'N/A'}</td>
                          <td>{((p.dropout_risk?.risk_score || 0) * 100).toFixed(0)}%</td>
                          <td>{(p.dropout_risk?.factors || []).slice(0,3).join(', ') || 'N/A'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default TeacherMarksPage;

