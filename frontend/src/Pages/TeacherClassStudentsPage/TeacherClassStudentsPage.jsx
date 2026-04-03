import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../Components/Sidebar/Sidebar";
import Header from "../../Components/Header/Header";
import styles from "./TeacherClassStudentsPage.module.css";
import { getStoredRole } from "../../utils/auth";
import axios from "axios";
import { API_ENDPOINTS, getAuthHeaders } from "../../config/api";
import jsPDF from "jspdf";

const TeacherClassStudentsPage = () => {
  const [search, setSearch] = useState("");
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentDetails, setStudentDetails] = useState(null);
  const [studentMarks, setStudentMarks] = useState([]);
  const [studentAttendance, setStudentAttendance] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("personal");
  const navigate = useNavigate();
  const role = getStoredRole() || "teacher";

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        setLoading(true);
        const res = await axios.get(API_ENDPOINTS.ATTENDANCE.TEACHER_STUDENTS, {
          headers: getAuthHeaders(),
        });
        const classStudents = res.data.students || [];
        setStudents(classStudents);
      } catch (err) {
        console.error("Error fetching teacher students:", err);
        setStudents([]);
      } finally {
        setLoading(false);
      }
    };
    fetchStudents();
  }, []);

  const filteredStudents = students.filter(
    (s) =>
      s.firstName?.toLowerCase().includes(search.toLowerCase()) ||
      s.lastName?.toLowerCase().includes(search.toLowerCase()) ||
      s.enrollmentNo?.toLowerCase().includes(search.toLowerCase()) ||
      s.enrolment?.toLowerCase().includes(search.toLowerCase())
  );

