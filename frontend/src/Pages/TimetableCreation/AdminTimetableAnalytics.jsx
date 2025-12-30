import React from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from "recharts";
import styles from "./AdminTimetableAnalytics.module.css";

// Mock data: teacher load term-wise
const data = [
  { teacher: "Mr. Dinesh Perera", hours: 14 },
  { teacher: "Ms. Nimali Silva", hours: 12 },
];

const AdminTimetableAnalytics = () => (
  <div className={styles.analyticsCard}>
    <h2>Teacher Load (Hours/Week)</h2>
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <XAxis dataKey="teacher" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar dataKey="hours" fill="#3b82f6" />
      </BarChart>
    </ResponsiveContainer>
  </div>
);

export default AdminTimetableAnalytics;
