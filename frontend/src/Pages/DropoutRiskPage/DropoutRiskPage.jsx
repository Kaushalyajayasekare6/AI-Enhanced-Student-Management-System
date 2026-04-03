import React, { useEffect, useState } from "react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';
import DropoutRiskClassChart from '../../Components/DropoutRiskClassChart.jsx';
import axios from "axios";
import Sidebar from "../../Components/Sidebar/Sidebar";
import Header from "../../Components/Header/Header";
import styles from "./DropoutRiskPage.module.css";
import { getStoredRole } from "../../utils/auth";
import { API_ENDPOINTS, getAuthHeaders } from "../../config/api";

const DropoutRiskPage = () => {
  const role = getStoredRole() || "student";
  const [riskData, setRiskData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [studentList, setStudentList] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");

  const [marksPrediction, setMarksPrediction] = useState(null);
  const [marksLoading, setMarksLoading] = useState(false);
  const [marksError, setMarksError] = useState(null);
  const [classRiskData, setClassRiskData] = useState(null);
  const [classLoading, setClassLoading] = useState(false);
  const [classError, setClassError] = useState(null);

  const SUBJECTS = [
    { key: 'english', label: 'English', color: '#3b82f6' },
    { key: 'math', label: 'Math', color: '#10b981' },
    { key: 'sinhala', label: 'Sinhala', color: '#f59e0b' },
    { key: 'tamil', label: 'Tamil', color: '#ef4444' },
    { key: 'env', label: 'Environment', color: '#8b5cf6' }
  ];

  const colorMap = {
    "High Risk": "#ef4444", "High": "#ef4444",
    "Medium Risk": "#f59e0b", "Medium": "#f59e0b",
    "Low Risk": "#10b981", "Low": "#10b981"
  };

  const parseGradeNumber = (grade) => {
    if (!grade && grade !== 0) return null;
    const raw = String(grade).trim();
    const match = raw.match(/(\d+)/);
    if (!match) return null;
    const asNum = Number(match[1]);
    return Number.isFinite(asNum) ? asNum : null;
  };

  const loadDropoutPrediction = async (studentId = null) => {
    setLoading(true);
    setError(null);
    try {
      const body = studentId ? { studentId } : {};
      const response = await axios.post(API_ENDPOINTS.ML.PREDICT_DROPOUT, body, { headers: getAuthHeaders() });
      if (response.data && response.data.success !== false) {
        setRiskData(response.data);
        return response.data;
      } else {
        const msg = response.data?.message || "Prediction failed";
        setError(msg);
        setRiskData(null);
        return null;
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || "Unable to fetch prediction";
      setError(errMsg);
      setRiskData(null);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const loadMarksPrediction = async (studentId = null, studentGrade = null) => {
    setMarksLoading(true);
    setMarksError(null);
    try {
      if (studentGrade && (studentGrade < 1 || studentGrade > 5)) {
        setMarksPrediction(null);
        setMarksError("Marks prediction only supports grades 1 to 5.");
        return null;
      }

      const body = studentId ? { studentId } : {};
      const response = await axios.post(API_ENDPOINTS.ML.PREDICT_MARKS, body, { headers: getAuthHeaders() });

      if (response.data && response.data.success !== false) {
        setMarksPrediction(response.data);
        return response.data;
      }

      const msg = response.data?.message || "Marks prediction failed";
      setMarksError(msg);
      setMarksPrediction(null);
      return null;
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || "Unable to fetch marks prediction";
      setMarksError(errMsg);
      setMarksPrediction(null);
      return null;
    } finally {
      setMarksLoading(false);
    }
  };

  const loadStudentList = async () => {
    if (role === "admin" || role === "teacher") {
      try {
        const res = await axios.get(API_ENDPOINTS.STUDENTS.BASE, { headers: getAuthHeaders() });
        setStudentList(res.data || []);
      } catch (err) {
        console.warn("Could not load student list", err);
      }
    }
  };

  const loadClassRisk = async () => {
    if (role !== "admin" && role !== "teacher") return;
    setClassLoading(true);
    setClassError(null);
    try {
      const params = new URLSearchParams();
      const response = await axios.get(API_ENDPOINTS.ML.PREDICT_DROPOUT_CLASS, { 
        headers: getAuthHeaders(),
        params 
      });
      if (response.data.success !== false) {
        setClassRiskData(response.data);
      }
    } catch (err) {
      setClassError(err.response?.data?.message || 'Class risk data unavailable');
    } finally {
      setClassLoading(false);
    }
  };

  useEffect(() => {
    loadStudentList();
    loadClassRisk();
    if (role === "student") loadDropoutPrediction();
  }, [role]);

  const handlePredictClick = async () => {
    const studentId = role === "student" ? null : selectedStudentId || null;

    const riskResult = await loadDropoutPrediction(studentId);
    if (!riskResult) {
      setMarksPrediction(null);
      return;
    }

    const grade = parseGradeNumber(riskResult?.student?.grade);
    await loadMarksPrediction(studentId, grade);
  };

  const handleRefreshClick = async () => {
    setRiskData(null);
    setMarksPrediction(null);
    setError(null);
    await handlePredictClick();
  };

  const getMarksData = () => {
    if (!riskData?.inputData?.current_marks) return [];
    return SUBJECTS.map(({ key, label }) => ({
      subject: label,
      mark: Number(riskData.inputData.current_marks[key] || 0),
      color: SUBJECTS.find(s => s.key === key).color
    }));
  };

  const getAttendanceData = () => {
    // Mock term-wise attendance pattern (extend if API provides historical data)
    const attendance = riskData?.inputData?.attendance_percentage || 0;
    return [
      { term: 'T1', attendance: attendance * 0.9 },
      { term: 'T2', attendance: attendance },
      { term: 'T3', attendance: attendance * 1.05 }
    ];
  };

  const renderLowMarksTable = () => {
    const marksData = getMarksData();
    const lowMarks = marksData.filter(d => d.mark < 60);
    if (lowMarks.length === 0) return <div className={styles.emptyState}>All subjects above 60% 🎉</div>;
    
    return (
      <div className={styles.marksTable}>
        <h4>Low Marks Subjects ({"<"}60)</h4>
        <table>
          <thead>
            <tr>
              <th>Subject</th>
              <th>Mark</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {lowMarks.map(({ subject, mark }, idx) => (
              <tr key={idx}>
                <td>{subject}</td>
                <td>{mark.toFixed(1)}</td>
                <td><span className={styles.lowMark}>Low</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };


  if (loading) return <div className={styles.loading}>Analyzing dropout risk...</div>;

  if (error) return (
    <div className={styles.page}>
      <Sidebar role={role} />
      <main className={styles.main}>
        <Header title="Dropout Risk Analysis" />
        <div className={styles.error}>{error}</div>
      </main>
    </div>
  );

  const riskLevel = riskData?.riskAssessment?.level || riskData?.prediction?.risk_level || "Unknown";
  const studentName = riskData?.student?.name || "You";

  return (
    <div className={styles.page}>
      <Sidebar role={role} />
      <main className={styles.main}>
        <Header title="Dropout Risk Analysis" />
        
        <div className={styles.actionBar}>
          {(role === "admin" || role === "teacher") && (
            <div className={styles.studentSelect}>
              <label>Select Student:</label>
              <select value={selectedStudentId} onChange={(e) => setSelectedStudentId(e.target.value)}>
                <option value="">Choose...</option>
                {studentList.map(s => (
                  <option key={s._id} value={s._id}>{`${s.firstName} ${s.lastName}`}</option>
                ))}
              </select>
            </div>
          )}
          <button className={styles.predictBtn} onClick={handlePredictClick}>
            🔮 Analyze Risk
          </button>
          <button className={styles.predictBtn} onClick={handleRefreshClick}>
            🔄 Refresh Data
          </button>
        </div>

        {riskData ? (
          <div className={styles.dashboard}>
            {/* Overview Card */}
            <div className={styles.cardOverview}>
              <div className={styles.riskBadge} style={{ backgroundColor: colorMap[riskLevel] }}>
                {riskLevel}
              </div>
              <div className={styles.studentInfo}>
                <h2>{studentName}</h2>
                <p>Grade: {riskData.student?.grade}</p>
              </div>
            </div>

            <div className={styles.grid}>
              {(role === "admin" || role === "teacher") && (
                <DropoutRiskClassChart 
                  classData={classRiskData} 
                  loading={classLoading}
                />
              )}
              {/* Marks Chart */}
              <div className={styles.chartCard}>
                <h3>📊 Subject Marks Pattern</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={getMarksData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="subject" />
                    <YAxis type="number" domain={[0, 100]} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="mark" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
                {renderLowMarksTable()}
              </div>

              {/* Attendance Chart */}
              <div className={styles.chartCard}>
                <h3>📈 Attendance Pattern</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={getAttendanceData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="term" />
                    <YAxis unit="%" domain={[0, 100]} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="attendance" stroke="#10b981" strokeWidth={3} />
                  </LineChart>
                </ResponsiveContainer>
                <div className={styles.metric}>
                  <strong>Overall:</strong> {riskData.inputData?.attendance_percentage || 0}%
                </div>
              </div>

              {/* Risk Details */}
              <div className={styles.detailsCard}>
                <h3>⚠️ Risk Factors</h3>
                <ul className={styles.list}>
                  {(riskData.riskAssessment?.factors || []).map((f, i) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>
                <h4>💡 Recommendations</h4>
                <ul className={styles.list}>
                  {(riskData.riskAssessment?.recommendations || riskData.prediction?.recommendations || []).map((r, i) => (
                    <li key={i}>✔ {r}</li>
                  ))}
                </ul>
              </div>

              {/* Marks Prediction (Grade 1-5) */}
              <div className={styles.detailsCard}>
                <h3>🎯 Marks Prediction (Grade 1-5)</h3>
                {marksLoading && <p>Calculating predicted marks...</p>}
                {marksError && <p className={styles.error}>{marksError}</p>}
                {marksPrediction && marksPrediction.predicted_marks ? (
                  <>
                    <table className={styles.smallTable}>
                      <thead>
                        <tr>
                          <th>Subject</th>
                          <th style={{color: '#2c3e50'}}>Current</th>
                          <th style={{color: '#27ae60'}}>Predicted</th>
                          <th style={{color: '#3498db'}}>Change</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(marksPrediction.predicted_marks).map(([subject, info]) => {
                          const predictedVal = typeof info === 'object' ? (info.predicted || info) : info;
                          const currentVal = Number(riskData?.inputData?.current_marks?.[subject] || 0);
                          const delta = Number(predictedVal) - currentVal;
                          const deltaPercent = currentVal > 0 ? ((delta / currentVal) * 100).toFixed(1) : 0;
                          const status = Number(predictedVal) < 50 ? '⚠️ Risk' : (delta > 0 ? '📈 Improve' : '→ Stable');
                          const statusColor = Number(predictedVal) < 50 ? '#e74c3c' : (delta > 0 ? '#27ae60' : '#95a5a6');
                          
                          return (
                            <tr key={subject}>
                              <td style={{fontWeight: '600'}}>{subject.charAt(0).toUpperCase() + subject.slice(1)}</td>
                              <td style={{textAlign: 'center', color: '#2c3e50', fontWeight: '500'}}>{Math.round(currentVal)}</td>
                              <td style={{textAlign: 'center', color: '#27ae60', fontWeight: 'bold', fontSize: '16px'}}>{Math.round(Number(predictedVal))}</td>
                              <td style={{textAlign: 'center', color: delta > 0 ? '#27ae60' : (delta < 0 ? '#e74c3c' : '#95a5a6'), fontWeight: 'bold'}}>
                                {delta > 0 ? '+' : ''}{Math.round(delta)} ({deltaPercent}%)
                              </td>
                              <td style={{textAlign: 'center', color: statusColor, fontWeight: 'bold'}}>{status}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>

                    <div style={{marginTop: '1rem', padding: '1rem', backgroundColor: '#f0f9ff', border: '1px solid #bfdbfe', borderRadius: '8px'}}>
                      <h4 style={{margin: '0 0 0.75rem 0', color: '#1e40af'}}>📊 Prediction Summary</h4>
                      <div style={{display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', fontSize: '14px'}}>
                        <div>
                          <strong>Input Marks Used:</strong>
                          <ul style={{margin: '0.5rem 0 0 0', paddingLeft: '1.5rem', fontSize: '13px'}}>
                            <li>English: {(marksPrediction.input_marks || marksPrediction.inputData)?.english || 'N/A'}</li>
                            <li>Math: {(marksPrediction.input_marks || marksPrediction.inputData)?.math || 'N/A'}</li>
                            <li>Sinhala: {(marksPrediction.input_marks || marksPrediction.inputData)?.sinhala || 'N/A'}</li>
                          </ul>
                        </div>
                        <div>
                          <strong>Additional Info:</strong>
                          <ul style={{margin: '0.5rem 0 0 0', paddingLeft: '1.5rem', fontSize: '13px'}}>
                            <li>Tamil: {(marksPrediction.input_marks || marksPrediction.inputData)?.tamil || 'N/A'}</li>
                            <li>Environment: {(marksPrediction.input_marks || marksPrediction.inputData)?.env || 'N/A'}</li>
                            <li>Attendance: {(marksPrediction.input_marks || marksPrediction.inputData)?.attendance || 'N/A'}%</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    <div style={{marginTop: '1rem', padding: '0.75rem', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px'}}>
                      <strong>🔍 Raw ML Response:</strong>
                      <pre style={{whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '0.75rem', marginTop: '0.5rem', maxHeight: '200px', overflow: 'auto'}}>
                        {JSON.stringify(marksPrediction, null, 2)}
                      </pre>
                    </div>
                  </>
                ) : !marksError && marksPrediction && (
                  <p style={{color: '#6b7280', fontStyle: 'italic'}}>No prediction data available. The model may not have generated predictions for this student.</p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className={styles.empty}>Click Analyze to view detailed risk assessment with charts</div>
        )}
      </main>
    </div>
  );
};

export default DropoutRiskPage;

