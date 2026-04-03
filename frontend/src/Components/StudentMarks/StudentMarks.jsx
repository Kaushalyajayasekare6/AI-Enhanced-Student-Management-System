import React, { useState, useEffect } from "react";
import styles from "./StudentMarks.module.css";
import axios from "axios";
import { API_ENDPOINTS, getAuthHeaders } from "../../config/api";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";

const StudentMarks = ({ view = "term", year, term, searchSubject, studentId }) => {
  const [marksData, setMarksData] = useState({});
  const [studentData, setStudentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [predictions, setPredictions] = useState(null);
  const [predictionsByTerm, setPredictionsByTerm] = useState({});
  const [predictionLoading, setPredictionLoading] = useState(false);
  const [predictionError, setPredictionError] = useState(null);

  // Helper function to format subject names
  const formatSubjectName = (subjectKey) => {
    if (subjectKey === "assignmentPercentage") return "Assignment %";
    // Convert snake_case or camelCase to Title Case
    return subjectKey
      .replace(/([A-Z])/g, ' $1') // Add space before capital letters
      .replace(/_/g, ' ') // Replace underscores with spaces
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
      .trim();
  };

  const isAssignmentSubject = (subjectNameOrKey = "") => {
    const value = String(subjectNameOrKey).toLowerCase();
    return value === "assignment %" || value === "assignmentpercentage";
  };

  // Fetch student marks data
  useEffect(() => {
    const fetchMarksData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Use MY_MARKS or STUDENT endpoint based on studentId prop (teacher context)
        const marksEndpoint = studentId ? 
          `${API_ENDPOINTS.MARKS.STUDENT}?studentId=${studentId}&year=${Number(year)}` :
          API_ENDPOINTS.MARKS.MY_MARKS;
        const marksRes = await axios.get(marksEndpoint, {
          headers: getAuthHeaders(),
        });
        
        const { student, marks } = marksRes.data;
        
        if (student) {
          setStudentData(student);
        }
        
        // Transform marks from Marks model to our format
        // marks is an array of { year, term, marks: { subject: value } }
        const formattedMarks = {};
        if (marks && Array.isArray(marks)) {
          marks.forEach(record => {
            // Filter by year if provided
            if (year && Number(record.year) !== Number(year)) {
              return;
            }
            
            const termKey = String(record.term);
            if (!formattedMarks[termKey]) {
              formattedMarks[termKey] = [];
            }
            
            // Convert marks object to array format
            if (record.marks && typeof record.marks === 'object') {
              Object.keys(record.marks).forEach(subject => {
                const value = record.marks[subject];
                if (value !== null && value !== undefined) {
                  formattedMarks[termKey].push({
                    subject: formatSubjectName(subject),
                    subjectKey: subject, // Keep original key for reference
                    marks: value,
                    year: record.year,
                    term: record.term
                  });
                }
              });
            }
          });
        }
        
        setMarksData(formattedMarks);
      } catch (err) {
        console.error("Error fetching marks data:", err);
        setError("Failed to fetch marks data: " + (err.response?.data?.message || err.message));
      } finally {
        setLoading(false);
      }
    };

    fetchMarksData();
  }, [year, term]);

  // Fetch ML predictions (only for grade 1-5) using student marks from DB
  useEffect(() => {
    const fetchTermPredictions = async (studentId) => {
      const predictedList = {};

      // Attempt to fetch term-based predictions for Term 2 and Term 3
      for (const predictTerm of [2, 3]) {
        try {
          const termPredictionRes = await axios.post(
            API_ENDPOINTS.ML.PREDICT_TERM_MARKS,
            { studentId, predictTerm, year: Number(year) },
            { headers: getAuthHeaders() }
          );
          if (termPredictionRes.data && termPredictionRes.data.success !== false) {
            predictedList[String(predictTerm)] = termPredictionRes.data;
          }
        } catch (termError) {
          console.warn(`Term ${predictTerm} prediction unavailable:`, termError);
        }
      }

      setPredictionsByTerm(predictedList);
    };

    const fetchPredictions = async () => {
      try {
        setPredictionError(null);
        setPredictionLoading(true);

        if (!studentData || !studentData.grade) {
          setPredictionError("Student grade not available for prediction");
          setPredictions(null);
          setPredictionsByTerm({});
          return;
        }

        const gradeMatch = String(studentData.grade).match(/(\d+)/);
        const gradeValue = gradeMatch ? Number(gradeMatch[1]) : null;

        if (!gradeValue || gradeValue < 1 || gradeValue > 5) {
          setPredictionError("Marks prediction is supported only for grades 1 to 5.");
          setPredictions(null);
          setPredictionsByTerm({});
          return;
        }

        const studentId = studentData.id || studentData._id;
        const body = {
          studentId,
          year: Number(year),
          term: Number(term),
        };

        const predictionRes = await axios.post(API_ENDPOINTS.ML.PREDICT_MARKS, body, {
          headers: getAuthHeaders(),
        });

        if (predictionRes.data && predictionRes.data.success === false) {
          throw new Error(predictionRes.data.message || "Prediction failed");
        }

        setPredictions(predictionRes.data);
        await fetchTermPredictions(studentId);
      } catch (err) {
        console.error("Error fetching predictions:", err);
        const errMsg =
          err.response?.data?.message ||
          err.response?.data?.error ||
          err.message ||
          "Unable to fetch predictions";
        setPredictionError(errMsg);
        setPredictions(null);
        setPredictionsByTerm({});
      } finally {
        setPredictionLoading(false);
      }
    };

    // Fetch predictions once student data is loaded (don't wait for marksData)
    if (!loading && studentData) {
      fetchPredictions();
    }
  }, [year, term, loading, studentData]);

  const termsToShow = view === "year" ? ["1", "2", "3"] : [String(term)];
  
  // Get all unique subjects from the marks data, filtered by year and term
  const subjects = [];
  Object.entries(marksData).forEach(([termKey, termMarks]) => {
    // Only include terms we want to show
    if (!termsToShow.includes(termKey)) return;
    
    if (Array.isArray(termMarks)) {
      termMarks.forEach(mark => {
        // Filter by year if provided
        if (year && mark.year && Number(mark.year) !== Number(year)) return;
        
        if (mark.subject && !subjects.includes(mark.subject)) {
          subjects.push(mark.subject);
        }
      });
    }
  });

  const filtered = subjects.filter((s) =>
    s.toLowerCase().includes(searchSubject.toLowerCase())
  ).sort((a, b) => {
    const aAssign = isAssignmentSubject(a);
    const bAssign = isAssignmentSubject(b);
    if (aAssign && !bAssign) return 1;
    if (!aAssign && bAssign) return -1;
    return a.localeCompare(b);
  });

  // -------- Term-wise totals & averages for all subjects ----------
  const termSummary = termsToShow.map((t) => {
    const termMarks = marksData[t] || [];
    // Filter by year if provided
    const filteredMarks = Array.isArray(termMarks) 
      ? termMarks.filter(m => !year || !m.year || Number(m.year) === Number(year))
      : [];
    
    const academicMarks = filteredMarks.filter((subj) => !isAssignmentSubject(subj.subject));
    const total = academicMarks.reduce((sum, subj) => sum + (subj.marks || 0), 0);
    const avg = academicMarks.length > 0
      ? Math.round(total / academicMarks.length)
      : 0;

    return {
      term: t,
      total,
      avg,
      rank: "N/A", // Would need to calculate from class data
    };
  });

  const subjectMapping = {
    maths: 'math',
    math: 'math',
    science: 'env',
    environment: 'env',
    religious: 'religion',
    religion: 'religion',
    sinhala: 'sinhala',
    tamil: 'tamil',
    english: 'english',
  };

  const normalizeSubjectKey = (subjectName) => {
    if (!subjectName) return '';
    return subjectName.toString().trim().toLowerCase().replace(/\s+/g, '').replace('%', '');
  };

  const getPredictionFromObject = (subjectName, pred) => {
    if (!pred || typeof pred !== 'object') return null;

    const subjectLower = normalizeSubjectKey(subjectName);
    const mlKey = subjectMapping[subjectLower] || subjectLower;

    // Try direct key and variants
    const candidates = [mlKey, subjectLower, subjectName, subjectName.toLowerCase(), subjectName.toUpperCase()];

    for (const key of candidates) {
      if (key && pred[key] !== undefined && pred[key] !== null) {
        const value = pred[key];
        return typeof value === 'object' ? value.predicted ?? value.value ?? null : value;
      }
    }

    for (const key of Object.keys(pred)) {
      if (key.toLowerCase().includes(subjectLower) || subjectLower.includes(key.toLowerCase())) {
        const value = pred[key];
        return typeof value === 'object' ? value.predicted ?? value.value ?? null : value;
      }
    }

    return null;
  };

  const getPredictionForSubject = (subjectName, termKey) => {
    const termNum = Number(termKey);
    // Term 1 is not predicted; predictions can only be term 2/3
    if (termNum === 1) return null;

    // Prefer term-based ML endpoint (predict-term-marks) for term 2/3
    const termPred = predictionsByTerm?.[String(termKey)];
    if (termPred) {
      const termData = termPred.predicted_marks || termPred.prediction || termPred;
      const termValue = getPredictionFromObject(subjectName, termData);
      if (termValue !== null && termValue !== undefined) {
        return termValue;
      }
    }

    // If term-based data is not available, use the current insurance path for the selected term
    const selectedTermKey = String(term);
    if (String(termKey) === selectedTermKey && predictions) {
      return getPredictionFromObject(subjectName, predictions.predicted_marks || predictions.prediction);
    }

    // Fallback: if predictions has general data
    if (predictions) {
      return getPredictionFromObject(subjectName, predictions.predicted_marks || predictions.prediction);
    }

    return null;
  };

  // -------- Charts data per subject ------------------------------
  const subjectCharts = filtered.map((s) => ({
    subject: s,
    terms: ["1", "2", "3"].map((t) => {
      const termMarks = marksData[t] || [];
      const found = Array.isArray(termMarks)
        ? termMarks.find((x) => {
            // Match subject and filter by year if provided
            const subjectMatch = x.subject === s;
            const yearMatch = !year || !x.year || Number(x.year) === Number(year);
            return subjectMatch && yearMatch;
          })
        : null;
      const actual = found?.marks || 0;
      const predicted = getPredictionForSubject(s, t);
      return {
        term: `Term ${t}`,
        Actual: actual,
        Predicted: predicted !== null && predicted !== undefined ? predicted : null,
      };
    }),
  }));

  return (
    <div>
      {/* ML Predictions Card - Improved UI */}
      {predictionError && (
        <div className={styles.error} style={{ marginBottom: '1rem' }}>
          {predictionError}
        </div>
      )}

      {predictions && (predictions.predicted_marks || predictions.prediction) ? (
        <div className={styles.predictionCard}>
          <h3>📊 Predicted Marks vs Current Marks</h3>
          {predictionLoading ? (
            <p>Loading predictions...</p>
          ) : (
            <div>
            <table className={styles.predictionTable}>
              <thead>
                <tr>
                  <th>Subject</th>
                  <th style={{ textAlign: 'center', color: '#2c3e50' }}>Current</th>
                  <th style={{ textAlign: 'center', color: '#27ae60' }}>Predicted</th>
                  <th style={{ textAlign: 'center', color: '#3498db' }}>Change</th>
                  <th style={{ textAlign: 'center' }}>Trend</th>
                </tr>
              </thead>
                <tbody>
                  {filtered && filtered.length > 0 && filtered.map((subject) => {
                    // Get current marks for this subject
                    const termMarks = marksData[String(term)] || [];
                    const currentMark = Array.isArray(termMarks)
                      ? termMarks.find(m => m.subject === subject)?.marks || 0
                      : 0;
                    
                    // Get prediction from ML response (for selected term)
                    const predicted = getPredictionForSubject(subject, String(term));
                    const change = predicted !== null ? predicted - currentMark : 0;
                    const hasMLPrediction = predicted !== null;
                    
                    // Determine trend based on change
                    let trend = 'stable';
                    let trendColor = '#95a5a6';
                    let trendEmoji = '→';
                    
                    if (change > 5) {
                      trend = 'improvement';
                      trendColor = '#27ae60';
                      trendEmoji = '📈';
                    } else if (change < -5) {
                      trend = 'decline';
                      trendColor = '#e74c3c';
                      trendEmoji = '📉';
                    } else {
                      trend = 'stable';
                      trendColor = '#f39c12';
                      trendEmoji = '→';
                    }
                    
                    return (
                      <tr key={subject}>
                        <td style={{ fontWeight: '500' }}>{subject}</td>
                        <td style={{ textAlign: 'center', color: '#2c3e50', fontSize: '16px', fontWeight: 'bold' }}>
                          {Math.round(currentMark)}
                        </td>
                        <td style={{ textAlign: 'center', color: '#27ae60', fontSize: '16px', fontWeight: 'bold' }}>
                          {hasMLPrediction ? Math.round(predicted) : 'N/A'}
                        </td>
                        <td style={{ 
                          textAlign: 'center', 
                          color: change > 0 ? '#27ae60' : (change < 0 ? '#e74c3c' : '#95a5a6'),
                          fontSize: '14px',
                          fontWeight: 'bold'
                        }}>
                          {hasMLPrediction ? (change > 0 ? '+' : '') + Math.round(change) : '-'}
                        </td>
                        <td style={{ textAlign: 'center', color: trendColor, fontSize: '16px' }}>
                          {trendEmoji} {trend}
                          {!hasMLPrediction && <span style={{ fontSize: '12px' }}> (no data)</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              
              {predictions && predictions.input_marks && (
                <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#ecf0f1', borderRadius: '5px' }}>
                  <p style={{ marginBottom: '10px', fontWeight: 'bold' }}>Based on Current Marks:</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', fontSize: '14px' }}>
                    <div>English: {predictions.input_marks.english}</div>
                    <div>Math: {predictions.input_marks.math}</div>
                    <div>Sinhala: {predictions.input_marks.sinhala}</div>
                    <div>Tamil: {predictions.input_marks.tamil}</div>
                    <div>Science/Env: {predictions.input_marks.env}</div>
                    <div>Religion: {predictions.input_marks.religion}</div>
                    <div>Attendance: {predictions.input_marks.attendance}%</div>
                  </div>
                </div> )}
            </div>
            )}
          {/* Debug: Raw ML Response - commented out for now */}
          {/* <div style={{marginTop: '1rem', padding: '0.75rem', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px'}}>
            <strong>🔍 Raw ML Response:</strong>
            <pre style={{whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '0.75rem', marginTop: '0.5rem', maxHeight: '200px', overflow: 'auto'}}>
              {JSON.stringify(predictions, null, 2)}
            </pre>
          </div> */}
        </div>
      ) : predictions && !predictionError ? (
        <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: '#fff3cd', border: '1px solid #ffc107', borderRadius: '8px' }}>
          <strong>⚠️ No prediction data found in response.</strong><br />
          <small>Expected: `predicted_marks` or `prediction`. Received fields: {Object.keys(predictions || {}).join(', ')}</small>
          <details style={{marginTop: '0.5rem'}}>
            <summary>Show raw response</summary>
            <pre style={{fontSize: '0.7rem', marginTop: '0.5rem', backgroundColor: '#f9f9f9', padding: '0.5rem', borderRadius: '4px'}}>
              {JSON.stringify(predictions, null, 2)}
            </pre>
          </details>
        </div>
       ) : null}
      <div className={styles.tableWrapper}>
        <table id="marks-table" className={styles.table}>
          <thead>
            <tr style={{ backgroundColor: '#34495e', color: 'white' }}>
              <th style={{ padding: '15px', textAlign: 'left', fontWeight: 'bold' }}>Subject</th>
              <th style={{ padding: '15px', textAlign: 'center', fontWeight: 'bold' }}>Class</th>
              {termsToShow.map((t) => (
                <th key={t} style={{ padding: '15px', textAlign: 'center', fontWeight: 'bold' }}>
                  Term {t}
                </th>
              ))}
              <th style={{ padding: '15px', textAlign: 'center', fontWeight: 'bold', backgroundColor: '#27ae60' }}>
                Current
              </th>
              <th style={{ padding: '15px', textAlign: 'center', fontWeight: 'bold', backgroundColor: '#2980b9' }}>
                Predicted
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={termsToShow.length + 4} style={{ textAlign: 'center', padding: '20px', color: '#7f8c8d' }}>
                  No subjects found
                </td>
              </tr>
            ) : (
              filtered.map((subj, idx) => {
                const rowTotals = termsToShow.map((t) => {
                  const termMarks = marksData[t] || [];
                  const found = Array.isArray(termMarks)
                    ? termMarks.find((x) => {
                        const subjectMatch = x.subject === subj;
                        const yearMatch = !year || !x.year || Number(x.year) === Number(year);
                        return subjectMatch && yearMatch;
                      })
                    : null;
                  return found ? found.marks : "-";
                });
                
                // Get current marks (from the selected term)
                const termMarks = marksData[String(term)] || [];
                const currentMark = Array.isArray(termMarks)
                  ? termMarks.find(m => m.subject === subj)?.marks || 0
                  : 0;
                
                const predicted = getPredictionForSubject(subj, String(term));
                
                const isAssignment = isAssignmentSubject(subj);
                const predictionColor = predicted && predicted > currentMark ? '#27ae60' : (predicted && predicted < currentMark ? '#e74c3c' : '#95a5a6');
                
                return (
                  <tr key={idx} style={{ 
                    borderBottom: '1px solid #ecf0f1',
                    backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8f9fa',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#eef5fb'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = (idx % 2 === 0 ? '#ffffff' : '#f8f9fa')}
                  >
                    <td style={{ padding: '12px', fontWeight: '600', color: '#2c3e50' }}>{subj}</td>
                    <td style={{ padding: '12px', textAlign: 'center', color: '#34495e' }}>
                      {studentData ? `${studentData.grade || "N/A"}${studentData.section ? ` ${studentData.section}` : ""}` : "N/A"}
                    </td>
                    {rowTotals.map((v, i) => (
                      <td key={i} style={{ padding: '12px', textAlign: 'center', color: '#34495e' }}>
                        {v !== "-" ? <span style={{ fontWeight: '500' }}>{v}</span> : "-"}
                      </td>
                    ))}
                    <td style={{ 
                      padding: '12px', 
                      textAlign: 'center', 
                      fontWeight: 'bold',
                      color: '#27ae60',
                      backgroundColor: '#d5f4e6',
                      borderRadius: '5px',
                      fontSize: '15px'
                    }}>
                      {Math.round(currentMark)}
                    </td>
                    <td style={{ 
                      padding: '12px', 
                      textAlign: 'center', 
                      fontWeight: 'bold',
                      color: predictionColor,
                      backgroundColor: '#dbe9f7',
                      borderRadius: '5px',
                      fontSize: '15px'
                    }}>
                      {isAssignment ? "N/A" : (predicted !== null ? Math.round(predicted) : "-")}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ------- NEW SECTION: Term summary totals -------- */}
      <div className={styles.termSummary}>
        <h4>Overall Term Summary</h4>
        <table className={styles.summaryTable}>
          <thead>
            <tr>
              <th>Term</th>
              <th>Total Marks</th>
              <th>Average</th>
              <th>Class Position</th>
            </tr>
          </thead>
          <tbody>
            {termSummary.map((s, idx) => (
              <tr key={idx}>
                <td>Term {s.term}</td>
                <td>{s.total}</td>
                <td>{s.avg}</td>
                <td>{s.rank}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Charts for each subject */}
      {subjectCharts.map((subj, idx) => (
        <div key={idx} className={styles.chartCard}>
          <h4>
            {subj.subject}
            {isAssignmentSubject(subj.subject) ? " — Assignment Completion %" : " — Progress Over Terms"}
          </h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={subj.terms}>
              <XAxis dataKey="term" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="Actual" fill={isAssignmentSubject(subj.subject) ? "#f59e0b" : "#2563eb"} />
              <Bar dataKey="Predicted" fill="#27ae60" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ))}
    </div>
  );
};

export default StudentMarks;
