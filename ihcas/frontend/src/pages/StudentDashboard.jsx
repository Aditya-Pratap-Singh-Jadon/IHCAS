import React, { useEffect, useState, useMemo } from "react";
import api from "../api/client";
import { useAuth } from "../contexts/AuthContext";

export default function StudentDashboard() {
  const { user, logout } = useAuth();

  // Primary Data
  const [data, setData] = useState(null);
  const [counselling, setCounselling] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [roomTypes, setRoomTypes] = useState([]);
  const [requestHistory, setRequestHistory] = useState({
    leave: [],
    room_change: [],
    mess_change: [],
    complaints: [],
  });

  // UI Navigation State
  const [activeTab, setActiveTab] = useState("overview"); // 'overview' | 'counselling' | 'requests' | 'notifications'
  const [requestSubTab, setRequestSubTab] = useState("leave"); // 'leave' | 'room_change' | 'mess_change' | 'complaint' | 'history'
  const [notifFilter, setNotifFilter] = useState("unread"); // 'unread' | 'all'

  // Loading & Feedback
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null); // { type: 'success' | 'error' | 'info', message: '' }

  // Forms State
  const [leaveForm, setLeaveForm] = useState({
    start_date: "",
    end_date: "",
    reason: "",
  });
  const [roomChangeForm, setRoomChangeForm] = useState({
    requested_room_type: "",
    reason: "",
  });
  const [messChangeForm, setMessChangeForm] = useState({
    requested_mess: "Special Mess",
    reason: "",
  });
  const [complaintForm, setComplaintForm] = useState({
    category: "Maintenance / Furniture",
    description: "",
    priority: "LOW",
  });

  // Room Allocation & Roommate State
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [roommateInput, setRoommateInput] = useState("");
  const [roommateOtpInput, setRoommateOtpInput] = useState("");
  const [otpSentTarget, setOtpSentTarget] = useState(null);
  const [verifiedRoommates, setVerifiedRoommates] = useState([]);
  const [roomHostelFilter, setRoomHostelFilter] = useState("ALL");
  const [roomTypeFilter, setRoomTypeFilter] = useState("ALL");

  const fetchAvailableRooms = async () => {
    try {
      const res = await api.get("/inventory/rooms");
      setRooms(res.data.data || []);
    } catch (err) {
      console.error("Failed to fetch rooms", err);
    }
  };

  const fetchRequestHistory = async () => {
    try {
      const [leaveRes, roomRes, messRes, compRes] = await Promise.all([
        api.get("/requests/leave").catch(() => ({ data: { data: [] } })),
        api.get("/requests/room-change").catch(() => ({ data: { data: [] } })),
        api.get("/requests/mess-change").catch(() => ({ data: { data: [] } })),
        api.get("/requests/complaints").catch(() => ({ data: { data: [] } })),
      ]);

      setRequestHistory({
        leave: leaveRes.data.data || [],
        room_change: roomRes.data.data || [],
        mess_change: messRes.data.data || [],
        complaints: compRes.data.data || [],
      });
    } catch (err) {
      console.error("Failed to load request history", err);
    }
  };

  const loadAllData = async () => {
    try {
      const [dashRes, counsellingRes] = await Promise.all([
        api.get("/dashboard/student"),
        api
          .get("/counselling/status")
          .catch(() => ({
            data: { success: true, data: { has_slot: false } },
          })),
      ]);

      setData(dashRes.data.data);
      setCounselling(counsellingRes.data?.data || null);

      // Load Room Types for Room Change options
      api
        .get("/inventory/room-types")
        .then((res) => setRoomTypes(res.data.data || []))
        .catch(() => {});

      // Load full history for requests
      fetchRequestHistory();

      // If active slot or unallocated, fetch available rooms
      if (!dashRes.data.data.allocation) {
        fetchAvailableRooms();
      }
    } catch (err) {
      console.error(err);
      setFeedback({
        type: "error",
        message:
          err.response?.data?.message || "Failed to load student dashboard.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // -------------------------------------------------------------
  // COUNSELLING & ALLOCATION HANDLERS
  // -------------------------------------------------------------
  const handleActivateSlot = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setFeedback(null);
    try {
      const res = await api.post("/counselling/activate");
      setFeedback({
        type: "success",
        message:
          res.data?.message || "Counselling slot activated successfully!",
      });
      await loadAllData();
      fetchAvailableRooms();
    } catch (err) {
      setFeedback({
        type: "error",
        message:
          err.response?.data?.message ||
          "Failed to activate slot. Please check scheduled time.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestRoommateOtp = async (e) => {
    e.preventDefault();
    if (!roommateInput.trim() || isSubmitting) return;
    setIsSubmitting(true);
    setFeedback(null);
    try {
      const res = await api.post("/allocation/roommate-otp/request", {
        roommate_reg_no: roommateInput.trim().toUpperCase(),
      });
      setOtpSentTarget(roommateInput.trim().toUpperCase());
      setFeedback({
        type: "info",
        message:
          res.data?.message ||
          `OTP sent to roommate's registered email address.`,
      });
    } catch (err) {
      setFeedback({
        type: "error",
        message:
          err.response?.data?.message || "Failed to send OTP to roommate.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyRoommateOtp = async (e) => {
    e.preventDefault();
    if (!otpSentTarget || !roommateOtpInput.trim() || isSubmitting) return;
    setIsSubmitting(true);
    setFeedback(null);
    try {
      const res = await api.post("/allocation/roommate-otp/verify", {
        roommate_reg_no: otpSentTarget,
        otp_code: roommateOtpInput.trim(),
      });
      setVerifiedRoommates((prev) =>
        Array.from(new Set([...prev, otpSentTarget])),
      );
      setFeedback({
        type: "success",
        message:
          res.data?.message ||
          `Roommate ${otpSentTarget} verified successfully!`,
      });
      setOtpSentTarget(null);
      setRoommateInput("");
      setRoommateOtpInput("");
    } catch (err) {
      setFeedback({
        type: "error",
        message: err.response?.data?.message || "Invalid or expired OTP.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveVerifiedRoommate = (regNo) => {
    setVerifiedRoommates((prev) => prev.filter((r) => r !== regNo));
  };

  const handleAllocateRoom = async () => {
    if (!selectedRoomId || isSubmitting) return;
    if (
      !window.confirm(
        "Are you sure you want to confirm this room allocation? This action is binding.",
      )
    ) {
      return;
    }
    setIsSubmitting(true);
    setFeedback(null);
    try {
      const payload = {
        room_id: Number(selectedRoomId),
        roommates: verifiedRoommates,
      };
      const res = await api.post("/allocation", payload);
      setFeedback({
        type: "success",
        message: res.data?.message || "Room allocated successfully!",
      });
      setSelectedRoomId(null);
      setVerifiedRoommates([]);
      await loadAllData();
      setActiveTab("overview");
    } catch (err) {
      setFeedback({
        type: "error",
        message: err.response?.data?.message || "Failed to allocate room.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // -------------------------------------------------------------
  // SERVICE REQUEST HANDLERS
  // -------------------------------------------------------------
  const handleLeaveSubmit = async (e) => {
    e.preventDefault();
    if (new Date(leaveForm.start_date) > new Date(leaveForm.end_date)) {
      setFeedback({
        type: "error",
        message: "Leave start date cannot be later than end date.",
      });
      return;
    }
    setIsSubmitting(true);
    setFeedback(null);
    try {
      await api.post("/requests/leave", leaveForm);
      setFeedback({
        type: "success",
        message: "Leave request submitted successfully.",
      });
      setLeaveForm({ start_date: "", end_date: "", reason: "" });
      await loadAllData();
      fetchRequestHistory();
    } catch (err) {
      setFeedback({
        type: "error",
        message:
          err.response?.data?.message || "Failed to submit leave request.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRoomChangeSubmit = async (e) => {
    e.preventDefault();
    if (!data?.allocation) {
      setFeedback({
        type: "error",
        message:
          "You must have an active confirmed room allocation to request a room change.",
      });
      return;
    }
    setIsSubmitting(true);
    setFeedback(null);
    try {
      await api.post("/requests/room-change", roomChangeForm);
      setFeedback({
        type: "success",
        message: "Room change request submitted successfully.",
      });
      setRoomChangeForm({ requested_room_type: "", reason: "" });
      await loadAllData();
      fetchRequestHistory();
    } catch (err) {
      setFeedback({
        type: "error",
        message:
          err.response?.data?.message ||
          "Failed to submit room change request.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMessChangeSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFeedback(null);
    try {
      await api.post("/requests/mess-change", messChangeForm);
      setFeedback({
        type: "success",
        message: "Mess change request submitted successfully.",
      });
      setMessChangeForm({ requested_mess: "Special Mess", reason: "" });
      await loadAllData();
      fetchRequestHistory();
    } catch (err) {
      setFeedback({
        type: "error",
        message:
          err.response?.data?.message ||
          "Failed to submit mess change request.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleComplaintSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFeedback(null);
    try {
      await api.post("/requests/complaints", complaintForm);
      setFeedback({
        type: "success",
        message: "Complaint registered successfully.",
      });
      setComplaintForm({
        category: "Maintenance / Furniture",
        description: "",
        priority: "LOW",
      });
      await loadAllData();
      fetchRequestHistory();
    } catch (err) {
      setFeedback({
        type: "error",
        message: err.response?.data?.message || "Failed to register complaint.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const markNotificationRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      await loadAllData();
    } catch (err) {
      console.error(err);
    }
  };

  // -------------------------------------------------------------
  // COMPUTED / FILTERED LISTS
  // -------------------------------------------------------------
  const unreadNotifications = useMemo(() => {
    return data?.notifications || [];
  }, [data]);

  const totalPendingRequests = useMemo(() => {
    if (!data?.requests) return 0;
    return (
      (data.requests.leave?.length || 0) +
      (data.requests.room_change?.length || 0) +
      (data.requests.mess_change?.length || 0) +
      (data.requests.complaints?.length || 0)
    );
  }, [data]);

  const filteredRooms = useMemo(() => {
    return rooms.filter((r) => {
      const matchHostel =
        roomHostelFilter === "ALL" ||
        String(r.hostel_id) === String(roomHostelFilter);
      const matchType =
        roomTypeFilter === "ALL" ||
        String(r.room_type_id) === String(roomTypeFilter);
      const hasCapacity = r.available_capacity > 0;
      return matchHostel && matchType && hasCapacity;
    });
  }, [rooms, roomHostelFilter, roomTypeFilter]);

  const uniqueHostelsInRooms = useMemo(() => {
    const map = new Map();
    rooms.forEach((r) => {
      if (r.hostel_id && !map.has(r.hostel_id)) {
        map.set(r.hostel_id, `Hostel ${r.hostel_id}`);
      }
    });
    return Array.from(map.entries());
  }, [rooms]);

  const allHistoryItems = useMemo(() => {
    const list = [];
    requestHistory.leave.forEach((item) =>
      list.push({
        id: `leave-${item.leave_id}`,
        type: "Leave Request",
        details: `${item.start_date?.split("T")[0]} to ${item.end_date?.split("T")[0]} — ${item.reason}`,
        date: item.requested_at,
        status: item.status,
      }),
    );
    requestHistory.room_change.forEach((item) =>
      list.push({
        id: `room-${item.change_id}`,
        type: "Room Change",
        details: `Type: ${item.requested_room_type} — Reason: ${item.reason}`,
        date: item.requested_at,
        status: item.status,
      }),
    );
    requestHistory.mess_change.forEach((item) =>
      list.push({
        id: `mess-${item.mess_id}`,
        type: "Mess Change",
        details: `Requested: ${item.requested_mess} — Reason: ${item.reason}`,
        date: item.requested_at,
        status: item.status,
      }),
    );
    requestHistory.complaints.forEach((item) =>
      list.push({
        id: `comp-${item.complaint_id}`,
        type: `Complaint (${item.priority})`,
        details: `Category: ${item.category} — ${item.description}`,
        date: item.created_at,
        status: item.status,
      }),
    );
    return list.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  }, [requestHistory]);

  if (loading) {
    return (
      <div className="portal-shell">
        <div
          className="container"
          style={{ textAlign: "center", padding: "5rem 1rem" }}
        >
          <div className="empty-state-icon">⏳</div>
          <h2>Loading Student Portal...</h2>
          <p className="text-muted">
            Retrieving academic profile, allocation status, and session data.
          </p>
        </div>
      </div>
    );
  }

  const student = data?.student;
  const allocation = data?.allocation;
  const roommates = data?.roommates || [];

  return (
    <div className="portal-shell">
      {/* ================= TOP NAVIGATION BAR ================= */}
      <header className="portal-topbar">
        <div className="portal-topbar-inner">
          <div className="portal-brand">
            <div className="portal-brand-logo">VIT</div>
            <div className="portal-brand-text">
              <h1>IHCAS Student Portal</h1>
              <span>Intelligent Hostel Counselling & Allocation System</span>
            </div>
          </div>

          <div className="portal-user-controls">
            <div className="portal-user-pill">
              <div className="portal-user-avatar">
                {student?.name?.charAt(0) || "S"}
              </div>
              <div className="portal-user-meta">
                <span className="portal-user-name">
                  {student?.name || user?.name}
                </span>
                <span className="portal-user-reg">
                  {student?.reg_no || user?.email} • {student?.gender}
                </span>
              </div>
            </div>
            <button
              onClick={logout}
              className="btn btn-secondary btn-sm"
              title="Sign out of student account"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* ================= SECONDARY NAVIGATION TABS ================= */}
      <nav className="portal-nav-bar" aria-label="Portal Navigation">
        <div className="portal-nav-container">
          <button
            className={`nav-tab-button ${activeTab === "overview" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("overview");
              setFeedback(null);
            }}
          >
            📊 Overview & Status
          </button>
          <button
            className={`nav-tab-button ${activeTab === "counselling" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("counselling");
              setFeedback(null);
            }}
          >
            🏠 Counselling & Allocation
            {counselling?.status === "ACTIVE" && (
              <span className="tab-badge active-badge">Active</span>
            )}
            {counselling?.status === "PENDING" && (
              <span className="tab-badge">
                Queue #{counselling.queue_position || "—"}
              </span>
            )}
          </button>
          <button
            className={`nav-tab-button ${activeTab === "requests" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("requests");
              setFeedback(null);
            }}
          >
            📝 Service Requests
            {totalPendingRequests > 0 && (
              <span className="tab-badge alert-badge">
                {totalPendingRequests}
              </span>
            )}
          </button>
          <button
            className={`nav-tab-button ${activeTab === "notifications" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("notifications");
              setFeedback(null);
            }}
          >
            🔔 Notifications
            {unreadNotifications.length > 0 && (
              <span className="tab-badge alert-badge">
                {unreadNotifications.length}
              </span>
            )}
          </button>
        </div>
      </nav>

      {/* ================= MAIN CONTAINER ================= */}
      <main className="container" style={{ flex: 1, paddingBottom: "3rem" }}>
        {/* GLOBAL FEEDBACK NOTICES */}
        {feedback && (
          <div
            className={`portal-alert portal-alert-${feedback.type}`}
            role="alert"
          >
            <span style={{ fontWeight: 700 }}>
              {feedback.type === "error"
                ? "⚠️ Error:"
                : feedback.type === "success"
                  ? "✅ Success:"
                  : "ℹ️ Info:"}
            </span>
            <div style={{ flex: 1 }}>{feedback.message}</div>
            <button
              onClick={() => setFeedback(null)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontWeight: "bold",
              }}
              aria-label="Dismiss notice"
            >
              ×
            </button>
          </div>
        )}

        {/* METRICS / STATS OVERVIEW BAR */}
        <section className="metrics-bar" aria-label="Key Indicators">
          {/* Card 1: Allocation */}
          <div className="metric-card">
            <div className="metric-card-header">
              <span className="metric-card-label">Allocation Status</span>
              {allocation ? (
                <span className="badge badge-confirmed">Confirmed</span>
              ) : (
                <span className="badge badge-warning">Unallocated</span>
              )}
            </div>
            <div className="metric-card-value">
              {allocation
                ? `${allocation.hostel_name} - ${allocation.room_number}`
                : "Not Assigned"}
            </div>
            <div className="metric-card-subtext">
              {allocation
                ? `${allocation.room_type} • Floor ${allocation.floor}`
                : "Awaiting counselling session / room booking"}
            </div>
          </div>

          {/* Card 2: Counselling Slot */}
          <div className="metric-card">
            <div className="metric-card-header">
              <span className="metric-card-label">Counselling Slot</span>
              {counselling?.has_slot ? (
                <span
                  className={`badge badge-${counselling.status?.toLowerCase() || "info"}`}
                >
                  {counselling.status}
                </span>
              ) : (
                <span className="badge badge-info">No Slot</span>
              )}
            </div>
            <div className="metric-card-value">
              {counselling?.is_active
                ? "Active Now"
                : counselling?.queue_position
                  ? `Rank in Queue: #${counselling.queue_position}`
                  : counselling?.status === "COMPLETED"
                    ? "Completed"
                    : "Pending Schedule"}
            </div>
            <div className="metric-card-subtext">
              {counselling?.start_time
                ? `${new Date(counselling.start_time).toLocaleDateString()} ${new Date(counselling.start_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                : "Slots will be published by administrator"}
            </div>
          </div>

          {/* Card 3: Academic Standing */}
          <div className="metric-card">
            <div className="metric-card-header">
              <span className="metric-card-label">Academic Merit</span>
              <span className="badge badge-info">VIT Score</span>
            </div>
            <div className="metric-card-value">
              Rank #{student?.academic_rank || "N/A"}
            </div>
            <div className="metric-card-subtext">
              CGPA:{" "}
              {student?.cgpa !== undefined
                ? Number(student.cgpa).toFixed(2)
                : "N/A"}{" "}
              • Reg: {student?.reg_no}
            </div>
          </div>

          {/* Card 4: Action Items */}
          <div className="metric-card">
            <div className="metric-card-header">
              <span className="metric-card-label">Pending Actions</span>
              <span className="badge badge-warning">
                {totalPendingRequests} Requests
              </span>
            </div>
            <div className="metric-card-value">
              {unreadNotifications.length} New Alerts
            </div>
            <div className="metric-card-subtext">
              {totalPendingRequests === 0
                ? "All requests processed"
                : `${totalPendingRequests} request(s) under review by warden`}
            </div>
          </div>
        </section>

        {/* ================= TAB 1: OVERVIEW & STATUS ================= */}
        {activeTab === "overview" && (
          <div className="dashboard-grid">
            {/* Room & Accommodation Details */}
            <section className="card">
              <h2>My Accommodation</h2>
              {allocation ? (
                <div>
                  <dl className="dl-grid" style={{ marginBottom: "1.25rem" }}>
                    <dt>Hostel Block</dt>
                    <dd>
                      <strong>{allocation.hostel_name}</strong>
                    </dd>
                    <dt>Room Number</dt>
                    <dd>{allocation.room_number}</dd>
                    <dt>Room Specification</dt>
                    <dd>{allocation.room_type}</dd>
                    <dt>Floor</dt>
                    <dd>{allocation.floor}</dd>
                    <dt>Allocation Type</dt>
                    <dd>
                      <span className="badge badge-confirmed">
                        {allocation.allocation_status}
                      </span>
                    </dd>
                    <dt>Confirmed On</dt>
                    <dd>
                      {allocation.confirmed_at
                        ? new Date(allocation.confirmed_at).toLocaleString()
                        : "N/A"}
                    </dd>
                  </dl>

                  <h3
                    style={{
                      fontSize: "0.95rem",
                      marginBottom: "0.5rem",
                      color: "var(--secondary-color)",
                    }}
                  >
                    Roommates ({roommates.length})
                  </h3>
                  {roommates.length === 0 ? (
                    <p className="text-muted" style={{ fontSize: "0.875rem" }}>
                      Single occupancy or no other roommates have confirmed in
                      this room yet.
                    </p>
                  ) : (
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Reg Number</th>
                          <th>Gender</th>
                        </tr>
                      </thead>
                      <tbody>
                        {roommates.map((rm, idx) => (
                          <tr key={idx}>
                            <td>
                              <strong>{rm.name}</strong>
                            </td>
                            <td>{rm.reg_no}</td>
                            <td>{rm.gender}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              ) : (
                <div className="empty-state" style={{ padding: "1.5rem 0" }}>
                  <div className="empty-state-icon">🛌</div>
                  <h3>No Room Allocation Yet</h3>
                  <p>
                    You have not secured a hostel room for this academic
                    session.
                  </p>
                  <button
                    onClick={() => setActiveTab("counselling")}
                    className="btn btn-primary btn-sm"
                    style={{ marginTop: "1rem" }}
                  >
                    Go to Counselling & Room Allocation →
                  </button>
                </div>
              )}
            </section>

            {/* Quick Status / Counselling Workflow Tracker */}
            <section className="card">
              <h2>Counselling & Allocation Pipeline</h2>
              {allocation ? (
                <div
                  className="portal-alert portal-alert-success"
                  style={{ margin: 0 }}
                >
                  <div>
                    <strong>Allocation Completed:</strong> You have completed
                    your room selection and confirmed your hostel booking. For
                    room changes, submit a request under the{" "}
                    <em>Service Requests</em> tab.
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ marginBottom: "1rem" }}>
                    <p
                      style={{
                        fontSize: "0.875rem",
                        color: "var(--secondary-color)",
                        marginBottom: "0.75rem",
                      }}
                    >
                      Hostel allocations are conducted sequentially according to
                      academic rank during your assigned counselling window:
                    </p>
                    <ol
                      style={{
                        fontSize: "0.875rem",
                        paddingLeft: "1.25rem",
                        color: "var(--text-main)",
                        lineHeight: 1.8,
                      }}
                    >
                      <li>
                        <strong>Schedule Assignment:</strong> Rank #
                        {student?.academic_rank || "N/A"}
                        {counselling?.has_slot
                          ? " (Slot scheduled)"
                          : " (Awaiting slot assignment)"}
                      </li>
                      <li>
                        <strong>Activate Slot:</strong> When your turn or
                        scheduled window arrives, activate your slot to browse
                        rooms.
                      </li>
                      <li>
                        <strong>Roommate Verification:</strong> Verify roommates
                        via OTP before selecting multi-bed rooms.
                      </li>
                      <li>
                        <strong>Select & Confirm:</strong> Reserve your room in
                        eligible gender-separated hostels.
                      </li>
                    </ol>
                  </div>
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <button
                      onClick={() => setActiveTab("counselling")}
                      className="btn btn-primary btn-sm"
                    >
                      Open Counselling Workspace →
                    </button>
                  </div>
                </div>
              )}
            </section>

            {/* Recent Notifications Summary */}
            <section className="card">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "0.5rem",
                }}
              >
                <h2 style={{ margin: 0 }}>Recent Alerts</h2>
                <button
                  onClick={() => setActiveTab("notifications")}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: "0.75rem", padding: "0.2rem 0.5rem" }}
                >
                  View All ({unreadNotifications.length})
                </button>
              </div>

              {unreadNotifications.length === 0 ? (
                <div className="empty-state" style={{ padding: "1.5rem 0" }}>
                  <p>All caught up! No unread notifications.</p>
                </div>
              ) : (
                <ul className="notification-list">
                  {unreadNotifications.slice(0, 3).map((n) => (
                    <li key={n.notification_id} className="notification-item">
                      <div className="notification-content">
                        <h4>{n.title}</h4>
                        <p>{n.message}</p>
                        <span
                          style={{
                            fontSize: "0.7rem",
                            color: "var(--text-muted)",
                          }}
                        >
                          {new Date(n.created_at).toLocaleDateString()}{" "}
                          {new Date(n.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <button
                        onClick={() => markNotificationRead(n.notification_id)}
                        className="btn btn-secondary btn-sm"
                        style={{
                          fontSize: "0.75rem",
                          padding: "0.2rem 0.5rem",
                        }}
                      >
                        Mark Read
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Outstanding Requests Summary */}
            <section className="card">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "0.5rem",
                }}
              >
                <h2 style={{ margin: 0 }}>Active Requests</h2>
                <button
                  onClick={() => setActiveTab("requests")}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: "0.75rem", padding: "0.2rem 0.5rem" }}
                >
                  Manage Requests
                </button>
              </div>

              {totalPendingRequests === 0 ? (
                <div className="empty-state" style={{ padding: "1.5rem 0" }}>
                  <p>No pending service requests under review.</p>
                </div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Details</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.requests?.leave?.map((r) => (
                      <tr key={`l-${r.leave_id}`}>
                        <td>Leave</td>
                        <td>
                          {r.start_date.split("T")[0]} to{" "}
                          {r.end_date.split("T")[0]}
                        </td>
                        <td>
                          <span className="badge badge-warning">Pending</span>
                        </td>
                      </tr>
                    ))}
                    {data?.requests?.room_change?.map((r) => (
                      <tr key={`rc-${r.change_id}`}>
                        <td>Room Change</td>
                        <td>{r.requested_room_type}</td>
                        <td>
                          <span className="badge badge-warning">Pending</span>
                        </td>
                      </tr>
                    ))}
                    {data?.requests?.mess_change?.map((r) => (
                      <tr key={`mc-${r.mess_id}`}>
                        <td>Mess Change</td>
                        <td>{r.requested_mess}</td>
                        <td>
                          <span className="badge badge-warning">Pending</span>
                        </td>
                      </tr>
                    ))}
                    {data?.requests?.complaints?.map((r) => (
                      <tr key={`cp-${r.complaint_id}`}>
                        <td>Complaint</td>
                        <td>{r.category}</td>
                        <td>
                          <span className="badge badge-warning">Pending</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          </div>
        )}

        {/* ================= TAB 2: COUNSELLING & ALLOCATION ================= */}
        {activeTab === "counselling" && (
          <div>
            {/* Slot Banner */}
            <div className="card" style={{ marginBottom: "1.5rem" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  flexWrap: "wrap",
                  gap: "1rem",
                }}
              >
                <div>
                  <h2 style={{ margin: 0, marginBottom: "0.25rem" }}>
                    Counselling Slot Status
                  </h2>
                  <p
                    className="text-muted"
                    style={{ margin: 0, fontSize: "0.875rem" }}
                  >
                    Real-time slot tracking and room allocation according to
                    academic rank.
                  </p>
                </div>

                {counselling?.is_active ? (
                  <span
                    className="badge badge-success"
                    style={{ fontSize: "0.85rem", padding: "0.35rem 0.75rem" }}
                  >
                    🟢 Slot Active
                  </span>
                ) : counselling?.status === "COMPLETED" ? (
                  <span
                    className="badge badge-confirmed"
                    style={{ fontSize: "0.85rem", padding: "0.35rem 0.75rem" }}
                  >
                    Completed
                  </span>
                ) : counselling?.status === "PENDING" ? (
                  <span
                    className="badge badge-warning"
                    style={{ fontSize: "0.85rem", padding: "0.35rem 0.75rem" }}
                  >
                    Pending Window
                  </span>
                ) : (
                  <span
                    className="badge badge-info"
                    style={{ fontSize: "0.85rem", padding: "0.35rem 0.75rem" }}
                  >
                    No Slot Assigned
                  </span>
                )}
              </div>

              <hr
                style={{
                  border: "none",
                  borderTop: "1px solid var(--border-color)",
                  margin: "1rem 0",
                }}
              />

              {/* Status Scenarios */}
              {allocation ? (
                <div
                  className="portal-alert portal-alert-success"
                  style={{ margin: 0 }}
                >
                  <div>
                    <h3
                      style={{ margin: "0 0 0.25rem 0", fontSize: "0.95rem" }}
                    >
                      Room Allocation Confirmed
                    </h3>
                    <p style={{ margin: 0 }}>
                      You have already secured{" "}
                      <strong>Room {allocation.room_number}</strong> in{" "}
                      <strong>{allocation.hostel_name}</strong>. Your
                      counselling session is marked complete.
                    </p>
                  </div>
                </div>
              ) : !counselling?.has_slot ? (
                <div
                  className="portal-alert portal-alert-info"
                  style={{ margin: 0 }}
                >
                  <div>
                    <h3
                      style={{ margin: "0 0 0.25rem 0", fontSize: "0.95rem" }}
                    >
                      No Counselling Slot Assigned Yet
                    </h3>
                    <p style={{ margin: 0 }}>
                      The university administration has not generated
                      counselling slots for this session yet. Once generated
                      based on academic rank #{student?.academic_rank}, your
                      slot details and scheduled time will appear here.
                    </p>
                  </div>
                </div>
              ) : (
                <div>
                  <dl className="dl-grid" style={{ marginBottom: "1rem" }}>
                    <dt>Scheduled Window</dt>
                    <dd>
                      {new Date(counselling.start_time).toLocaleString()} —{" "}
                      {new Date(counselling.end_time).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </dd>
                    <dt>Queue Position</dt>
                    <dd>
                      {counselling.queue_position !== null
                        ? `Position #${counselling.queue_position} in line`
                        : "Active / Direct"}
                    </dd>
                    <dt>Status</dt>
                    <dd>{counselling.status}</dd>
                  </dl>

                  {counselling.status === "PENDING" && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        flexWrap: "wrap",
                        gap: "1rem",
                        background: "#f8fafc",
                        padding: "0.75rem 1rem",
                        borderRadius: "6px",
                        border: "1px solid var(--border-color)",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "0.875rem",
                          color: "var(--secondary-color)",
                        }}
                      >
                        Eligible to activate once scheduled time arrives or you
                        reach the front of the queue.
                      </span>
                      <button
                        onClick={handleActivateSlot}
                        disabled={isSubmitting}
                        className="btn btn-primary btn-sm"
                      >
                        {isSubmitting ? "Activating..." : "Activate Slot Now"}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Room Allocation Workspace: Only if not already allocated */}
            {!allocation && (
              <div className="card">
                <h2>Room Selection & Booking Workspace</h2>
                <p
                  className="text-muted"
                  style={{
                    fontSize: "0.875rem",
                    marginTop: "-0.5rem",
                    marginBottom: "1.25rem",
                  }}
                >
                  Browse vacant rooms in gender-verified hostels (
                  {student?.gender === "MALE"
                    ? "MH - Mens Hostels"
                    : "LH - Ladies Hostels"}
                  ).
                </p>

                {/* STEP 1: Roommate Verification (Optional for multi-bed rooms) */}
                <div className="roommate-container">
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: "0.5rem",
                    }}
                  >
                    <div>
                      <h3
                        style={{
                          margin: 0,
                          fontSize: "0.9rem",
                          color: "var(--primary-color)",
                        }}
                      >
                        👥 Roommate Verification (Optional for
                        Double/Triple/Quad Beds)
                      </h3>
                      <p
                        style={{
                          margin: 0,
                          fontSize: "0.75rem",
                          color: "var(--text-muted)",
                        }}
                      >
                        Roommates must be of the same gender ({student?.gender})
                        and verify via OTP sent to their university email.
                      </p>
                    </div>
                    <span className="badge badge-info">
                      {verifiedRoommates.length} / 3 Roommates
                    </span>
                  </div>

                  {/* Roommate Form */}
                  {!otpSentTarget ? (
                    <form
                      onSubmit={handleRequestRoommateOtp}
                      style={{
                        display: "flex",
                        gap: "0.5rem",
                        marginTop: "0.75rem",
                        flexWrap: "wrap",
                      }}
                    >
                      <input
                        type="text"
                        placeholder="Enter Roommate Reg No (e.g., 23BCE1001)"
                        value={roommateInput}
                        onChange={(e) => setRoommateInput(e.target.value)}
                        disabled={isSubmitting || verifiedRoommates.length >= 3}
                        style={{
                          flex: 1,
                          minWidth: "220px",
                          padding: "0.45rem 0.75rem",
                          fontSize: "0.875rem",
                        }}
                      />
                      <button
                        type="submit"
                        className="btn btn-secondary btn-sm"
                        disabled={
                          !roommateInput.trim() ||
                          isSubmitting ||
                          verifiedRoommates.length >= 3
                        }
                      >
                        {isSubmitting ? "Sending..." : "Request Roommate OTP"}
                      </button>
                    </form>
                  ) : (
                    <form
                      onSubmit={handleVerifyRoommateOtp}
                      style={{
                        display: "flex",
                        gap: "0.5rem",
                        marginTop: "0.75rem",
                        flexWrap: "wrap",
                      }}
                    >
                      <input
                        type="text"
                        placeholder={`Enter 6-digit OTP sent to ${otpSentTarget}`}
                        value={roommateOtpInput}
                        maxLength={6}
                        onChange={(e) => setRoommateOtpInput(e.target.value)}
                        disabled={isSubmitting}
                        style={{
                          flex: 1,
                          minWidth: "220px",
                          padding: "0.45rem 0.75rem",
                          fontSize: "0.875rem",
                        }}
                      />
                      <button
                        type="submit"
                        className="btn btn-primary btn-sm"
                        disabled={roommateOtpInput.length !== 6 || isSubmitting}
                      >
                        {isSubmitting ? "Verifying..." : "Verify OTP"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setOtpSentTarget(null);
                          setRoommateOtpInput("");
                        }}
                        className="btn btn-secondary btn-sm"
                      >
                        Cancel
                      </button>
                    </form>
                  )}

                  {/* Verified Roommates Chips */}
                  {verifiedRoommates.length > 0 && (
                    <div className="roommate-chips">
                      {verifiedRoommates.map((regNo) => (
                        <span
                          key={regNo}
                          className="roommate-chip roommate-chip-verified"
                        >
                          ✓ Verified: {regNo}
                          <button
                            type="button"
                            onClick={() => handleRemoveVerifiedRoommate(regNo)}
                            className="chip-remove"
                            title="Remove roommate"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* STEP 2: Filter Available Rooms */}
                <div
                  style={{
                    display: "flex",
                    gap: "1rem",
                    flexWrap: "wrap",
                    alignItems: "center",
                    marginBottom: "1rem",
                  }}
                >
                  <div style={{ flex: 1, minWidth: "180px" }}>
                    <label
                      style={{
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        color: "var(--text-muted)",
                      }}
                    >
                      Filter by Hostel
                    </label>
                    <select
                      value={roomHostelFilter}
                      onChange={(e) => setRoomHostelFilter(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "0.45rem",
                        fontSize: "0.875rem",
                      }}
                    >
                      <option value="ALL">
                        All Hostels ({student?.gender})
                      </option>
                      {uniqueHostelsInRooms.map(([hId, hName]) => (
                        <option key={hId} value={hId}>
                          {hName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={{ flex: 1, minWidth: "180px" }}>
                    <label
                      style={{
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        color: "var(--text-muted)",
                      }}
                    >
                      Filter by Room Type
                    </label>
                    <select
                      value={roomTypeFilter}
                      onChange={(e) => setRoomTypeFilter(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "0.45rem",
                        fontSize: "0.875rem",
                      }}
                    >
                      <option value="ALL">All Room Types</option>
                      {roomTypes.map((t) => (
                        <option key={t.room_type_id} value={t.room_type_id}>
                          {t.type_name} ({t.capacity} Bed
                          {t.capacity > 1 ? "s" : ""})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={{ alignSelf: "flex-end" }}>
                    <button
                      onClick={fetchAvailableRooms}
                      className="btn btn-secondary btn-sm"
                      title="Refresh room list"
                    >
                      🔄 Refresh
                    </button>
                  </div>
                </div>

                {/* STEP 3: Rooms List */}
                {filteredRooms.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-icon">🏢</div>
                    <h3>No Available Rooms Matching Filter</h3>
                    <p>
                      Try clearing your filters or check back during your active
                      counselling window.
                    </p>
                  </div>
                ) : (
                  <div className="room-grid">
                    {filteredRooms.map((rm) => {
                      const isSelected = selectedRoomId === rm.room_id;
                      const hasEnoughBeds =
                        rm.available_capacity >= 1 + verifiedRoommates.length;

                      return (
                        <div
                          key={rm.room_id}
                          className={`room-selection-card ${isSelected ? "selected" : ""}`}
                        >
                          <div>
                            <div className="room-card-head">
                              <div>
                                <h3 className="room-title">
                                  Room {rm.room_number}
                                </h3>
                                <span className="room-hostel-name">
                                  Hostel ID: {rm.hostel_id} • Floor {rm.floor}
                                </span>
                              </div>
                              <span className="badge badge-info">
                                {rm.available_capacity} Bed
                                {rm.available_capacity > 1 ? "s" : ""} Left
                              </span>
                            </div>

                            <div
                              style={{
                                marginTop: "0.75rem",
                                fontSize: "0.8125rem",
                              }}
                            >
                              <div>
                                <strong>Total Capacity:</strong> {rm.capacity}{" "}
                                beds
                              </div>
                              <div>
                                <strong>Status:</strong> {rm.status}
                              </div>
                            </div>
                          </div>

                          <div>
                            {!hasEnoughBeds && (
                              <div
                                style={{
                                  fontSize: "0.75rem",
                                  color: "var(--danger-color)",
                                  marginBottom: "0.5rem",
                                }}
                              >
                                ⚠️ Needs {1 + verifiedRoommates.length} beds
                                (You + {verifiedRoommates.length} roommate
                                {verifiedRoommates.length > 1 ? "s" : ""}).
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={() => setSelectedRoomId(rm.room_id)}
                              disabled={
                                !hasEnoughBeds ||
                                (!counselling?.is_active &&
                                  counselling?.status !== "PENDING")
                              }
                              className={`btn btn-sm ${isSelected ? "btn-primary" : "btn-secondary"}`}
                              style={{ width: "100%" }}
                            >
                              {isSelected ? "✓ Selected" : "Select Room"}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Confirm Allocation CTA */}
                {selectedRoomId && (
                  <div
                    style={{
                      marginTop: "1.5rem",
                      padding: "1rem",
                      background: "#eff6ff",
                      borderRadius: "8px",
                      border: "1px solid #bfdbfe",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: "1rem",
                    }}
                  >
                    <div>
                      <h4 style={{ margin: "0 0 0.25rem 0", color: "#1e40af" }}>
                        Ready to confirm Room{" "}
                        {
                          rooms.find((r) => r.room_id === selectedRoomId)
                            ?.room_number
                        }
                        ?
                      </h4>
                      <p
                        style={{
                          margin: 0,
                          fontSize: "0.8125rem",
                          color: "#1e3a8a",
                        }}
                      >
                        Primary:{" "}
                        <strong>
                          {student?.name} ({student?.reg_no})
                        </strong>
                        {verifiedRoommates.length > 0 &&
                          ` + Roommates: ${verifiedRoommates.join(", ")}`}
                      </p>
                    </div>
                    <button
                      onClick={handleAllocateRoom}
                      disabled={isSubmitting}
                      className="btn btn-primary"
                    >
                      {isSubmitting
                        ? "Confirming..."
                        : "Confirm Room Allocation"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 3: SERVICE REQUESTS ================= */}
        {activeTab === "requests" && (
          <div>
            <div className="card">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "1rem",
                  marginBottom: "1rem",
                }}
              >
                <div>
                  <h2 style={{ margin: 0, marginBottom: "0.25rem" }}>
                    Student Service Workflows
                  </h2>
                  <p
                    className="text-muted"
                    style={{ margin: 0, fontSize: "0.875rem" }}
                  >
                    Submit and monitor leave, room changes, mess adjustments,
                    and hostel complaints.
                  </p>
                </div>
              </div>

              {/* Segmented Sub-Navigation */}
              <div className="segmented-group" role="tablist">
                <button
                  className={`segmented-btn ${requestSubTab === "leave" ? "active" : ""}`}
                  onClick={() => setRequestSubTab("leave")}
                >
                  📅 Leave Request
                </button>
                <button
                  className={`segmented-btn ${requestSubTab === "room_change" ? "active" : ""}`}
                  onClick={() => setRequestSubTab("room_change")}
                >
                  🔄 Room Change
                </button>
                <button
                  className={`segmented-btn ${requestSubTab === "mess_change" ? "active" : ""}`}
                  onClick={() => setRequestSubTab("mess_change")}
                >
                  🍽️ Mess Change
                </button>
                <button
                  className={`segmented-btn ${requestSubTab === "complaint" ? "active" : ""}`}
                  onClick={() => setRequestSubTab("complaint")}
                >
                  🛠️ Complaints & Repairs
                </button>
                <button
                  className={`segmented-btn ${requestSubTab === "history" ? "active" : ""}`}
                  onClick={() => setRequestSubTab("history")}
                >
                  📜 Request History ({allHistoryItems.length})
                </button>
              </div>

              {/* SUB-FORM 1: Leave Request */}
              {requestSubTab === "leave" && (
                <form
                  onSubmit={handleLeaveSubmit}
                  style={{ maxWidth: "640px" }}
                >
                  <h3
                    style={{
                      fontSize: "1rem",
                      marginBottom: "0.75rem",
                      color: "var(--primary-color)",
                    }}
                  >
                    Hostel Outing / Leave Application
                  </h3>
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="leave-start">Start Date *</label>
                      <input
                        id="leave-start"
                        type="date"
                        required
                        value={leaveForm.start_date}
                        onChange={(e) =>
                          setLeaveForm({
                            ...leaveForm,
                            start_date: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="leave-end">End Date *</label>
                      <input
                        id="leave-end"
                        type="date"
                        required
                        min={leaveForm.start_date}
                        value={leaveForm.end_date}
                        onChange={(e) =>
                          setLeaveForm({
                            ...leaveForm,
                            end_date: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label htmlFor="leave-reason">Purpose of Leave *</label>
                    <textarea
                      id="leave-reason"
                      rows={3}
                      required
                      placeholder="Specify destination, reason, and emergency contact details (min 5 characters)..."
                      value={leaveForm.reason}
                      onChange={(e) =>
                        setLeaveForm({ ...leaveForm, reason: e.target.value })
                      }
                    />
                    <span className="form-hint">
                      Wardens review and approve all overnight hostel
                      permissions.
                    </span>
                  </div>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={isSubmitting || leaveForm.reason.length < 5}
                  >
                    {isSubmitting ? "Submitting..." : "Submit Leave Request"}
                  </button>
                </form>
              )}

              {/* SUB-FORM 2: Room Change Request */}
              {requestSubTab === "room_change" && (
                <div style={{ maxWidth: "640px" }}>
                  <h3
                    style={{
                      fontSize: "1rem",
                      marginBottom: "0.75rem",
                      color: "var(--primary-color)",
                    }}
                  >
                    Room Reallocation Request
                  </h3>

                  {!allocation ? (
                    <div className="portal-alert portal-alert-warning">
                      <span>
                        Room change applications are restricted to students with
                        an active confirmed room allocation.
                      </span>
                    </div>
                  ) : (
                    <form onSubmit={handleRoomChangeSubmit}>
                      <div className="form-group">
                        <label htmlFor="room-type-select">
                          Target Room Specification *
                        </label>
                        <select
                          id="room-type-select"
                          required
                          value={roomChangeForm.requested_room_type}
                          onChange={(e) =>
                            setRoomChangeForm({
                              ...roomChangeForm,
                              requested_room_type: e.target.value,
                            })
                          }
                        >
                          <option value="">
                            -- Choose Desired Room Type --
                          </option>
                          {roomTypes.map((rt) => (
                            <option key={rt.room_type_id} value={rt.type_name}>
                              {rt.type_name} ({rt.has_ac ? "AC" : "Non-AC"},
                              Capacity: {rt.capacity})
                            </option>
                          ))}
                        </select>
                        <span className="form-hint">
                          Current: {allocation.room_type} in{" "}
                          {allocation.hostel_name}
                        </span>
                      </div>

                      <div className="form-group">
                        <label htmlFor="room-change-reason">
                          Reason for Change *
                        </label>
                        <textarea
                          id="room-change-reason"
                          rows={3}
                          required
                          placeholder="State medical, academic, or personal grounds for room change (min 5 characters)..."
                          value={roomChangeForm.reason}
                          onChange={(e) =>
                            setRoomChangeForm({
                              ...roomChangeForm,
                              reason: e.target.value,
                            })
                          }
                        />
                        <span className="form-hint">
                          Reallocations are contingent upon bed vacancy and
                          hostel warden approval.
                        </span>
                      </div>

                      <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={
                          isSubmitting ||
                          !roomChangeForm.requested_room_type ||
                          roomChangeForm.reason.length < 5
                        }
                      >
                        {isSubmitting
                          ? "Submitting..."
                          : "Submit Room Change Request"}
                      </button>
                    </form>
                  )}
                </div>
              )}

              {/* SUB-FORM 3: Mess Change Request */}
              {requestSubTab === "mess_change" && (
                <form
                  onSubmit={handleMessChangeSubmit}
                  style={{ maxWidth: "640px" }}
                >
                  <h3
                    style={{
                      fontSize: "1rem",
                      marginBottom: "0.75rem",
                      color: "var(--primary-color)",
                    }}
                  >
                    Mess & Dining Plan Change
                  </h3>
                  <div className="form-group">
                    <label htmlFor="mess-select">Requested Mess Option *</label>
                    <select
                      id="mess-select"
                      required
                      value={messChangeForm.requested_mess}
                      onChange={(e) =>
                        setMessChangeForm({
                          ...messChangeForm,
                          requested_mess: e.target.value,
                        })
                      }
                    >
                      <option value="Special Mess">
                        Special Mess (Multi-Cuisine)
                      </option>
                      <option value="Veg Mess">Vegetarian Mess</option>
                      <option value="Non-Veg Mess">Non-Vegetarian Mess</option>
                      <option value="South Indian Mess">
                        South Indian Traditional Mess
                      </option>
                      <option value="North Indian Mess">
                        North Indian Traditional Mess
                      </option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="mess-reason">Reason for Preference *</label>
                    <textarea
                      id="mess-reason"
                      rows={3}
                      required
                      placeholder="State dietary requirement or reason (min 5 characters)..."
                      value={messChangeForm.reason}
                      onChange={(e) =>
                        setMessChangeForm({
                          ...messChangeForm,
                          reason: e.target.value,
                        })
                      }
                    />
                  </div>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={isSubmitting || messChangeForm.reason.length < 5}
                  >
                    {isSubmitting
                      ? "Submitting..."
                      : "Submit Mess Change Request"}
                  </button>
                </form>
              )}

              {/* SUB-FORM 4: Complaint */}
              {requestSubTab === "complaint" && (
                <form
                  onSubmit={handleComplaintSubmit}
                  style={{ maxWidth: "640px" }}
                >
                  <h3
                    style={{
                      fontSize: "1rem",
                      marginBottom: "0.75rem",
                      color: "var(--primary-color)",
                    }}
                  >
                    File Hostel Complaint / Maintenance Request
                  </h3>
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="complaint-category">
                        Issue Category *
                      </label>
                      <select
                        id="complaint-category"
                        required
                        value={complaintForm.category}
                        onChange={(e) =>
                          setComplaintForm({
                            ...complaintForm,
                            category: e.target.value,
                          })
                        }
                      >
                        <option value="Maintenance / Furniture">
                          Maintenance / Furniture
                        </option>
                        <option value="Electrical / Lighting">
                          Electrical / Lighting
                        </option>
                        <option value="Plumbing / Washroom">
                          Plumbing / Washroom
                        </option>
                        <option value="Cleanliness / Housekeeping">
                          Cleanliness / Housekeeping
                        </option>
                        <option value="Wi-Fi / Internet">
                          Wi-Fi & Internet
                        </option>
                        <option value="Noise / Discipline">
                          Noise / Discipline
                        </option>
                        <option value="Mess / Food Quality">
                          Mess / Food Quality
                        </option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label htmlFor="complaint-priority">Priority *</label>
                      <select
                        id="complaint-priority"
                        required
                        value={complaintForm.priority}
                        onChange={(e) =>
                          setComplaintForm({
                            ...complaintForm,
                            priority: e.target.value,
                          })
                        }
                      >
                        <option value="LOW">Low (Routine)</option>
                        <option value="MEDIUM">Medium (Urgent)</option>
                        <option value="HIGH">High (Emergency)</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="complaint-desc">
                      Description of Problem *
                    </label>
                    <textarea
                      id="complaint-desc"
                      rows={3}
                      required
                      placeholder="Describe the defect or problem in detail (min 10 characters)..."
                      value={complaintForm.description}
                      onChange={(e) =>
                        setComplaintForm({
                          ...complaintForm,
                          description: e.target.value,
                        })
                      }
                    />
                    <span className="form-hint">
                      Wardens and maintenance teams prioritize high urgency
                      safety tickets.
                    </span>
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={
                      isSubmitting || complaintForm.description.length < 10
                    }
                  >
                    {isSubmitting ? "Submitting..." : "Register Complaint"}
                  </button>
                </form>
              )}

              {/* SUB-TAB 5: Request History */}
              {requestSubTab === "history" && (
                <div>
                  <h3
                    style={{
                      fontSize: "1rem",
                      marginBottom: "0.75rem",
                      color: "var(--primary-color)",
                    }}
                  >
                    Historical Service Submissions
                  </h3>

                  {allHistoryItems.length === 0 ? (
                    <div className="empty-state">
                      <div className="empty-state-icon">📋</div>
                      <h3>No Records Found</h3>
                      <p>You have not submitted any service requests yet.</p>
                    </div>
                  ) : (
                    <div style={{ overflowX: "auto" }}>
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Type</th>
                            <th>Details & Reason</th>
                            <th>Date Submitted</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {allHistoryItems.map((item) => (
                            <tr key={item.id}>
                              <td>
                                <strong>{item.type}</strong>
                              </td>
                              <td>{item.details}</td>
                              <td style={{ whiteSpace: "nowrap" }}>
                                {item.date
                                  ? new Date(item.date).toLocaleDateString()
                                  : "N/A"}
                              </td>
                              <td>
                                <span
                                  className={`badge badge-${item.status?.toLowerCase() || "pending"}`}
                                >
                                  {item.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= TAB 4: NOTIFICATIONS ================= */}
        {activeTab === "notifications" && (
          <div className="card">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1.25rem",
                flexWrap: "wrap",
                gap: "1rem",
              }}
            >
              <div>
                <h2 style={{ margin: 0, marginBottom: "0.25rem" }}>
                  Notification Inbox
                </h2>
                <p
                  className="text-muted"
                  style={{ margin: 0, fontSize: "0.875rem" }}
                >
                  Official announcements, counselling updates, and request
                  outcomes.
                </p>
              </div>

              <div className="segmented-group" style={{ margin: 0 }}>
                <button
                  className={`segmented-btn ${notifFilter === "unread" ? "active" : ""}`}
                  onClick={() => setNotifFilter("unread")}
                >
                  Unread ({unreadNotifications.length})
                </button>
                <button
                  className={`segmented-btn ${notifFilter === "all" ? "active" : ""}`}
                  onClick={() => setNotifFilter("all")}
                >
                  All ({unreadNotifications.length})
                </button>
              </div>
            </div>

            {unreadNotifications.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">🎉</div>
                <h3>All Caught Up</h3>
                <p>No new notifications at this time.</p>
              </div>
            ) : (
              <ul className="notification-list">
                {unreadNotifications.map((n) => (
                  <li key={n.notification_id} className="notification-item">
                    <div className="notification-content">
                      <h4>{n.title}</h4>
                      <p>{n.message}</p>
                      <span
                        style={{
                          fontSize: "0.75rem",
                          color: "var(--text-muted)",
                          marginTop: "0.25rem",
                          display: "inline-block",
                        }}
                      >
                        {new Date(n.created_at).toLocaleString()}
                      </span>
                    </div>
                    <button
                      onClick={() => markNotificationRead(n.notification_id)}
                      className="btn btn-secondary btn-sm"
                    >
                      Mark Read
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
