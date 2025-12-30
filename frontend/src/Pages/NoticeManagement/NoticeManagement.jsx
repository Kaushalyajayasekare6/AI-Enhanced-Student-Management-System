import React, { useState, useEffect } from "react";
import Sidebar from "../../Components/Sidebar/Sidebar";
import Header from "../../Components/Header/Header";
import { FaEdit, FaTrash, FaPlus, FaImage, FaTimes } from "react-icons/fa";
import styles from "./NoticeManagement.module.css";
import axios from "axios";
import { getStoredRole } from "../../utils/auth";
import { API_ENDPOINTS, getAuthHeaders } from "../../config/api";

const NoticeManagement = () => {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newNotice, setNewNotice] = useState({
    title: "",
    description: "",
    priority: "medium",
    targetAudience: ["all"],
  });
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [editingNotice, setEditingNotice] = useState(null);
  const role = getStoredRole() || "admin";

  // Fetch notices
  useEffect(() => {
    fetchNotices();
  }, []);

  const fetchNotices = async () => {
    try {
      setLoading(true);
      const res = await axios.get(API_ENDPOINTS.NOTICES.BASE, {
        headers: getAuthHeaders(),
      });
      setNotices(res.data);
    } catch (error) {
      console.error("Error fetching notices:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("Image size should be less than 5MB");
        return;
      }
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
  };

  const handleAddNotice = async () => {
    if (!newNotice.title.trim()) {
      alert("Please enter a notice title");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("title", newNotice.title);
      formData.append("description", newNotice.description);
      formData.append("priority", newNotice.priority);
      formData.append("targetAudience", JSON.stringify(newNotice.targetAudience));

      if (selectedImage) {
        formData.append("image", selectedImage);
      } else if (imagePreview && imagePreview.startsWith("data:")) {
        // If editing and image is base64, send as base64
        formData.append("imageBase64", imagePreview);
      }

      const headers = getAuthHeaders();
      delete headers["Content-Type"]; // Let browser set multipart/form-data

      await axios.post(API_ENDPOINTS.NOTICES.BASE, formData, {
        headers: headers,
      });

      alert("✅ Notice added successfully!");
      setNewNotice({ title: "", description: "", priority: "medium", targetAudience: ["all"] });
      setSelectedImage(null);
      setImagePreview(null);
      fetchNotices();
    } catch (error) {
      console.error("Error adding notice:", error);
      alert("❌ Failed to add notice. Please try again.");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure to delete this notice?")) return;

    try {
      await axios.delete(API_ENDPOINTS.NOTICES.BY_ID(id), {
        headers: getAuthHeaders(),
      });
      alert("✅ Notice deleted successfully!");
      fetchNotices();
    } catch (error) {
      console.error("Error deleting notice:", error);
      alert("❌ Failed to delete notice.");
    }
  };

  const handleEdit = (notice) => {
    setEditingNotice(notice);
    setNewNotice({
      title: notice.title,
      description: notice.description || "",
      priority: notice.priority || "medium",
      targetAudience: notice.targetAudience || ["all"],
    });
    if (notice.imageUrl) {
      setImagePreview(notice.imageUrl);
    }
  };

  const handleUpdate = async () => {
    if (!newNotice.title.trim()) {
      alert("Please enter a notice title");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("title", newNotice.title);
      formData.append("description", newNotice.description);
      formData.append("priority", newNotice.priority);
      formData.append("targetAudience", JSON.stringify(newNotice.targetAudience));

      if (selectedImage) {
        formData.append("image", selectedImage);
      } else if (imagePreview && imagePreview.startsWith("data:")) {
        formData.append("imageBase64", imagePreview);
      }

      const headers = getAuthHeaders();
      delete headers["Content-Type"];

      await axios.put(API_ENDPOINTS.NOTICES.BY_ID(editingNotice._id), formData, {
        headers: headers,
      });

      alert("✅ Notice updated successfully!");
      setEditingNotice(null);
      setNewNotice({ title: "", description: "", priority: "medium", targetAudience: ["all"] });
      setSelectedImage(null);
      setImagePreview(null);
      fetchNotices();
    } catch (error) {
      console.error("Error updating notice:", error);
      alert("❌ Failed to update notice.");
    }
  };

  const cancelEdit = () => {
    setEditingNotice(null);
    setNewNotice({ title: "", description: "", priority: "medium", targetAudience: ["all"] });
    setSelectedImage(null);
    setImagePreview(null);
  };

  const getImageUrl = (imageUrl) => {
    if (!imageUrl) return null;
    if (imageUrl.startsWith("data:") || imageUrl.startsWith("http")) {
      return imageUrl;
    }
    const baseUrl = process.env.REACT_APP_API_URL || "http://localhost:5000";
    return `${baseUrl}${imageUrl}`;
  };

  return (
    <div className={styles.dashboard}>
      <Sidebar role={role} />
      <div className={styles.content}>
        <Header />
        <div className={styles.container}>
          <h1 className={styles.title}>Notice Management</h1>
          <p className={styles.subtitle}>
            Create and manage notices for teachers and students
          </p>

          {/* Add/Edit Notice Form */}
          <div className={styles.formCard}>
            <h3>{editingNotice ? "Edit Notice" : "Add New Notice"}</h3>
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label>Title *</label>
                <input
                  type="text"
                  placeholder="Enter notice title"
                  value={newNotice.title}
                  onChange={(e) =>
                    setNewNotice({ ...newNotice, title: e.target.value })
                  }
                />
              </div>

              <div className={styles.formGroup}>
                <label>Priority</label>
                <select
                  value={newNotice.priority}
                  onChange={(e) =>
                    setNewNotice({ ...newNotice, priority: e.target.value })
                  }
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label>Target Audience</label>
                <select
                  value={newNotice.targetAudience[0]}
                  onChange={(e) =>
                    setNewNotice({
                      ...newNotice,
                      targetAudience: [e.target.value],
                    })
                  }
                >
                  <option value="all">All (Teachers & Students)</option>
                  <option value="students">Students Only</option>
                  <option value="teachers">Teachers Only</option>
                </select>
              </div>

              <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                <label>Description</label>
                <textarea
                  placeholder="Enter notice description..."
                  value={newNotice.description}
                  onChange={(e) =>
                    setNewNotice({ ...newNotice, description: e.target.value })
                  }
                  rows="4"
                />
              </div>

              <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                <label>Image (Optional)</label>
                <div className={styles.imageUpload}>
                  {imagePreview ? (
                    <div className={styles.imagePreview}>
                      <img src={getImageUrl(imagePreview)} alt="Preview" />
                      <button
                        type="button"
                        onClick={removeImage}
                        className={styles.removeImageBtn}
                      >
                        <FaTimes /> Remove
                      </button>
                    </div>
                  ) : (
                    <label className={styles.imageUploadLabel}>
                      <FaImage /> Choose Image
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageSelect}
                        style={{ display: "none" }}
                      />
                    </label>
                  )}
                </div>
                <p className={styles.imageHint}>
                  Maximum file size: 5MB. Supported formats: JPG, PNG, GIF, WebP
                </p>
              </div>

              <div className={styles.formActions}>
                {editingNotice && (
                  <button onClick={cancelEdit} className={styles.cancelBtn}>
                    Cancel
                  </button>
                )}
                <button
                  onClick={editingNotice ? handleUpdate : handleAddNotice}
                  className={styles.submitBtn}
                >
                  <FaPlus /> {editingNotice ? "Update Notice" : "Add Notice"}
                </button>
              </div>
            </div>
          </div>

          {/* Notice List */}
          <div className={styles.noticesList}>
            <h3>All Notices ({notices.length})</h3>
            {loading ? (
              <p>Loading notices...</p>
            ) : notices.length === 0 ? (
              <p className={styles.noNotices}>No notices available.</p>
            ) : (
              <div className={styles.noticesGrid}>
                {notices.map((notice) => (
                  <div key={notice._id} className={styles.noticeCard}>
                    <div className={styles.noticeHeader}>
                      <div>
                        <h4 className={styles.noticeTitle}>{notice.title}</h4>
                        <p className={styles.noticeDate}>
                          {new Date(notice.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className={styles.noticeBadges}>
                        <span
                          className={`${styles.priorityBadge} ${styles[notice.priority]}`}
                        >
                          {notice.priority}
                        </span>
                      </div>
                    </div>

                    {notice.description && (
                      <p className={styles.noticeDescription}>
                        {notice.description}
                      </p>
                    )}

                    {notice.imageUrl && (
                      <div className={styles.noticeImage}>
                        <img
                          src={getImageUrl(notice.imageUrl)}
                          alt={notice.title}
                        />
                      </div>
                    )}

                    <div className={styles.noticeFooter}>
                      <span className={styles.audience}>
                        For: {notice.targetAudience.join(", ")}
                      </span>
                      <div className={styles.noticeActions}>
                        <button
                          onClick={() => handleEdit(notice)}
                          className={styles.editBtn}
                        >
                          <FaEdit /> Edit
                        </button>
                        <button
                          onClick={() => handleDelete(notice._id)}
                          className={styles.deleteBtn}
                        >
                          <FaTrash /> Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NoticeManagement;
