import React, { useState, useEffect } from "react";
import axios from "axios";
import { API_ENDPOINTS, getAuthHeaders } from "../../config/api";
import styles from "./DropoutRisk.module.css";

// Function to calculate dropout risk color based on level
const getRiskColor = (level) => {
  const colorMap = {
    "High Risk": { color: "#ef4444", gradient: "linear-gradient(90deg,#ef4444,#b91c1c)" },
    "Medium Risk": { color: "#f59e0b", gradient: "linear-gradient(90deg,#f59e0b,#ca8a04)" },
    "Low Risk": { color: "#10b981", gradient: "linear-gradient(90deg,#10b981,#059669)" },
    High: { color: "#ef4444", gradient: "linear-gradient(90deg,#ef4444,#b91c1c)" },
    Medium: { color: "#f59e0b", gradient: "linear-gradient(90deg,#f59e0b,#ca8a04)" },
    Low: { color: "#10b981", gradient: "linear-gradient(90deg,#10b981,#059669)" },
  };
  return colorMap[level] || { color: "#6b7280", gradient: "linear-gradient(90deg,#6b7280,#4b5563)" };
};

const DropoutRisk = () => {
  const [riskData, setRiskData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchDropoutRisk = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(
        API_ENDPOINTS.ML.PREDICT_DROPOUT,
        {},
        { headers: getAuthHeaders() }
      );

      if (response.data && response.data.success !== false) {
        setRiskData(response.data);
      } else {
        setError(response.data?.message || "Failed to fetch dropout risk data");
      }
    } catch (err) {
      const message = err.response?.data?.message || err.message || "Unable to fetch dropout risk";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDropoutRisk();
  }, []);

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading dropout risk assessment...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <h3>Error Loading Data</h3>
          <p>{error}</p>
          <button onClick={fetchDropoutRisk} className={styles.retryBtn}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!riskData) {
    return (
      <div className={styles.container}>
        <div className={styles.noData}>
          <h3>No Data Available</h3>
          <p>Unable to load dropout risk assessment.</p>
          <button onClick={fetchDropoutRisk} className={styles.retryBtn}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  const studentName = riskData.student?.name || "Student";
  const attendance = riskData.inputData?.attendance_percentage || 0;
  const riskLevel = riskData.riskAssessment?.level || riskData.prediction?.risk_level || "Unknown";
  const riskColor = getRiskColor(riskLevel);
  const factors = riskData.riskAssessment?.factors || riskData.prediction?.factors || [];

  return (
    <div className={styles.container}>
      <h2 className={styles.heading}>Hello, {studentName}</h2>

      <div className={styles.cardsWrapper}>
        {/* Attendance Card */}
        <div className={styles.card}>
          <h3>Attendance</h3>
          <div className={styles.progressBar}>
            <div
              className={styles.progress}
              style={{ width: `${attendance}%` }}
              title={`${attendance}% attendance`}
            />
          </div>
          <span className={styles.progressLabel}>{attendance}%</span>
        </div>

        {/* Dropout Risk Card */}
        <div className={styles.card}>
          <h3>Dropout Risk Level</h3>
          <div
            className={styles.riskLevel}
            style={{ background: riskColor.gradient }}
          >
            {riskLevel}
          </div>
        </div>

        {/* Risk Factors Card */}
        <div className={styles.card}>
          <h3>Risk Factors</h3>
          <div className={styles.subjectsWrapper}>
            {factors.length > 0 ? (
              factors.map((factor, idx) => (
                <span key={idx} className={styles.subjectChip}>{factor}</span>
              ))
            ) : (
              <span className={styles.noFactors}>No specific risk factors identified</span>
            )}
          </div>
        </div>
      </div>

      {/* Contact Button */}
      <button
        className={styles.contactBtn}
        onClick={() => {
          // This would need to be updated to get teacher contact info from API
          window.location.href = `mailto:teacher@school.com?subject=Dropout%20Risk%20Inquiry`;
        }}
      >
        Contact Class Teacher
      </button>
    </div>
  );
};

export default DropoutRisk;
