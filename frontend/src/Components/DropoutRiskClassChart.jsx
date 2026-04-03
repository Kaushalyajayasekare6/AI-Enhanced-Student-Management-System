import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import styles from './DropoutRiskClassChart.module.css';

const COLORS = ['#ef4444', '#f59e0b', '#10b981'];

const DropoutRiskClassChart = ({ classData, loading }) => {
  if (loading) {
    return <div className={styles.chartSkeleton || styles.chartCard}>Loading class risk...</div>;
  }

  if (!classData?.distribution) {
    return <div className={styles.chartCard}><div className={styles.emptyState}>No class data available</div></div>;
  }

  const data = [
    { name: 'High Risk', value: classData.distribution.High || 0 },
    { name: 'Medium Risk', value: classData.distribution.Medium || 0 },
    { name: 'Low Risk', value: classData.distribution.Low || 0 },
  ].filter(item => item.value > 0);

  const totalStudents = classData.data?.length || 0;

  return (
    <div className={styles.chartCard}>
      <h3>👥 Class Risk Distribution ({totalStudents} students)</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            outerRadius={80}
            dataKey="value"
            nameKey="name"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
      <div className={styles.metric}>
        High: {classData.distribution.High || 0} | Medium: {classData.distribution.Medium || 0} | Low: {classData.distribution.Low || 0}
      </div>
    </div>
  );
};

export default DropoutRiskClassChart;

