import React from "react";
import Sidebar from "../../Components/Sidebar/Sidebar";
import Header from "../../Components/Header/Header";
import styles from "./DropoutRiskPage.module.css";
import { getStoredRole } from "../../utils/auth";

const DropoutRiskPage = () => {
  // mock risk metrics (front-end demonstration)
  const riskData = {
    attendance: 72,
    marksAverage: 58,
    riskLevel: "High",
    riskScore: 0.82,
    mainFactors: [
      { name: "Attendance", weight: 0.45 },
      { name: "Low Marks", weight: 0.35 },
      { name: "Behaviour", weight: 0.2 },
    ],
    recommendations: [
      "Attend remedial sessions weekly",
      "Focus on Maths and Science",
      "Schedule meeting with counselor",
    ],
  };

  const colorMap = { High: "#ef4444", Medium: "#f59e0b", Low: "#10b981" };
  const role = getStoredRole() || "student";

  return (
    <div className={styles.page}>
      <Sidebar role={role} />
      <main className={styles.main}>
        <Header title="Dropout Risk Analysis" />
        <div className={styles.container}>
          <div className={styles.summary}>
            <div className={styles.top}>
              <div>
                <h3 className={styles.title}>Risk Level</h3>
                <div className={styles.badge} style={{ background: colorMap[riskData.riskLevel] || "#10b981" }}>
                  {riskData.riskLevel}
                </div>
              </div>

              <div className={styles.metrics}>
                <div><strong>Risk Score:</strong> {(riskData.riskScore*100).toFixed(0)}%</div>
                <div><strong>Attendance:</strong> {riskData.attendance}%</div>
                <div><strong>Avg Marks:</strong> {riskData.marksAverage}%</div>
              </div>
            </div>

            <div className={styles.factors}>
              <h4>Contributing Factors</h4>
              <ul>
                {riskData.mainFactors.map((f, idx)=>(
                  <li key={idx}>{f.name} — {Math.round(f.weight*100)}%</li>
                ))}
              </ul>
            </div>

            <div className={styles.recs}>
              <h4>Recommended Actions</h4>
              <ul>
                {riskData.recommendations.map((r, i)=> <li key={i}>✔ {r}</li>)}
              </ul>
            </div>
          </div>

          <div className={styles.rightCard}>
            <h4>Quick Contact</h4>
            <p>Contact class teacher or counselor if you need help.</p>
            <button className={styles.contactBtn}>Contact Class Teacher</button>
            <hr />
            <h4>Notes</h4>
            <p>These suggestions are model-driven and intended to guide interventions.</p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DropoutRiskPage;
