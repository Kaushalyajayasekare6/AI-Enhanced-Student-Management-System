import React, { useState, useEffect } from "react";
import { API_ENDPOINTS, getAuthHeaders } from "../../config/api";
import "./DeleteUpdateTimetable.css";

const DeleteUpdateTimetable = () => {
  const [timetables, setTimetables] = useState([]);
  const [selectedTimetable, setSelectedTimetable] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Fetch all timetables on component mount
  useEffect(() => {
    fetchAllTimetables();
  }, []);

  const fetchAllTimetables = async () => {
    try {
      setLoading(true);
      const response = await fetch(API_ENDPOINTS.TIMETABLE.ALL, {
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        setTimetables(data);
        setError("");
      } else {
        setError("Failed to fetch timetables");
      }
    } catch (err) {
      setError("Error fetching timetables: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTimetable = async () => {
    if (!selectedTimetable) {
      setError("Please select a timetable to update");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const response = await fetch(API_ENDPOINTS.TIMETABLE.UPDATE, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          grade: selectedTimetable.grade,
          section: selectedTimetable.section,
          stream: selectedTimetable.stream || null,
          term: selectedTimetable.term,
          year: selectedTimetable.year,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(`✅ ${data.message}`);
        setSelectedTimetable(data.timetable);
        // Refresh the timetables list
        setTimeout(() => fetchAllTimetables(), 2000);
      } else {
        setError(`❌ ${data.message}`);
      }
    } catch (err) {
      setError("Error updating timetable: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTimetable = async () => {
    if (!selectedTimetable) {
      setError("Please select a timetable to delete");
      return;
    }

    if (!window.confirm("Are you sure you want to delete this timetable?")) {
      return;
    }

    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const response = await fetch(API_ENDPOINTS.TIMETABLE.DELETE, {
        method: "DELETE",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          grade: selectedTimetable.grade,
          section: selectedTimetable.section,
          stream: selectedTimetable.stream || null,
          term: selectedTimetable.term,
          year: selectedTimetable.year,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess("✅ Timetable deleted successfully!");
        setSelectedTimetable(null);
        // Refresh the timetables list
        setTimeout(() => fetchAllTimetables(), 2000);
      } else {
        setError(`❌ ${data.message}`);
      }
    } catch (err) {
      setError("Error deleting timetable: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="delete-update-timetable">
      <div className="container">
        <h1>📋 Manage Timetables</h1>
        <p className="subtitle">
          View, update, or delete existing timetables
        </p>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <div className="timetables-section">
          <h2>Available Timetables</h2>

          {loading && !selectedTimetable ? (
            <div className="loading">Loading timetables...</div>
          ) : timetables.length === 0 ? (
            <div className="no-data">No timetables found</div>
          ) : (
            <div className="timetables-grid">
              {timetables.map((timetable, index) => (
                <div
                  key={index}
                  className={`timetable-card ${
                    selectedTimetable?._id === timetable._id ? "selected" : ""
                  }`}
                  onClick={() => setSelectedTimetable(timetable)}
                >
                  <div className="card-header">
                    <h3>
                      Grade {timetable.grade} - {timetable.section}
                      {timetable.stream && ` (${timetable.stream})`}
                    </h3>
                  </div>
                  <div className="card-body">
                    <p>
                      <strong>Term:</strong> {timetable.term}
                    </p>
                    <p>
                      <strong>Year:</strong> {timetable.year}
                    </p>
                    <p>
                      <strong>Total Slots:</strong> {timetable.slots?.length || 0}
                    </p>
                    <p>
                      <strong>Created:</strong>{" "}
                      {new Date(timetable.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {selectedTimetable && (
          <div className="actions-section">
            <h2>Selected: Grade {selectedTimetable.grade} - {selectedTimetable.section}</h2>

            <div className="timetable-details">
              <h3>Timetable Details</h3>
              <div className="details-grid">
                <div className="detail-item">
                  <label>Grade:</label>
                  <span>{selectedTimetable.grade}</span>
                </div>
                <div className="detail-item">
                  <label>Section:</label>
                  <span>{selectedTimetable.section}</span>
                </div>
                <div className="detail-item">
                  <label>Stream:</label>
                  <span>{selectedTimetable.stream || "N/A"}</span>
                </div>
                <div className="detail-item">
                  <label>Term:</label>
                  <span>{selectedTimetable.term}</span>
                </div>
                <div className="detail-item">
                  <label>Year:</label>
                  <span>{selectedTimetable.year}</span>
                </div>
                <div className="detail-item">
                  <label>Total Slots:</label>
                  <span>{selectedTimetable.slots?.length || 0}</span>
                </div>
              </div>
            </div>

            <div className="action-buttons">
              <button
                className="btn btn-update"
                onClick={handleUpdateTimetable}
                disabled={loading}
              >
                {loading ? "Updating..." : "🔄 Update Timetable"}
              </button>
              <button
                className="btn btn-delete"
                onClick={handleDeleteTimetable}
                disabled={loading}
              >
                {loading ? "Deleting..." : "🗑️ Delete Timetable"}
              </button>
              <button
                className="btn btn-cancel"
                onClick={() => setSelectedTimetable(null)}
                disabled={loading}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DeleteUpdateTimetable;
