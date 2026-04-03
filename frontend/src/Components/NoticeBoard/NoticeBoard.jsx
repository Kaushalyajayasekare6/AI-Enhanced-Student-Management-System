import React, { useState, useEffect } from "react";
import axios from "axios";
import styles from "./NoticeBoard.module.css";
import { API_ENDPOINTS, getAuthHeaders } from "../../config/api";
import { getStoredRole } from "../../utils/auth";
import { FaSearch, FaFilter, FaBell, FaCalendarAlt, FaUser, FaEye } from "react-icons/fa";

const NoticeBoard = () => {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedPriority, setSelectedPriority] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const role = getStoredRole() || "student";

  useEffect(() => {
    fetchNotices();
  }, [searchTerm, selectedCategory, selectedPriority, currentPage]);

  const fetchNotices = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        role,
        page: currentPage,
        limit: 12,
      });

      if (searchTerm) params.append('search', searchTerm);
      if (selectedCategory !== 'all') params.append('category', selectedCategory);
      if (selectedPriority !== 'all') params.append('priority', selectedPriority);

      const res = await axios.get(`${API_ENDPOINTS.NOTICES.BASE}?${params}`, {
        headers: getAuthHeaders()
      });

      setNotices(res.data.notices || []);
      setPagination(res.data.pagination);
    } catch (error) {
      console.error("Error fetching notices:", error);
      setNotices([]);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (noticeId) => {
    try {
      await axios.put(API_ENDPOINTS.NOTICES.MARK_READ(noticeId), {}, {
        headers: getAuthHeaders()
      });
      // Update local state
      setNotices(prev => prev.map(notice =>
        notice._id === noticeId
          ? { ...notice, readBy: [...(notice.readBy || []), { userId: 'current', readAt: new Date() }] }
          : notice
      ));
    } catch (error) {
      console.error("Error marking notice as read:", error);
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

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return '#dc2626';
      case 'high': return '#ea580c';
      case 'medium': return '#ca8a04';
      case 'low': return '#16a34a';
      default: return '#6b7280';
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'academic': return '📚';
      case 'administrative': return '📋';
      case 'events': return '🎉';
      case 'holidays': return '🏖️';
      case 'examinations': return '📝';
      case 'sports': return '⚽';
      default: return '📢';
    }
  };

  const isReadByUser = (notice) => {
    // This is a simplified check - in a real app you'd check against current user ID
    return notice.readBy && notice.readBy.length > 0;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays - 1} days ago`;
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <section className={styles.noticeBoard}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h2><FaBell /> Notice Board</h2>
          <span className={styles.count}>
            {pagination ? `${pagination.total} notices` : `${notices.length} notices`}
          </span>
        </div>

        <div className={styles.filters}>
          <div className={styles.searchBox}>
            <FaSearch />
            <input
              type="text"
              placeholder="Search notices..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="all">All Categories</option>
            <option value="academic">Academic</option>
            <option value="administrative">Administrative</option>
            <option value="events">Events</option>
            <option value="holidays">Holidays</option>
            <option value="examinations">Examinations</option>
            <option value="sports">Sports</option>
            <option value="general">General</option>
          </select>

          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="all">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Loading notices...</p>
        </div>
      ) : notices.length === 0 ? (
        <div className={styles.emptyState}>
          <FaBell className={styles.emptyIcon} />
          <h3>No notices found</h3>
          <p>Try adjusting your search or filters</p>
        </div>
      ) : (
        <>
          <div className={styles.noticesGrid}>
            {notices.map((notice) => (
              <div
                key={notice._id}
                className={`${styles.noticeCard} ${notice.isPinned ? styles.pinned : ''} ${isReadByUser(notice) ? styles.read : styles.unread}`}
                onClick={() => !isReadByUser(notice) && markAsRead(notice._id)}
              >
                {notice.isPinned && (
                  <div className={styles.pinBadge}>
                    📌 Pinned
                  </div>
                )}

                <div className={styles.cardHeader}>
                  <div className={styles.categoryIcon}>
                    {getCategoryIcon(notice.category)}
                  </div>
                  <div className={styles.cardMeta}>
                    <span
                      className={styles.priorityBadge}
                      style={{ backgroundColor: getPriorityColor(notice.priority) }}
                    >
                      {notice.priority.toUpperCase()}
                    </span>
                    {!isReadByUser(notice) && (
                      <span className={styles.unreadDot}></span>
                    )}
                  </div>
                </div>

                <h3 className={styles.cardTitle}>
                  {notice.title}
                </h3>

                <p className={styles.cardDescription}>
                  {notice.description.length > 150
                    ? `${notice.description.substring(0, 150)}...`
                    : notice.description
                  }
                </p>

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
                  <div className={styles.cardStats}>
                    <span className={styles.stat}>
                      <FaEye /> {notice.viewCount || 0}
                    </span>
                    <span className={styles.stat}>
                      <FaUser /> {notice.targetAudience.join(", ")}
                    </span>
                  </div>
                  <span className={styles.cardDate}>
                    <FaCalendarAlt /> {formatDate(notice.createdAt)}
                  </span>
                </div>

                {notice.tags && notice.tags.length > 0 && (
                  <div className={styles.tags}>
                    {notice.tags.slice(0, 3).map((tag, index) => (
                      <span key={index} className={styles.tag}>
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {pagination && pagination.pages > 1 && (
            <div className={styles.pagination}>
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className={styles.pageBtn}
              >
                Previous
              </button>

              <span className={styles.pageInfo}>
                Page {pagination.page} of {pagination.pages}
              </span>

              <button
                onClick={() => setCurrentPage(prev => Math.min(pagination.pages, prev + 1))}
                disabled={currentPage === pagination.pages}
                className={styles.pageBtn}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
};

export default NoticeBoard;
