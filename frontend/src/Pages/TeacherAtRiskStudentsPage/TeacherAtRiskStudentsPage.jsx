import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Sidebar from "../../Components/Sidebar/Sidebar";
import Header from "../../Components/Header/Header";
import styles from "./TeacherAtRiskStudentsPage.module.css";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, CartesianGrid, XAxis, YAxis } from "recharts";
import { getStoredRole } from "../../utils/auth";
import { API_ENDPOINTS, getAuthHeaders } from "../../config/api";

const COLORS = ["#ef4444", "#f59e0b", "#10b981"];

const TeacherAtRiskStudentsPage = () => {
  const [filter, setFilter] = useState("dropoutRisk");
  const [riskThreshold, setRiskThreshold] = useState("all");
  const [search, setSearch] = useState("");
  const [students, setStudents] = useState([]);
  const [dropoutList, setDropoutList] = useState([]);
  const [riskDist, setRiskDist] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);

  const role = getStoredRole() || "teacher";
  const navigate = useNavigate();

  const normalizeRisk = (value) => {
    if (!value) return "Low";
    const val = value.toString().toLowerCase();
    if (val.includes("high")) return "High";
    if (val.includes("medium")) return "Medium";
    return "Low";
  };

  const getRiskClass = (riskLevel) => {
    const normalized = normalizeRisk(riskLevel);
    if (normalized === "High") return styles.riskHigh;
    if (normalized === "Medium") return styles.riskMedium;
    return styles.riskLow;
  };

  const getRiskText = (item) => {
    const risk =
      item.riskLevel ||
      item.riskAssessment?.level ||
      item.prediction?.risk_level ||
      item.prediction?.riskLevel ||
      item.prediction?.level ||
      item.risk?.risk_level ||
      item.risk ||
      "Low";
    return risk;
  };

  const fetchAssignedStudents = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const classRes = await axios.get(API_ENDPOINTS.CLASS_TEACHERS.MY_CLASS, { headers: getAuthHeaders() });
      const assignment = classRes.data.assignment;

      if (!assignment) {
        setError("No class assignment found for this teacher.");
        setStudents([]);
        setDropoutList([]);
        setRiskDist([]);
        setLoading(false);
        return;
      }

      const grade = assignment.grade;
      const section = assignment.section;
      const stream = assignment.stream || "";
      const query = `grade=${grade}&section=${section}${stream ? `&stream=${stream}` : ""}`;

      const classResponse = await axios.get(`${API_ENDPOINTS.ML.PREDICT_DROPOUT_CLASS}?${query}`, { headers: getAuthHeaders() });

      if (!classResponse.data?.success) {
        setError(classResponse.data?.message || "Class prediction failed");
        setStudents([]);
        setDropoutList([]);
        setRiskDist([]);
        setLoading(false);
        return;
      }

      const predictions = classResponse.data.data || [];
      setDropoutList(predictions);
      setRiskDist([
        { name: "High", value: classResponse.data.distribution?.High || 0 },
        { name: "Medium", value: classResponse.data.distribution?.Medium || 0 },
        { name: "Low", value: classResponse.data.distribution?.Low || 0 },
      ]);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to load at-risk students.");
      setStudents([]);
      setDropoutList([]);
      setRiskDist([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let intervalId;

    const startPolling = async () => {
      await fetchAssignedStudents();
      intervalId = setInterval(fetchAssignedStudents, 60000);
    };

    if (role === "teacher") {
      startPolling();
    }

    return () => clearInterval(intervalId);
  }, [role, fetchAssignedStudents]);

  const list = useMemo(() => {
    const base = filter === "dropoutRisk" ? dropoutList : [];

    const thresholded = base.filter((item) => {
      const level = normalizeRisk(getRiskText(item));
      if (riskThreshold === "all") return true;
      if (riskThreshold === "low") return level === "Low";
      if (riskThreshold === "medium") return level === "Medium";
      if (riskThreshold === "high") return level === "High";
      return true;
    });

    const filtered = search
      ? thresholded.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()))
      : thresholded;

    return filtered.sort((a, b) => {
      const aRisk = normalizeRisk(getRiskText(a));
      const bRisk = normalizeRisk(getRiskText(b));
      const riskOrder = { "High": 0, "Medium": 1, "Low": 2 };
      return riskOrder[aRisk] - riskOrder[bRisk];
    });
  }, [filter, search, dropoutList, riskThreshold]);

  if (loading) return (
    <div className={styles.dashboard}>
      <Sidebar role={role} />
      <main className={styles.main}>
        <Header title="At-Risk Students" />
        <p>Loading...</p>
      </main>
    </div>
  );

  return (
    <div className={styles.dashboard}>
      <Sidebar role={role} />
      <main className={styles.main}>
        <Header title="At-Risk Students" />
        <h1 className={styles.title}>At-Risk Students</h1>
        <p className={styles.subtitle}>Students identified by dropout model predictions</p>

        <div className={styles.controls}>
          <div className={styles.tabs}>
            <button className={filter === "dropoutRisk" ? styles.activeTab : ""} onClick={() => setFilter("dropoutRisk")}>🚨 Dropout Risk</button>
          </div>

          <div className={styles.filterGroup}>
            <label htmlFor="riskThreshold">Show risk:</label>
            <select
              id="riskThreshold"
              value={riskThreshold}
              onChange={(e) => setRiskThreshold(e.target.value)}
            >
              <option value="all">All</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>

          <div className={styles.searchWrap}>
            <input placeholder="Search student..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>

          <button onClick={fetchAssignedStudents} className={styles.refreshBtn} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.contentRow}>
          <div className={styles.list}>
            {list.length === 0 ? (
              <div className={styles.empty}>No at-risk students yet. Use refresh to check again.</div>
            ) : (
              list.map((s) => {
                const riskText = getRiskText(s);
                const normalized = normalizeRisk(riskText);
                const riskScore = Number(s.riskScore ?? s.riskAssessment?.score ?? s.prediction?.risk_score ?? s.prediction?.riskScore ?? 0);
                const attendancePct = s.attendance ?? s.inputData?.attendance_percentage ?? s.prediction?.inputData?.attendance_percentage ?? 0;
                const averageMarks = s.averageMarks ?? s.avgMarks ?? s.prediction?.averageMarks ?? s.prediction?.avgMarks ?? 0;

                let cardClass = styles.studentCardLow;
                if (normalized === "High") cardClass = styles.studentCardHigh;
                else if (normalized === "Medium") cardClass = styles.studentCardMedium;

                return (
                  <div key={s.studentId || s.id || s.name} className={`${styles.studentCard} ${cardClass}`}>
                    <div className={styles.cardContent}>
                      <div className={styles.cardHeader}>
                        <div className={styles.name}>{s.name || s.firstName + " " + s.lastName}</div>
                        <span className={`${styles.riskBadge} ${getRiskClass(riskText)}`}>{normalized}</span>
                      </div>
                      <div className={styles.cardDetails}>
                        <div className={styles.detail}>
                          <span className={styles.label}>ID:</span>
                          <span className={styles.value}>{s.studentId || s.id}</span>
                        </div>
                        <div className={styles.detail}>
                          <span className={styles.label}>Grade:</span>
                          <span className={styles.value}>{s.grade}/{s.section}</span>
                        </div>
                        <div className={styles.detail}>
                          <span className={styles.label}>Score:</span>
                          <span className={styles.value}>{(riskScore * 100).toFixed(0)}%</span>
                        </div>
                        <div className={styles.detail}>
                          <span className={styles.label}>Attend:</span>
                          <span className={styles.value}>{attendancePct}%</span>
                        </div>
                        <div className={styles.detail}>
                          <span className={styles.label}>Marks:</span>
                          <span className={styles.value}>{averageMarks}</span>
                        </div>
                      </div>
                    </div>
                    <button className={styles.expandBtn} onClick={() => setSelectedStudent(s)}>
                      →
                    </button>
                  </div>
                );
              })
            )}
          </div>

          <div className={styles.sideCard}>
            <h4>Risk Distribution</h4>
            {!riskDist.length || riskDist.reduce((sum, v) => sum + v.value, 0) === 0 ? (
              <p>No risk distribution data yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={riskDist} dataKey="value" nameKey="name" outerRadius={80} label>
                    {riskDist.map((entry, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {selectedStudent && (
          <div className={styles.modalOverlay} onClick={() => setSelectedStudent(null)}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
              <button className={styles.closeBtn} onClick={() => setSelectedStudent(null)}>✕</button>
              
              <div className={styles.modalHeader}>
                <div>
                  <h2>{selectedStudent.name || selectedStudent.firstName + " " + selectedStudent.lastName}</h2>
                  <p className={styles.studentId}>ID: {selectedStudent.studentId || selectedStudent.id}</p>
                </div>
                <span className={`${styles.riskBadge} ${getRiskClass(selectedStudent.riskLevel || selectedStudent.riskAssessment?.level || selectedStudent.prediction?.risk_level || "Low")}`}>
                  {normalizeRisk(selectedStudent.riskLevel || selectedStudent.riskAssessment?.level || selectedStudent.prediction?.risk_level || "Low")}
                </span>
              </div>

              <div className={styles.modalBody}>
                <div className={styles.quickInfoGrid}>
                  <div className={styles.infoCard}>
                    <div className={styles.infoLabel}>Risk Score</div>
                    <div className={styles.infoBigValue}>{(Number(selectedStudent.riskScore ?? selectedStudent.riskAssessment?.score ?? selectedStudent.prediction?.risk_score ?? 0) * 100).toFixed(0)}%</div>
                  </div>
                  <div className={styles.infoCard}>
                    <div className={styles.infoLabel}>Attendance</div>
                    <div className={styles.infoBigValue}>{selectedStudent.attendance ?? selectedStudent.inputData?.attendance_percentage ?? selectedStudent.prediction?.inputData?.attendance_percentage ?? 0}%</div>
                  </div>
                  <div className={styles.infoCard}>
                    <div className={styles.infoLabel}>Avg Marks</div>
                    <div className={styles.infoBigValue}>{selectedStudent.averageMarks ?? selectedStudent.avgMarks ?? selectedStudent.prediction?.averageMarks ?? selectedStudent.prediction?.avgMarks ?? 0}</div>
                  </div>
                  <div className={styles.infoCard}>
                    <div className={styles.infoLabel}>Grade</div>
                    <div className={styles.infoBigValue}>{selectedStudent.grade}/{selectedStudent.section}</div>
                  </div>
                </div>

                <div className={styles.modalChartSection}>
                  <h4>Risk Factors</h4>
                  <ResponsiveContainer width="100%" height={180}>
                    <RadarChart data={[
                      { factor: "Attendance", value: selectedStudent.attendance ?? selectedStudent.inputData?.attendance_percentage ?? 0 },
                      { factor: "Marks", value: Math.min(selectedStudent.averageMarks ?? selectedStudent.avgMarks ?? 0, 100) },
                      { factor: "Engagement", value: 70 }
                    ]}>
                      <PolarGrid stroke="#e5e7eb" />
                      <PolarAngleAxis dataKey="factor" stroke="#6b7280" fontSize={12} />
                      <PolarRadiusAxis angle={90} domain={[0, 100]} stroke="#6b7280" fontSize={11} />
                      <Radar name="Score" dataKey="value" stroke="#ef4444" fill="#ef4444" fillOpacity={0.6} />
                      <Tooltip />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>

                <div className={styles.modalChartSection}>
                  <h4>Performance Overview</h4>
                  <ResponsiveContainer width="100%" height={150}>
                    <BarChart data={[
                      { metric: "Attendance", value: selectedStudent.attendance ?? 0, fill: "#10b981" },
                      { metric: "Marks", value: Math.min(selectedStudent.averageMarks ?? 0, 100), fill: "#3b82f6" },
                      { metric: "Risk", value: 100 - (Number(selectedStudent.riskScore ?? 0) * 100), fill: "#f59e0b" }
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="metric" stroke="#6b7280" fontSize={12} />
                      <YAxis stroke="#6b7280" fontSize={11} domain={[0, 100]} />
                      <Tooltip />
                      <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                        {[
                          { metric: "Attendance", fill: "#10b981" },
                          { metric: "Marks", fill: "#3b82f6" },
                          { metric: "Risk", fill: "#f59e0b" }
                        ].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className={styles.modalSection}>
                  <h4>Parent Contact</h4>
                  <div className={styles.parentInfo}>
                    <div className={styles.parentCard}>
                      <div className={styles.parentLabel}>👨 Father</div>
                      <div className={styles.parentName}>{selectedStudent.parents?.father?.name || "Not Available"}</div>
                      <div className={styles.parentContact}>
                        {selectedStudent.parents?.father?.contact ? (
                          <a href={`tel:${selectedStudent.parents.father.contact}`} className={styles.contactLink}>
                            📞 {selectedStudent.parents.father.contact}
                          </a>
                        ) : (
                          <span className={styles.noContact}>No contact info</span>
                        )}
                      </div>
                    </div>
                    <div className={styles.parentCard}>
                      <div className={styles.parentLabel}>👩 Mother</div>
                      <div className={styles.parentName}>{selectedStudent.parents?.mother?.name || "Not Available"}</div>
                      <div className={styles.parentContact}>
                        {selectedStudent.parents?.mother?.contact ? (
                          <a href={`tel:${selectedStudent.parents.mother.contact}`} className={styles.contactLink}>
                            📞 {selectedStudent.parents.mother.contact}
                          </a>
                        ) : (
                          <span className={styles.noContact}>No contact info</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className={styles.modalActions}>
                  <button 
                    className={styles.viewDetailBtn} 
                    onClick={() => { navigate('/StudentDetailsPage', { state: { student: selectedStudent } }); setSelectedStudent(null); }}
                  >
                    📊 View All Details
                  </button>
                  {selectedStudent.parents?.father?.contact && (
                    <a href={`tel:${selectedStudent.parents.father.contact}`} className={styles.callBtn}>
                      📞 Call Father
                    </a>
                  )}
                  {selectedStudent.parents?.mother?.contact && (
                    <a href={`tel:${selectedStudent.parents.mother.contact}`} className={styles.callBtn}>
                      📞 Call Mother
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default TeacherAtRiskStudentsPage;