const computeAttStats = (attendance) => {
  const present = attendance.filter(a => a.status === 'P').length;
  const absent = attendance.filter(a => a.status === 'A').length;
  const total = attendance.length || 180;
  const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
  return { percentage, present, total, absent };
};

  const computeMonthlyStats = (attendance) => {
    const monthly = {};
    attendance.forEach(a => {
      const date = new Date(a.date);
      const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      if (!monthly[monthKey]) monthly[monthKey] = { present: 0, total: 0 };
      monthly[monthKey].total += 1;
      if (a.status === 'P') monthly[monthKey].present += 1;
    });
    return Object.entries(monthly)
      .map(([month, data]) => ({
        month: month.slice(0,3),
        perc: data.total > 0 ? Math.round((data.present / data.total) * 100) : 0
      }))
      .slice(-6)
      .reverse();
  };

  const computeMarkAvg = (marks) => {
    let sum = 0;
    let count = 0;
    marks.forEach(m => {
      Object.values(m.marks || {}).forEach(score => {
        if (typeof score === 'number') {
          sum += score;
          count += 1;
        }
      });
    });
    return count > 0 ? Math.round(sum / count) : 0;
  };

  const computeRiskLevel = (attPercentage) => {
    if (attPercentage < 60) return 'high';
    if (attPercentage < 80) return 'medium';
    return 'low';
  };

  const getMarkSubjects = (marks) => {
    const subjects = {};
    marks.forEach(m => {
      Object.entries(m.marks || {}).forEach(([sub, score]) => {
        if (typeof score === 'number') {
          subjects[sub] = (subjects[sub] || 0) + score;
        }
      });
    });
    return Object.entries(subjects)
      .map(([sub, total]) => ({ sub, avg: Math.round(total / Math.max(marks.length, 1)) }))
      .slice(0, 5);
  };

  const openStudentDetails = async (student) => {
    setSelectedStudent(student);
    setDetailLoading(true);
    setStudentDetails(null);
    setStudentMarks([]);
    setStudentAttendance([]);

    try {
      const studentRes = await axios.get(API_ENDPOINTS.STUDENTS.BY_ID(student._id), {
        headers: getAuthHeaders(),
      });
      setStudentDetails(studentRes.data);

      const marksRes = await axios.get(API_ENDPOINTS.MARKS.STUDENT, {
        headers: getAuthHeaders(),
        params: { studentId: student._id },
      });
      setStudentMarks(marksRes.data.marks || []);

      const now = new Date();
      const yearStart = `${now.getFullYear()}-01-01`;
      const yearEnd = `${now.getFullYear()}-12-31`;
      const attRes = await axios.get(API_ENDPOINTS.ATTENDANCE.CLASS, {
        headers: getAuthHeaders(),
        params: { from: yearStart, to: yearEnd },
      });
      const attendance = (attRes.data.attendance || []).filter(
        a => String(a.studentId) === String(student._id)
      );
      setStudentAttendance(attendance);
    } catch (err) {
      console.error("Error loading student details:", err);
      alert("Failed to load student details: " + (err.response?.data?.message || err.message));
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetails = () => {
    setSelectedStudent(null);
    setStudentDetails(null);
    setStudentMarks([]);
    setStudentAttendance([]);
    setActiveTab("personal");
  };

  const exportStudentsPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Class Students List", 105, 20, { align: "center" });
    let yPos = 35;
    doc.setFontSize(12);
    doc.text("Name", 14, yPos);
    doc.text("Grade", 60, yPos);
    doc.text("Section", 85, yPos);
    doc.text("Enrolment", 110, yPos);
    doc.text("BC Number", 150, yPos);
    yPos += 10;
    doc.line(14, yPos - 5, 190, yPos - 5);
    yPos += 5;
    doc.setFontSize(10);
    filteredStudents.forEach((student) => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      doc.text(`${student.firstName || ""} ${student.lastName || ""}`.trim(), 14, yPos);
      doc.text(student.grade || "N/A", 60, yPos);
      doc.text(student.section || "N/A", 85, yPos);
      doc.text(student.enrollmentNo || student.enrolment || "N/A", 110, yPos);
      doc.text(student.bcNumber || "N/A", 150, yPos);
      yPos += 8;
    });
    doc.save("class_students.pdf");
  };

  const renderTabContent = () => {
    if (detailLoading || !studentDetails) return <div className={styles.loading}>Loading...</div>;

    const attStats = computeAttStats(studentAttendance);
    const monthlyStats = computeMonthlyStats(studentAttendance);
    const markAvg = computeMarkAvg(studentMarks);
    const riskLevel = computeRiskLevel(attStats.percentage);
    const markSubjects = getMarkSubjects(studentMarks);
    const riskClassName = `${styles.riskBadge} ${styles[riskLevel]}`;

    return (
      <>
        <div className={styles.studentHeader}>
          <div className={styles.avatar}>
            {(studentDetails.firstName?.[0] || 'U') + (studentDetails.lastName?.[0] || '?')}
          </div>
          <div>
            <h3>{`${studentDetails.firstName || ''} ${studentDetails.lastName || ''}`.trim()}</h3>
            <p>{`${studentDetails.grade || ''} / ${studentDetails.section || ''}`.trim()}</p>
          </div>
        </div>

        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <span className={styles.statIcon}>📊</span>
            <div>
              <div className={styles.statValue}>{markAvg}%</div>
              <div>Avg Marks</div>
            </div>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statIcon}>🗓</span>
            <div>
              <div className={styles.statValue}>{attStats.percentage}%</div>
              <div>Attendance</div>
            </div>
          </div>
          <div className={styles.statCard}>
            <span className={riskClassName}>{riskLevel.charAt(0).toUpperCase() + riskLevel.slice(1)} Risk</span>
          </div>
        </div>

        <div className={styles.tabNav}>
          <button className={activeTab === 'personal' ? styles.activeTab : ''} onClick={() => setActiveTab('personal')}>👤 Personal</button>
          <button className={activeTab === 'academic' ? styles.activeTab : ''} onClick={() => setActiveTab('academic')}>📚 Academic</button>
          <button className={activeTab === 'attendance' ? styles.activeTab : ''} onClick={() => setActiveTab('attendance')}>📈 Attendance</button>
          <button className={activeTab === 'parents' ? styles.activeTab : ''} onClick={() => setActiveTab('parents')}>👪 Parents</button>
        </div>

        <div className={styles.tabContent}>
          {activeTab === 'personal' && (
            <div className={styles.card}>
              <h4>📋 Personal Information</h4>
              <div className={styles.infoGrid}>
                <div><strong>DOB:</strong> {studentDetails.dob || 'N/A'}</div>
                <div><strong>Gender:</strong> {studentDetails.gender || 'N/A'}</div>
                <div><strong>Enrolment:</strong> {studentDetails.enrollmentNo || studentDetails.enrolment || 'N/A'}</div>
                <div><strong>BC No:</strong> {studentDetails.bcNumber || 'N/A'}</div>
                <div><strong>Contact:</strong> {studentDetails.contactNumber || 'N/A'}</div>
                <div><strong>Address:</strong> {studentDetails.address || 'N/A'}</div>
              </div>
            </div>
          )}

          {activeTab === 'academic' && (
            <div>
              <div className={styles.chartCard}>
                <h4>📈 Marks Overview</h4>
                <div className={styles.avgBarContainer}>
                  <div className={styles.avgBar}>
                    <div className={styles.avgBarFill} style={{width: `${markAvg}%`}} />
                  </div>
                  <span>{markAvg}% Average</span>
                </div>
                {markSubjects.length > 0 && (
                  <div className={styles.subjectBars}>
                    {markSubjects.map(({sub, avg}) => (
                      <div key={sub} className={styles.subjectBar}>
                        <span>{sub}</span>
                        <div className={styles.barBg}>
                          <div className={styles.barFill} style={{width: `${avg}%`}} />
                        </div>
                        <span>{avg}%</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className={styles.flowchart}>
                <svg viewBox="0 0 400 150" className={styles.academicFlow}>
                  <rect x="10" y="20" width="100" height="40" rx="8" fill="#e3f2fd"/>
                  <text x="60" y="45" textAnchor="middle" fontSize="14">Grade {studentDetails.grade}</text>
                  <path d="M110 40 L170 40" stroke="#2196f3" strokeWidth="3" markerEnd="url(#arrow)"/>
                  <rect x="180" y="20" width="80" height="40" rx="8" fill="#f3e5f5"/>
                  <text x="220" y="45" textAnchor="middle" fontSize="14">Term Marks</text>
                  <path d="M260 40 L320 40" stroke="#9c27b0" strokeWidth="3" markerEnd="url(#arrow)"/>
                  <circle cx="350" cy="40" r="25" fill="#c8e6c9">
                    <text x="350" y="45" textAnchor="middle" fontSize="14" fill="#fff">{markAvg}%</text>
                  </circle>
                  <defs>
                    <marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
                      <path d="M0,0 L0,6 L9,3 z" fill="#2196f3"/>
                    </marker>
                  </defs>
                </svg>
              </div>
            </div>
          )}

          {activeTab === 'attendance' && (
            <div className={styles.chartCard}>
              <h4>📊 Attendance Breakdown</h4>
              <div className={styles.attCompact}>
                <div className={styles.compactPieSection}>
                  <div className={styles.pieChart} style={{
                    background: `conic-gradient(#10b981 0deg, #10b981 ${attStats.percentage * 3.6}deg, #ef4444 ${attStats.percentage * 3.6}deg, #ef4444 360deg)`
                  }}>
                    <div className={styles.pieCenter}>
                      <div>{attStats.percentage}%</div>
                    </div>
                  </div>
                  <div className={styles.compactLegend}>
                    <div>P: {attStats.present}</div>
                    <div>A: {attStats.absent}</div>
                  </div>
                </div>

                {monthlyStats.length > 0 && (
                  <div className={styles.monthlySpark}>
                    <h5>Last 6 Months</h5>
                    <div className={styles.sparkBars}>
                      {monthlyStats.map(({month, perc}) => (
                        <div key={month} className={styles.sparkBar}>
                          <div className={styles.sparkFill} style={{height: `${perc}%`}} title={perc + '%'} />
                          <small>{month}</small>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className={styles.recentSection}>
                  <h5>Recent Week</h5>
                  <div className={styles.recentGrid}>
                    {studentAttendance.slice(-7).reverse().map((a) => {
                      const date = new Date(a.date);
                      const day = date.toLocaleDateString('en-US', { weekday: 'narrow' });
                      return (
                        <div key={a._id} className={styles.dayCell}>
                          <small>{day}</small>
                          <span className={a.status === 'P' ? styles.presentIcon : styles.absentIcon}>
                            {a.status[0].toUpperCase()}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'parents' && (
            <div className={styles.card}>
              <h4>👨‍👩‍👧 Parent / Guardian</h4>
              <div className={styles.parentCard}>
                <div>
                  <strong>Father:</strong> {studentDetails.fatherName || 'N/A'} <br />
                  <strong>Phone:</strong> {studentDetails.fatherContact || 'N/A'}
                </div>
                <div>
                  <strong>Mother:</strong> {studentDetails.motherName || 'N/A'} <br />
                  <strong>Phone:</strong> {studentDetails.motherContact || 'N/A'}
                </div>
              </div>
            </div>
          )}
        </div>
      </>
    );
  };

  return (
    <div className={styles.dashboard}>
      <Sidebar role={role} />
      <main className={styles.main}>
        <Header title="Class Students" />
        <div className={styles.filters}>
          <input
            type="text"
            placeholder="Search by name or enrolment number"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button onClick={exportStudentsPDF} className={styles.exportBtn}>
            📄 Export PDF
          </button>
        </div>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Grade</th>
                <th>Section</th>
                <th>Enrolment No</th>
                <th>BC Number</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6">Loading students...</td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan="6">No students found</td>
                </tr>
              ) : (
                filteredStudents.map((s) => (
                  <tr key={s._id}>
                    <td>{`${s.firstName || ""} ${s.lastName || ""}`.trim()}</td>
                    <td>{s.grade}</td>
                    <td>{s.section}</td>
                    <td>{s.enrollmentNo || s.enrolment}</td>
                    <td>{s.bcNumber}</td>
                    <td>
                      <button className={styles.viewBtn} onClick={() => openStudentDetails(s)}>
                        View Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {selectedStudent && (
          <div className={styles.modalBackdrop} onClick={closeDetails}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h3>Student Profile</h3>
                <button className={styles.closeBtn} onClick={closeDetails}>
                  ✕
                </button>
              </div>
              <div className={styles.modalBody}>
                {renderTabContent()}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default TeacherClassStudentsPage;

