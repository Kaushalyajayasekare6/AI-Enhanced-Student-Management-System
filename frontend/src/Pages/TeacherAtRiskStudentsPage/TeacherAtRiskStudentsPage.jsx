import React, { useState, useMemo } from "react";
import Sidebar from "../../Components/Sidebar/Sidebar";
import Header from "../../Components/Header/Header";
import styles from "./TeacherAtRiskStudentsPage.module.css";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import { getStoredRole } from "../../utils/auth";

const studentsData = {
  lowMarks: [
    { id: 1, name: "Kasun Perera", avg: 38 },
    { id: 2, name: "Nimal Silva", avg: 42 },
  ],
  dropoutRisk: [
    { id: 3, name: "Sajith Kumara", riskLevel: "High", riskScore: 0.82 },
    { id: 4, name: "Ruwan Jayasuriya", riskLevel: "Medium", riskScore: 0.55 },
  ],
  lowAttendance: [
    { id: 5, name: "Tharindu Fernando", attendance: 58 },
    { id: 6, name: "Amal Rathnayake", attendance: 62 },
  ],
};

const riskDist = [
  { name: "High", value: 2 },
  { name: "Medium", value: 6 },
  { name: "Low", value: 112 },
];

const COLORS = ["#ef4444", "#f59e0b", "#10b981"];

const TeacherAtRiskStudentsPage = () => {
  const [filter, setFilter] = useState("dropoutRisk");
  const [search, setSearch] = useState("");

  const list = useMemo(() => {
    const raw = studentsData[filter] || [];
    return search ? raw.filter(r => r.name.toLowerCase().includes(search.toLowerCase())) : raw;
  }, [filter, search]);

  const role = getStoredRole() || "teacher";

  return (
    <div className={styles.dashboard}>
      <Sidebar role={role} />
      <main className={styles.main}>
        <Header />
        <h1 className={styles.title}>At-Risk Students</h1>
        <p className={styles.subtitle}>Students flagged by marks, attendance, or dropout risk</p>

        <div className={styles.controls}>
          <div className={styles.tabs}>
            <button className={filter === "lowMarks" ? styles.activeTab : ""} onClick={() => setFilter("lowMarks")}>📉 Low Marks</button>
            <button className={filter === "dropoutRisk" ? styles.activeTab : ""} onClick={() => setFilter("dropoutRisk")}>🚨 Dropout Risk</button>
            <button className={filter === "lowAttendance" ? styles.activeTab : ""} onClick={() => setFilter("lowAttendance")}>⏳ Low Attendance</button>
          </div>

          <div className={styles.searchWrap}>
            <input placeholder="Search student..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>

        <div className={styles.contentRow}>
          <div className={styles.list}>
            {list.map(s => (
              <div key={s.id} className={styles.studentCard}>
                <div>
                  <div className={styles.name}>{s.name}</div>
                  {filter === "lowMarks" && <div className={styles.meta}>Average: <b>{s.avg}%</b></div>}
                  {filter === "dropoutRisk" && <div className={styles.meta}>Risk: <b style={{ color: s.riskLevel === "High" ? "#ef4444" : "#f59e0b" }}>{s.riskLevel}</b></div>}
                  {filter === "lowAttendance" && <div className={styles.meta}>Attendance: <b>{s.attendance}%</b></div>}
                </div>
                <button className={styles.viewBtn} onClick={() => alert(`Open details for ${s.name}`)}>View Details</button>
              </div>
            ))}
          </div>

          <div className={styles.sideCard}>
            <h4>Risk Distribution</h4>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={riskDist} dataKey="value" nameKey="name" outerRadius={80} label>
                  {riskDist.map((entry, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </main>
    </div>
  );
};

export default TeacherAtRiskStudentsPage;
