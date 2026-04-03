import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../../Components/AdminLayout/AdminLayout";
import styles from "./AdminDashboard.module.css";
import { getStoredRole } from "../../utils/auth";

const categories = [
  { title: "Students", description: "Manage students, view details & analytics", path: "/AllStudents", icon: "🎓", color: "#10b981" },
  { title: "Teachers", description: "Manage teachers & profiles", path: "/ActiveTeachers", icon: "👩‍🏫", color: "#3b82f6" },
  { title: "Other Staff", description: "Manage non-teaching staff", path: "/OtherWorkerDetailsPage", icon: "🧑‍🔧", color: "#f59e0b" },
  { title: "Timetable", description: "Create and analyze timetables", path: "/TimetableCreation", icon: "🗓️", color: "#8b5cf6" },
  { title: "Reports", description: "Attendance, marks & dropout analytics", path: "/AdminReportsPage", icon: "📊", color: "#ef4444" },
  { title: "Notice Board", description: "Post and view important notices", path: "/NoticeManagement", icon: "📢", color: "#06b6d4" },
  { title: "Profile", description: "Admin profile and settings", path: "/ProfilePage", icon: "👤", color: "#6b7280" },
];

const AdminDashboard = () => {
  const navigate = useNavigate();
  const role = getStoredRole() || "admin";
  const [stats, setStats] = useState({ students: 452, teachers: 68, staff: 24, notices: 15 });

  const StatPill = ({ label, value, color }) => (
    <div className={styles.statPill} style={{ '--accent': color }}>
      <span>{label}: <strong>{value}</strong></span>
    </div>
  );

  return (
    <AdminLayout title="Admin Dashboard" role={role}>
      <div className={styles.welcome}>
        <h1>Welcome to School Management</h1>
        <p>Monitor key metrics and access all administrative tools with one click. Real-time data at your fingertips.</p>
      </div>

      <div className={styles.statsHeader}>
        <div className={styles.statsSummary}>
          <StatPill label="Students" value={stats.students} color="#10b981" />
          <StatPill label="Teachers" value={stats.teachers} color="#3b82f6" />
          <StatPill label="Staff" value={stats.staff} color="#f59e0b" />
          <StatPill label="Notices" value={stats.notices} color="#ef4444" />
        </div>
        <div className={styles.statsActions}>
          <button className={styles.refreshBtn}>🔄 Refresh</button>
        </div>
      </div>

      <div className={styles.grid}>
        {categories.map((cat, idx) => (
          <div
            key={idx}
            className={styles.card}
            onClick={() => navigate(cat.path)}
            style={{ '--card-accent': cat.color }}
          >
            <div className={styles.icon} style={{ background: `linear-gradient(135deg, ${cat.color}, ${cat.color}cc)` }}>
              {cat.icon}
            </div>
            <h3>{cat.title}</h3>
            <p>{cat.description}</p>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;

