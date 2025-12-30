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

const StudentMarks = ({ view, year, term, searchSubject }) => {
  const [marksData, setMarksData] = useState({});
  const [studentData, setStudentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [predictions, setPredictions] = useState(null);
  const [predictionLoading, setPredictionLoading] = useState(false);

  // Helper function to format subject names
  const formatSubjectName = (subjectKey) => {
    // Convert snake_case or camelCase to Title Case
    return subjectKey
      .replace(/([A-Z])/g, ' $1') // Add space before capital letters
      .replace(/_/g, ' ') // Replace underscores with spaces
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
      .trim();
  };

  // Fetch student marks data
  useEffect(() => {
    const fetchMarksData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Use the MY_MARKS endpoint to get current student's marks
        const marksRes = await axios.get(API_ENDPOINTS.MARKS.MY_MARKS, {
          headers: getAuthHeaders(),
        });
        
        const { student, marks, subjects } = marksRes.data;
        
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

  // Fetch ML predictions
  useEffect(() => {
    const fetchPredictions = async () => {
      try {
        setPredictionLoading(true);
        const predictionRes = await axios.post(
          API_ENDPOINTS.ML.PREDICT_MARKS,
          {
            year: Number(year),
            term: Number(term),
          },
          {
            headers: getAuthHeaders(),
          }
        );
        setPredictions(predictionRes.data);
      } catch (err) {
        console.error("Error fetching predictions:", err);
        // Don't show error to user if ML service is unavailable
        if (err.response?.status !== 503) {
          console.warn("ML prediction unavailable:", err.message);
        }
        setPredictions(null);
      } finally {
        setPredictionLoading(false);
      }
    };

    // Only fetch predictions if we have marks data
    if (!loading && marksData && Object.keys(marksData).length > 0) {
      fetchPredictions();
    }
  }, [year, term, loading, marksData]);

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
  );

  // -------- Term-wise totals & averages for all subjects ----------
  const termSummary = termsToShow.map((t) => {
    const termMarks = marksData[t] || [];
    // Filter by year if provided
    const filteredMarks = Array.isArray(termMarks) 
      ? termMarks.filter(m => !year || !m.year || Number(m.year) === Number(year))
      : [];
    
    const total = filteredMarks.reduce((sum, subj) => sum + (subj.marks || 0), 0);
    const avg = filteredMarks.length > 0
      ? Math.round(total / filteredMarks.length)
      : 0;

    return {
      term: t,
      total,
      avg,
      rank: "N/A", // Would need to calculate from class data
    };
  });

  // -------- Subject summaries (only for table display) -----------
  const summary = filtered.map((subj) => {
    const vals = termsToShow.map((t) => {
      const termMarks = marksData[t] || [];
      const found = Array.isArray(termMarks)
        ? termMarks.find((x) => {
            // Match subject and filter by year if provided
            const subjectMatch = x.subject === subj;
            const yearMatch = !year || !x.year || Number(x.year) === Number(year);
            return subjectMatch && yearMatch;
          })
        : null;
      return found ? found.marks : 0;
    });
    const total = vals.reduce((a, b) => a + b, 0);
    const avg = vals.some(v => v > 0) ? Math.round(total / vals.filter(v => v > 0).length) : 0;
    return { subject: subj, total, avg };
  });

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
      return {
        term: `Term ${t}`,
        Marks: found?.marks || 0,
      };
    }),
  }));

  if (loading) {
    return <div className={styles.tableWrapper}><p>Loading marks data...</p></div>;
  }

  if (error) {
    return <div className={styles.tableWrapper}><p className={styles.error}>{error}</p></div>;
  }

  // Map predictions to subjects (ML model returns predictions for specific subjects)
  const getPredictionForSubject = (subjectName, currentMark) => {
    if (!predictions) return null;
    
    // Try multiple sources for predictions
    const pred = predictions.predicted_marks || predictions.prediction;
    if (!pred) return null;
    
    const subjectLower = subjectName.toLowerCase();
    
    // Check for main 5 subjects
    if (subjectLower.includes("english")) {
      const data = pred.english;
      return data ? (typeof data === 'object' ? data.predicted : data) : null;
    }
    if (subjectLower.includes("math")) {
      const data = pred.math;
      return data ? (typeof data === 'object' ? data.predicted : data) : null;
    }
    if (subjectLower.includes("sinhala")) {
      const data = pred.sinhala;
      return data ? (typeof data === 'object' ? data.predicted : data) : null;
    }
    if (subjectLower.includes("tamil")) {
      const data = pred.tamil;
      return data ? (typeof data === 'object' ? data.predicted : data) : null;
    }
    if (subjectLower.includes("science") || subjectLower.includes("environment")) {
      const data = pred.env;
      return data ? (typeof data === 'object' ? data.predicted : data) : null;
    }
    
    // For other subjects without ML predictions, estimate based on current mark and average improvement
    if (currentMark && currentMark > 0 && predictions.predicted_marks) {
      // Calculate average improvement from the 5 main subjects
      const mainSubjects = ['english', 'math', 'sinhala', 'tamil', 'env'];
      const improvements = [];
      
      mainSubjects.forEach(subj => {
        const data = pred[subj];
        if (data) {
          const curr = predictions.input_marks?.[subj] || predictions.inputData?.[subj] || 50;
          const pred_val = typeof data === 'object' ? data.predicted : data;
          improvements.push(pred_val - curr);
        }
      });
      
      const avgImprovement = improvements.length > 0 
        ? improvements.reduce((a, b) => a + b, 0) / improvements.length 
        : 2;
      
      const estimated = currentMark + avgImprovement;
      return Math.max(0, Math.min(100, estimated));
    }
    
    return null;
  };

  return (
    <div>
      {/* ML Predictions Card - Improved UI */}
      {predictions && (predictions.predicted_marks || predictions.prediction) && (
        <div className={styles.predictionCard}>
          <h3>📊 Predicted Marks vs Current Marks</h3>
          {predictionLoading ? (
            <p>Loading predictions...</p>
          ) : (
            <div className={styles.comparisonTable}>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '15px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f0f0f0', borderBottom: '2px solid #333' }}>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Subject</th>
                    <th style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold', color: '#2c3e50' }}>
                      Current
                    </th>
                    <th style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold', color: '#27ae60' }}>
                      Predicted
                    </th>
                    <th style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold', color: '#3498db' }}>
                      Change
                    </th>
                    <th style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold' }}>Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered && filtered.length > 0 && filtered.map((subject) => {
                    // Get current marks for this subject
                    const termMarks = marksData[String(term)] || [];
                    const currentMark = Array.isArray(termMarks)
                      ? termMarks.find(m => m.subject === subject)?.marks || 0
                      : 0;
                    
                    // Get prediction from ML response
                    const pred = predictions.predicted_marks || predictions.prediction;
                    let predicted = null;
                    let trend = '→';
                    
                    if (pred) {
                      const subjectLower = subject.toLowerCase();
                      if (subjectLower.includes("english") && pred.english) {
                        predicted = typeof pred.english === 'object' ? pred.english.predicted : pred.english;
                        trend = typeof pred.english === 'object' ? pred.english.trend : '→';
                      } else if (subjectLower.includes("math") && pred.math) {
                        predicted = typeof pred.math === 'object' ? pred.math.predicted : pred.math;
                        trend = typeof pred.math === 'object' ? pred.math.trend : '→';
                      } else if (subjectLower.includes("sinhala") && pred.sinhala) {
                        predicted = typeof pred.sinhala === 'object' ? pred.sinhala.predicted : pred.sinhala;
                        trend = typeof pred.sinhala === 'object' ? pred.sinhala.trend : '→';
                      } else if (subjectLower.includes("tamil") && pred.tamil) {
                        predicted = typeof pred.tamil === 'object' ? pred.tamil.predicted : pred.tamil;
                        trend = typeof pred.tamil === 'object' ? pred.tamil.trend : '→';
                      } else if ((subjectLower.includes("science") || subjectLower.includes("environment")) && pred.env) {
                        predicted = typeof pred.env === 'object' ? pred.env.predicted : pred.env;
                        trend = typeof pred.env === 'object' ? pred.env.trend : '→';
                      }
                    }
                    
                    const displayPredicted = predicted !== null ? Math.round(predicted) : Math.round(currentMark);
                    const change = displayPredicted - currentMark;
                    const hasMLPrediction = predicted !== null;
                    
                    // Determine color based on trend
                    let trendColor = '#95a5a6';
                    let trendEmoji = '→';
                    if (trend === 'improvement') {
                      trendColor = '#27ae60';
                      trendEmoji = '📈';
                    } else if (trend === 'decline') {
                      trendColor = '#e74c3c';
                      trendEmoji = '📉';
                    } else {
                      trendColor = '#f39c12';
                      trendEmoji = '→';
                    }
                    
                    return (
                      <tr key={subject} style={{ borderBottom: '1px solid #ecf0f1' }}>
                        <td style={{ padding: '12px', fontWeight: '500' }}>{subject}</td>
                        <td style={{ padding: '12px', textAlign: 'center', color: '#2c3e50', fontSize: '16px', fontWeight: 'bold' }}>
                          {Math.round(currentMark)}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center', color: '#27ae60', fontSize: '16px', fontWeight: 'bold' }}>
                          {displayPredicted}
                        </td>
                        <td style={{ 
                          padding: '12px', 
                          textAlign: 'center', 
                          color: change > 0 ? '#27ae60' : (change < 0 ? '#e74c3c' : '#95a5a6'),
                          fontSize: '14px',
                          fontWeight: 'bold'
                        }}>
                          {change > 0 ? '+' : ''}{change}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center', color: trendColor, fontSize: '16px' }}>
                          {trendEmoji} {trend}
                          {!hasMLPrediction && <span style={{ fontSize: '12px' }}> (est.)</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              
              {(predictions.input_marks || predictions.inputData) && (
                <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#ecf0f1', borderRadius: '5px' }}>
                  <p style={{ marginBottom: '10px', fontWeight: 'bold' }}>Based on Current Marks:</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', fontSize: '14px' }}>
                    <div>English: {(predictions.input_marks || predictions.inputData).english}</div>
                    <div>Math: {(predictions.input_marks || predictions.inputData).math}</div>
                    <div>Sinhala: {(predictions.input_marks || predictions.inputData).sinhala}</div>
                    <div>Tamil: {(predictions.input_marks || predictions.inputData).tamil}</div>
                    <div>Science/Env: {(predictions.input_marks || predictions.inputData).env}</div>
                    <div>Attendance: {(predictions.input_marks || predictions.inputData).attendance}%</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Table for subjects */}
      <div className={styles.tableWrapper}>
        <table id="marks-table" className={styles.table}>
          <thead>
            <tr style={{ backgroundColor: '#34495e', color: 'white' }}>
              <th style={{ padding: '15px', textAlign: 'left', fontWeight: 'bold' }}>Subject</th>
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
              <th style={{ padding: '15px', textAlign: 'center', fontWeight: 'bold' }}>Total</th>
              <th style={{ padding: '15px', textAlign: 'center', fontWeight: 'bold' }}>Average</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={termsToShow.length + 5} style={{ textAlign: 'center', padding: '20px', color: '#7f8c8d' }}>
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
                
                const total = summary.find((s) => s.subject === subj)?.total ?? "-";
                const avg = summary.find((s) => s.subject === subj)?.avg ?? "-";
                const predicted = getPredictionForSubject(subj, currentMark);
                
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
                      {predicted !== null ? Math.round(predicted) : "-"}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center', color: '#34495e' }}>
                      {total !== "-" ? <span style={{ fontWeight: '500' }}>{total}</span> : "-"}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center', color: '#34495e' }}>
                      {avg !== "-" ? <span style={{ fontWeight: '500' }}>{avg}</span> : "-"}
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
          <h4>{subj.subject} — Progress Over Terms</h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={subj.terms}>
              <XAxis dataKey="term" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="Marks" fill="#2563eb" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ))}
    </div>
  );
};

export default StudentMarks;
