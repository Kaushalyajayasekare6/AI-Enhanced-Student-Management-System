import React, { useState, useEffect } from "react";
import axios from "axios";
import styles from "./NoticeBoard.module.css";
import { API_ENDPOINTS, getAuthHeaders } from "../../config/api";
import { getStoredRole } from "../../utils/auth";

const NoticeBoard = () => {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const role = getStoredRole() || "student";

  useEffect(() => {
    fetchNotices();
  }, []);

  const fetchNotices = async () => {
    try {
      setLoading(true);
      const res = await axios.get(
        `${API_ENDPOINTS.NOTICES.BASE}?role=${role}`,
        { headers: getAuthHeaders() }
      );
      setNotices(res.data);
    } catch (error) {
      console.error("Error fetching notices:", error);
    } finally {
      setLoading(false);
    }
  };

  const getImageUrl = (imageUrl) => {
    if (!imageUrl) return null;
    if (imageUrl.startsWith("data:") || imageUrl.startsWith("http")) {
      return imageUrl;
    }
    const baseUrl = process.env.REACT_APP_API_URL || "http://localhost:5000";
    return `${baseUrl}${imageUrl}`;
  };

  if (loading) {
    return (
      <section className={styles.noticeBoard}>
        <div className={styles.header}>
          <h2>Notice Board</h2>
        </div>
        <p>Loading notices...</p>
      </section>
    );
  }

  return (
    <section className={styles.noticeBoard}>
      <div className={styles.header}>
        <h2>Notice Board</h2>
        <span className={styles.count}>{notices.length} notices</span>
      </div>
      {notices.length === 0 ? (
        <div className={styles.emptyState}>
          <p>No notices available at the moment.</p>
        </div>
      ) : (
        <div className={styles.cards}>
          {notices.map((notice) => (
            <div
              key={notice._id}
              className={`${styles.card} ${styles[notice.priority]}`}
            >
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}>{notice.title}</h3>
                <span className={styles.priorityBadge}>{notice.priority}</span>
              </div>
              {notice.description && (
                <p className={styles.cardDescription}>{notice.description}</p>
              )}
              {notice.imageUrl && (
                <div className={styles.cardImage}>
                  <img
                    src={getImageUrl(notice.imageUrl)}
                    alt={notice.title}
                    onError={(e) => {
                      e.target.style.display = "none";
                    }}
                  />
                </div>
              )}
              <div className={styles.cardFooter}>
                <span className={styles.cardDate}>
                  {new Date(notice.createdAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export default NoticeBoard;
