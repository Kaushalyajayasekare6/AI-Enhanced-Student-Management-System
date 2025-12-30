import React, { useState, useEffect } from "react";
import Sidebar from "../../Components/Sidebar/Sidebar";
import Header from "../../Components/Header/Header";
import styles from "./AdminReportsPage.module.css";
import { getStoredRole } from "../../utils/auth";
import axios from "axios";
import { API_ENDPOINTS, getAuthHeaders } from "../../config/api";
import jsPDF from "jspdf";

const AdminReportsPage = () => {
  const role = getStoredRole() || "admin";
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentReport, setStudentReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reportLoading, setReportLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filterGrade, setFilterGrade] = useState("");
  const [filterSection, setFilterSection] = useState("");
  const [updatingClasses, setUpdatingClasses] = useState(false);

  // Fetch all students
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        setLoading(true);
        const res = await axios.get(API_ENDPOINTS.STUDENTS.BASE, {
          headers: getAuthHeaders(),
        });
        setStudents(res.data || []);
      } catch (err) {
        console.error("Error fetching students:", err);
        alert("Failed to fetch students: " + (err.response?.data?.message || err.message));
      } finally {
        setLoading(false);
      }
    };
    fetchStudents();
  }, []);

  // Fetch full report for a student
  const fetchStudentReport = async (student) => {
    try {
      setReportLoading(true);
      setSelectedStudent(student);
      setStudentReport(null);

      // Fetch student details
      const studentRes = await axios.get(API_ENDPOINTS.STUDENTS.BY_ID(student._id), {
        headers: getAuthHeaders(),
      });
      const studentData = studentRes.data;

      // Fetch marks
      const marksRes = await axios.get(API_ENDPOINTS.MARKS.STUDENT, {
        headers: getAuthHeaders(),
        params: { studentId: student._id },
      });
      const marks = marksRes.data?.marks || [];

      // Fetch attendance for current year - Admin can access all attendance
      const now = new Date();
      const yearStart = `${now.getFullYear()}-01-01`;
      const yearEnd = `${now.getFullYear()}-12-31`;
      
      // Use CLASS endpoint with studentId parameter for admin
      const attendanceRes = await axios.get(API_ENDPOINTS.ATTENDANCE.CLASS, {
        headers: getAuthHeaders(),
        params: { 
          from: yearStart, 
          to: yearEnd,
          studentId: student._id 
        },
      });
      
      // Handle response - admin endpoint returns { attendance: [...] }
      const attendance = attendanceRes.data?.attendance || [];

      // Calculate attendance statistics
      const presentCount = attendance.filter(a => a.status === "P").length;
      const absentCount = attendance.filter(a => a.status === "A").length;
      const totalDays = attendance.length;
      const attendancePercentage = totalDays > 0 ? Math.round((presentCount / totalDays) * 100) : 0;

      // Calculate marks statistics
      const marksByTerm = {};
      marks.forEach(m => {
        const key = `${m.year}-Term${m.term}`;
        if (!marksByTerm[key]) {
          marksByTerm[key] = { year: m.year, term: m.term, marks: m.marks, total: 0, average: 0 };
        }
        const markValues = Object.values(m.marks || {}).filter(v => v !== null && v !== undefined);
        if (markValues.length > 0) {
          marksByTerm[key].total = markValues.reduce((a, b) => a + b, 0);
          marksByTerm[key].average = Math.round(marksByTerm[key].total / markValues.length);
        }
      });

      setStudentReport({
        student: studentData,
        marks: marks,
        marksByTerm: Object.values(marksByTerm),
        attendance: attendance,
        attendanceStats: {
          present: presentCount,
          absent: absentCount,
          total: totalDays,
          percentage: attendancePercentage,
        },
      });
    } catch (err) {
      console.error("Error fetching student report:", err);
      alert("Failed to fetch student report: " + (err.response?.data?.message || err.message));
    } finally {
      setReportLoading(false);
    }
  };

  // Export report as PDF
  const exportReportPDF = () => {
    if (!studentReport) return;

    const doc = new jsPDF();
    const student = studentReport.student;

    // Title
    doc.setFontSize(18);
    doc.text("Student Full Report", 105, 20, { align: "center" });

    let yPos = 35;

    // Student Information
    doc.setFontSize(14);
    doc.text("Student Information", 14, yPos);
    yPos += 8;
    doc.setFontSize(11);
    doc.text(`Name: ${student.firstName} ${student.lastName}`, 14, yPos);
    yPos += 7;
    doc.text(`Enrollment No: ${student.enrollmentNo}`, 14, yPos);
    yPos += 7;
    doc.text(`Grade: ${student.grade} | Section: ${student.section}`, 14, yPos);
    yPos += 7;
    doc.text(`Date of Birth: ${student.dob || "N/A"}`, 14, yPos);
    yPos += 7;
    doc.text(`Gender: ${student.gender || "N/A"}`, 14, yPos);
    yPos += 7;
    doc.text(`Contact: ${student.contactNumber || "N/A"}`, 14, yPos);
    yPos += 7;
    doc.text(`Address: ${student.address || "N/A"}`, 14, yPos);
    yPos += 10;

    // Parent Information
    doc.setFontSize(14);
    doc.text("Parent/Guardian Information", 14, yPos);
    yPos += 8;
    doc.setFontSize(11);
    doc.text(`Father: ${student.fatherName || "N/A"} (${student.fatherContact || "N/A"})`, 14, yPos);
    yPos += 7;
    doc.text(`Mother: ${student.motherName || "N/A"} (${student.motherContact || "N/A"})`, 14, yPos);
    yPos += 10;

    // Attendance Statistics
    doc.setFontSize(14);
    doc.text("Attendance Statistics (Current Year)", 14, yPos);
    yPos += 8;
    doc.setFontSize(11);
    const stats = studentReport.attendanceStats;
    doc.text(`Total Days: ${stats.total}`, 14, yPos);
    yPos += 7;
    doc.text(`Present: ${stats.present}`, 14, yPos);
    yPos += 7;
    doc.text(`Absent: ${stats.absent}`, 14, yPos);
    yPos += 7;
    doc.text(`Attendance Percentage: ${stats.percentage}%`, 14, yPos);
    yPos += 10;

    // Marks
    if (studentReport.marksByTerm.length > 0) {
      doc.setFontSize(14);
      doc.text("Academic Performance", 14, yPos);
      yPos += 8;
      doc.setFontSize(11);

      studentReport.marksByTerm.forEach((termData) => {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
        doc.text(`${termData.year} - Term ${termData.term}`, 14, yPos);
        yPos += 7;
        doc.text(`Total Marks: ${termData.total} | Average: ${termData.average}`, 14, yPos);
        yPos += 7;
        
        // Subject marks
        Object.entries(termData.marks || {}).forEach(([subject, mark]) => {
          if (mark !== null && mark !== undefined) {
            doc.text(`  ${subject}: ${mark}`, 20, yPos);
            yPos += 6;
          }
        });
        yPos += 5;
      });
    }

    doc.save(`${student.firstName}_${student.lastName}_Report.pdf`);
  };

  // Auto-update classes based on year
  const handleAutoUpdateClasses = async () => {
    if (!window.confirm("This will promote all eligible students to the next grade. Continue?")) {
      return;
    }

    try {
      setUpdatingClasses(true);
      const res = await axios.post(API_ENDPOINTS.STUDENTS.AUTO_UPDATE_CLASSES, {}, {
        headers: getAuthHeaders(),
      });
      alert(`✅ ${res.data.message}\nUpdated: ${res.data.updated}, Skipped: ${res.data.skipped}`);
      // Refresh students list
      const studentsRes = await axios.get(API_ENDPOINTS.STUDENTS.BASE, {
        headers: getAuthHeaders(),
      });
      setStudents(studentsRes.data || []);
    } catch (err) {
      console.error("Error updating classes:", err);
      alert("Failed to update classes: " + (err.response?.data?.message || err.message));
    } finally {
      setUpdatingClasses(false);
    }
  };

  // Filter students
  const filteredStudents = students.filter((s) => {
    const matchesSearch =
      search === "" ||
      `${s.firstName || ""} ${s.lastName || ""}`.toLowerCase().includes(search.toLowerCase()) ||
      (s.enrollmentNo || "").toLowerCase().includes(search.toLowerCase());
    
    const matchesGrade = !filterGrade || s.grade?.includes(filterGrade);
    const matchesSection = !filterSection || s.section === filterSection;

    return matchesSearch && matchesGrade && matchesSection;
  });

  // Get unique grades and sections for filters
  const uniqueGrades = [...new Set(students.map(s => {
    const gradeStr = String(s.grade || "");
    const match = gradeStr.match(/\d+/);
    return match ? `Grade ${match[0]}` : gradeStr;
  }).filter(Boolean))].sort();

  const uniqueSections = [...new Set(students.map(s => s.section).filter(Boolean))].sort();

  return (
    <div className={styles.dashboard}>
      <Sidebar role={role} />
      <main className={styles.main}>
        <Header />
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>Student Reports</h1>
            <p className={styles.pageSubtitle}>
              View comprehensive reports for each student including attendance, marks, and parent information
            </p>
          </div>
          <button 
            onClick={handleAutoUpdateClasses} 
            className={styles.updateClassesBtn}
            disabled={updatingClasses}
          >
            {updatingClasses ? "⏳ Updating..." : "🔄 Auto-Update Classes"}
          </button>
        </div>

        {/* Filters */}
        <div className={styles.filters}>
          <input
            type="text"
            placeholder="Search by name or enrollment number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={styles.searchInput}
          />
          <select
            value={filterGrade}
            onChange={(e) => setFilterGrade(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="">All Grades</option>
            {uniqueGrades.map((grade) => (
              <option key={grade} value={grade}>
                {grade}
              </option>
            ))}
          </select>
          <select
            value={filterSection}
            onChange={(e) => setFilterSection(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="">All Sections</option>
            {uniqueSections.map((section) => (
              <option key={section} value={section}>
                Section {section}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.container}>
          {/* Students List */}
          <div className={styles.studentsList}>
            <h2>Students ({filteredStudents.length})</h2>
            {loading ? (
              <div className={styles.loading}>Loading students...</div>
            ) : (
              <div className={styles.studentsGrid}>
                {filteredStudents.map((student) => (
                  <div
                    key={student._id}
                    className={`${styles.studentCard} ${
                      selectedStudent?._id === student._id ? styles.selected : ""
                    }`}
                    onClick={() => fetchStudentReport(student)}
                  >
                    <div className={styles.studentName}>
                      {student.firstName} {student.lastName}
                    </div>
                    <div className={styles.studentInfo}>
                      <span>{student.grade} - {student.section}</span>
                      <span>{student.enrollmentNo}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Report Display */}
          <div className={styles.reportSection}>
            {reportLoading ? (
              <div className={styles.loading}>Loading report...</div>
            ) : studentReport ? (
              <div className={styles.report}>
                <div className={styles.reportHeader}>
                  <h2>
                    Report: {studentReport.student.firstName} {studentReport.student.lastName}
                  </h2>
                  <button onClick={exportReportPDF} className={styles.exportBtn}>
                    📄 Export PDF
                  </button>
                </div>

                {/* Student Information */}
                <section className={styles.section}>
                  <h3>Student Information</h3>
                  <div className={styles.infoGrid}>
                    <div><strong>Name:</strong> {studentReport.student.firstName} {studentReport.student.lastName}</div>
                    <div><strong>Enrollment No:</strong> {studentReport.student.enrollmentNo}</div>
                    <div><strong>Grade:</strong> {studentReport.student.grade}</div>
                    <div><strong>Section:</strong> {studentReport.student.section}</div>
                    <div><strong>Date of Birth:</strong> {studentReport.student.dob || "N/A"}</div>
                    <div><strong>Gender:</strong> {studentReport.student.gender || "N/A"}</div>
                    <div><strong>Contact:</strong> {studentReport.student.contactNumber || "N/A"}</div>
                    <div><strong>Address:</strong> {studentReport.student.address || "N/A"}</div>
                  </div>
                </section>

                {/* Parent Information */}
                <section className={styles.section}>
                  <h3>Parent/Guardian Information</h3>
                  <div className={styles.infoGrid}>
                    <div><strong>Father:</strong> {studentReport.student.fatherName || "N/A"}</div>
                    <div><strong>Father Contact:</strong> {studentReport.student.fatherContact || "N/A"}</div>
                    <div><strong>Mother:</strong> {studentReport.student.motherName || "N/A"}</div>
                    <div><strong>Mother Contact:</strong> {studentReport.student.motherContact || "N/A"}</div>
                  </div>
                </section>

                {/* Attendance Statistics */}
                <section className={styles.section}>
                  <h3>Attendance Statistics (Current Year)</h3>
                  <div className={styles.statsGrid}>
                    <div className={styles.statCard}>
                      <div className={styles.statValue}>{studentReport.attendanceStats.total}</div>
                      <div className={styles.statLabel}>Total Days</div>
                    </div>
                    <div className={styles.statCard}>
                      <div className={styles.statValue}>{studentReport.attendanceStats.present}</div>
                      <div className={styles.statLabel}>Present</div>
                    </div>
                    <div className={styles.statCard}>
                      <div className={styles.statValue}>{studentReport.attendanceStats.absent}</div>
                      <div className={styles.statLabel}>Absent</div>
                    </div>
                    <div className={styles.statCard}>
                      <div className={styles.statValue}>{studentReport.attendanceStats.percentage}%</div>
                      <div className={styles.statLabel}>Attendance %</div>
                    </div>
                  </div>
                </section>

                {/* Marks */}
                <section className={styles.section}>
                  <h3>Academic Performance</h3>
                  {studentReport.marksByTerm.length === 0 ? (
                    <p>No marks available</p>
                  ) : (
                    <div className={styles.marksTable}>
                      {studentReport.marksByTerm.map((termData, idx) => (
                        <div key={idx} className={styles.termMarks}>
                          <h4>{termData.year} - Term {termData.term}</h4>
                          <table>
                            <thead>
                              <tr>
                                <th>Subject</th>
                                <th>Marks</th>
                              </tr>
                            </thead>
                            <tbody>
                              {Object.entries(termData.marks || {}).map(([subject, mark]) => (
                                mark !== null && mark !== undefined && (
                                  <tr key={subject}>
                                    <td>{subject.charAt(0).toUpperCase() + subject.slice(1)}</td>
                                    <td>{mark}</td>
                                  </tr>
                                )
                              ))}
                            </tbody>
                            <tfoot>
                              <tr>
                                <td><strong>Total</strong></td>
                                <td><strong>{termData.total}</strong></td>
                              </tr>
                              <tr>
                                <td><strong>Average</strong></td>
                                <td><strong>{termData.average}</strong></td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            ) : (
              <div className={styles.placeholder}>
                <p>Select a student to view their full report</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminReportsPage;

