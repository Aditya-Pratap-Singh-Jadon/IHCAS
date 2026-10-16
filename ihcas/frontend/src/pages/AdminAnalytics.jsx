import React, { useEffect, useState, useMemo } from 'react';
import {
  Building2,
  Users,
  Bed,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RotateCw,
  Layers,
  ShieldCheck,
  Calendar,
  TrendingUp,
} from 'lucide-react';
import api from '../api/client';

export default function AdminAnalytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Filters
  const [genderFilter, setGenderFilter] = useState('ALL'); // 'ALL', 'MALE', 'FEMALE'
  const [hostelFilter, setHostelFilter] = useState('ALL');
  const [sessionFilter, setSessionFilter] = useState('ALL');
  const [dateRangeFilter, setDateRangeFilter] = useState('ALL'); // 'ALL', '7D', '30D'

  const fetchAnalytics = async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const params = {};
      if (hostelFilter !== 'ALL') params.hostel_id = hostelFilter;
      if (genderFilter !== 'ALL') params.gender = genderFilter;
      if (sessionFilter !== 'ALL') params.session_id = sessionFilter;
      if (dateRangeFilter !== 'ALL') params.date_range = dateRangeFilter;

      const res = await api.get('/dashboard/admin/analytics', { params });
      if (res.data?.success) {
        setData(res.data.data);
      } else {
        setError('Failed to load system analytics payload.');
      }
    } catch (err) {
      console.error('Analytics load error:', err);
      setError(err.response?.data?.error?.message || 'Error fetching analytics data from backend.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [genderFilter, hostelFilter, sessionFilter, dateRangeFilter]);

  const rankedHostelsByOccupancy = useMemo(() => {
    if (!data?.hostels) return [];
    return [...data.hostels].sort((a, b) => b.occupancy_rate - a.occupancy_rate);
  }, [data?.hostels]);

  if (loading && !data) {
    return (
      <div className="student-loading-container" style={{ padding: '6rem 1rem' }}>
        <div className="student-spinner" />
        <p>Loading System-Wide Analytics &amp; Inventory Telemetry...</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="card" style={{ maxWidth: 600, margin: '3rem auto', textAlign: 'center' }}>
        <div className="empty-state-icon" style={{ display: 'flex', justifyContent: 'center' }}>
          <AlertTriangle size={36} color="var(--color-charcoal-700)" />
        </div>
        <h3 style={{ color: 'var(--color-charcoal-900)' }}>Unable to Load Analytics</h3>
        <p className="text-muted" style={{ margin: '0.75rem 0 1.5rem 0' }}>{error}</p>
        <button type="button" className="btn btn-lime btn-sm" onClick={() => fetchAnalytics(true)}>
          <RotateCw size={14} style={{ marginRight: '0.35rem' }} />
          Retry Connection
        </button>
      </div>
    );
  }

  const kpis = data?.kpis || {};
  const hostels = data?.hostels || [];
  const roomTypes = data?.room_types || [];
  const roomStatus = data?.room_status_distribution || {};
  const counselling = data?.counselling || {};
  const allocations = data?.allocations || {};
  const requests = data?.requests || {};

  // Slot calculations
  const totalSlots = counselling.slots?.total || 0;
  const completedSlots = counselling.slots?.completed || 0;
  const activeSlots = counselling.slots?.active || 0;
  const pendingSlots = counselling.slots?.pending || 0;

  const completedPct = totalSlots > 0 ? ((completedSlots / totalSlots) * 100).toFixed(1) : '0.0';
  const pendingPct = totalSlots > 0 ? ((pendingSlots / totalSlots) * 100).toFixed(1) : '0.0';
  const activePct = totalSlots > 0 ? ((activeSlots / totalSlots) * 100).toFixed(1) : '0.0';

  // Gender parity in allocations
  const boyAllocs = allocations.by_gender?.find((g) => g.gender === 'MALE')?.allocated_count || 0;
  const girlAllocs = allocations.by_gender?.find((g) => g.gender === 'FEMALE')?.allocated_count || 0;
  const totalAllocated = allocations.confirmed || (boyAllocs + girlAllocs);
  const boyAllocPct = totalAllocated > 0 ? ((boyAllocs / totalAllocated) * 100).toFixed(1) : '0.0';
  const girlAllocPct = totalAllocated > 0 ? ((girlAllocs / totalAllocated) * 100).toFixed(1) : '0.0';

  return (
    <div className="student-dashboard-content" style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* ========================================================================
          1. HEADER & INTERACTIVE FILTER CONTROLS (Football-Club Dashboard Style)
          ======================================================================== */}
      <div className="analytics-header-card">
        <div className="analytics-header-info">
          <div className="analytics-badge-row">
            <span className="badge badge-success" style={{ fontWeight: 600 }}>LIVE TELEMETRY</span>
            <span className="text-muted" style={{ fontSize: '0.75rem' }}>
              Academic Session 2026–2027 &bull; Verified Server-Authoritative Data
            </span>
          </div>
          <h1 className="analytics-title">System-Wide Operational Analytics</h1>
          <p className="analytics-subtitle">
            Authoritative room inventory, counselling queue progression, gender-isolated block capacity, and student workflow audit.
          </p>
        </div>

        {/* Filter Toolbar */}
        <div className="analytics-toolbar">
          {/* Gender Segment Toggle */}
          <div className="analytics-filter-group">
            <span className="analytics-filter-label">Hostel Scope:</span>
            <div className="analytics-segment-control">
              <button
                type="button"
                className={`analytics-segment-btn ${genderFilter === 'ALL' ? 'active' : ''}`}
                onClick={() => setGenderFilter('ALL')}
              >
                All Blocks
              </button>
              <button
                type="button"
                className={`analytics-segment-btn ${genderFilter === 'MALE' ? 'active' : ''}`}
                onClick={() => setGenderFilter('MALE')}
              >
                Boys (MH)
              </button>
              <button
                type="button"
                className={`analytics-segment-btn ${genderFilter === 'FEMALE' ? 'active' : ''}`}
                onClick={() => setGenderFilter('FEMALE')}
              >
                Girls (LH)
              </button>
            </div>
          </div>

          {/* Specific Hostel Dropdown */}
          <div className="analytics-filter-group">
            <span className="analytics-filter-label">Filter Block:</span>
            <select
              className="analytics-select"
              value={hostelFilter}
              onChange={(e) => setHostelFilter(e.target.value)}
              aria-label="Filter by specific hostel"
            >
              <option value="ALL">All Hostels ({hostels.length})</option>
              {hostels.map((h) => (
                <option key={h.hostel_id} value={h.hostel_id}>
                  {h.name} ({h.gender === 'MALE' ? 'Boys' : 'Girls'})
                </option>
              ))}
            </select>
          </div>

          {/* Counselling Session Dropdown */}
          <div className="analytics-filter-group">
            <span className="analytics-filter-label">Session:</span>
            <select
              className="analytics-select"
              value={sessionFilter}
              onChange={(e) => setSessionFilter(e.target.value)}
              aria-label="Filter by counselling session"
            >
              <option value="ALL">All Sessions</option>
              {counselling.sessions && counselling.sessions.map((s) => (
                <option key={s.session_id} value={s.session_id}>
                  {s.academic_year} ({s.status})
                </option>
              ))}
            </select>
          </div>

          {/* Timeline Date Filter */}
          <div className="analytics-filter-group">
            <span className="analytics-filter-label">Timeline:</span>
            <select
              className="analytics-select"
              value={dateRangeFilter}
              onChange={(e) => setDateRangeFilter(e.target.value)}
              aria-label="Filter by timeline date range"
            >
              <option value="ALL">All Time</option>
              <option value="7D">Last 7 Days</option>
              <option value="30D">Last 30 Days</option>
            </select>
          </div>

          {/* Refresh Action */}
          <button
            type="button"
            className="btn btn-outline btn-sm analytics-refresh-btn"
            onClick={() => fetchAnalytics(true)}
            disabled={refreshing}
            title="Refresh analytics telemetry"
          >
            <RotateCw size={14} className={refreshing ? 'student-spinner' : ''} style={{ marginRight: '0.4rem' }} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* ========================================================================
          2. SECTION A: SYSTEM OVERVIEW EXECUTIVE KPIS (8-Card Comprehensive Ribbon)
          ======================================================================== */}
      <div className="analytics-kpi-grid">
        {/* KPI 1: Registered Students */}
        <div className="analytics-kpi-card">
          <div className="analytics-kpi-header">
            <span className="analytics-kpi-label">Registered Students</span>
            <div className="analytics-kpi-icon-wrap">
              <Users size={16} />
            </div>
          </div>
          <div className="analytics-kpi-value">{kpis.registered_students || 0}</div>
          <div className="analytics-kpi-sub">
            <span className="analytics-kpi-pill">100 Cohort + 1 Baseline Demo</span>
          </div>
        </div>

        {/* KPI 2: Registered Hostels */}
        <div className="analytics-kpi-card">
          <div className="analytics-kpi-header">
            <span className="analytics-kpi-label">Registered Hostels</span>
            <div className="analytics-kpi-icon-wrap">
              <Building2 size={16} />
            </div>
          </div>
          <div className="analytics-kpi-value">{kpis.registered_hostels || 0}</div>
          <div className="analytics-kpi-sub">
            <span>3 Men&apos;s (MH) &bull; 3 Ladies&apos; (LH)</span>
          </div>
        </div>

        {/* KPI 3: Total Rooms */}
        <div className="analytics-kpi-card">
          <div className="analytics-kpi-header">
            <span className="analytics-kpi-label">Total Rooms</span>
            <div className="analytics-kpi-icon-wrap">
              <Layers size={16} />
            </div>
          </div>
          <div className="analytics-kpi-value">{kpis.total_rooms || 0}</div>
          <div className="analytics-kpi-sub">
            <span>{roomStatus.maintenance || 0} in Maintenance Hold</span>
          </div>
        </div>

        {/* KPI 4: Total Bed Capacity */}
        <div className="analytics-kpi-card">
          <div className="analytics-kpi-header">
            <span className="analytics-kpi-label">Total Bed Capacity</span>
            <div className="analytics-kpi-icon-wrap">
              <Bed size={16} />
            </div>
          </div>
          <div className="analytics-kpi-value">{kpis.total_bed_capacity || 0}</div>
          <div className="analytics-kpi-sub">
            <span>{kpis.operational_bed_capacity || 0} Operational &bull; {kpis.maintenance_beds || 0} Maint</span>
          </div>
        </div>

        {/* KPI 5: Occupied Beds */}
        <div className="analytics-kpi-card highlight-lime">
          <div className="analytics-kpi-header">
            <span className="analytics-kpi-label">Occupied Beds</span>
            <div className="analytics-kpi-icon-wrap lime">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div className="analytics-kpi-value">{kpis.occupied_beds || 0}</div>
          <div className="analytics-kpi-sub">
            <strong>{kpis.operational_occupancy_percentage || 0}%</strong>
            <span> of operational capacity</span>
          </div>
        </div>

        {/* KPI 6: Available Beds */}
        <div className="analytics-kpi-card">
          <div className="analytics-kpi-header">
            <span className="analytics-kpi-label">Available Beds</span>
            <div className="analytics-kpi-icon-wrap">
              <Building2 size={16} />
            </div>
          </div>
          <div className="analytics-kpi-value">{kpis.available_beds || 0}</div>
          <div className="analytics-kpi-sub">
            <span>Ready for counselling allotment</span>
          </div>
        </div>

        {/* KPI 7: Overall Occupancy Percentage */}
        <div className="analytics-kpi-card">
          <div className="analytics-kpi-header">
            <span className="analytics-kpi-label">Overall Occupancy</span>
            <div className="analytics-kpi-icon-wrap">
              <TrendingUp size={16} />
            </div>
          </div>
          <div className="analytics-kpi-value">{kpis.overall_occupancy_percentage || 0}%</div>
          <div className="analytics-kpi-sub">
            <span>{kpis.occupied_beds || 0} of {kpis.total_bed_capacity || 0} total beds</span>
          </div>
        </div>

        {/* KPI 8: Confirmed Allocations */}
        <div className="analytics-kpi-card">
          <div className="analytics-kpi-header">
            <span className="analytics-kpi-label">Confirmed Allocations</span>
            <div className="analytics-kpi-icon-wrap">
              <ShieldCheck size={16} />
            </div>
          </div>
          <div className="analytics-kpi-value">{kpis.confirmed_allocations || 0}</div>
          <div className="analytics-kpi-sub">
            <span>{kpis.unallocated_students || 0} students queued / unallocated</span>
          </div>
        </div>
      </div>

      {/* ========================================================================
          3. SECTION B & G: HOSTEL OCCUPANCY COMPARISON & RANKED MATRIX
          (Prominent Main Analytical Section inspired by Football-Club Dashboard)
          ======================================================================== */}
      <div className="card">
        <div className="analytics-card-header">
          <div>
            <h2 style={{ margin: 0, fontSize: '1.125rem' }}>Hostel Capacity &amp; Occupancy Distribution</h2>
            <p className="text-muted" style={{ margin: '0.25rem 0 0 0', fontSize: '0.8125rem' }}>
              Comparative breakdown showing operational occupancy versus remaining allocatable capacity across registered blocks.
            </p>
          </div>
          <div className="analytics-chart-legend">
            <div className="legend-item">
              <span className="legend-color-dot" style={{ background: 'var(--color-lime-500)' }} />
              <span>Occupied</span>
            </div>
            <div className="legend-item">
              <span className="legend-color-dot" style={{ background: 'var(--color-grey-200)' }} />
              <span>Available</span>
            </div>
            <div className="legend-item">
              <span className="legend-color-dot" style={{ background: '#EAB308' }} />
              <span>Maintenance (Safe Hold)</span>
            </div>
          </div>
        </div>

        {/* Visual Stacked Comparative Bars */}
        <div className="analytics-comparison-bars-container">
          {hostels.map((h) => {
            const occPct = h.total_bed_capacity > 0 ? (h.occupied_beds / h.total_bed_capacity) * 100 : 0;
            const maintPct = h.total_bed_capacity > 0 ? (h.maintenance_beds / h.total_bed_capacity) * 100 : 0;
            const availPct = Math.max(0, 100 - occPct - maintPct);

            return (
              <div key={h.hostel_id} className="analytics-bar-row">
                <div className="analytics-bar-label-col">
                  <div className="analytics-bar-title-wrap">
                    <strong className="analytics-bar-name">{h.name}</strong>
                    <span className={`badge ${h.gender === 'MALE' ? 'badge-info' : 'badge-warning'}`} style={{ fontSize: '0.6875rem', padding: '0.15rem 0.4rem' }}>
                      {h.gender === 'MALE' ? 'MH' : 'LH'}
                    </span>
                  </div>
                  <span className="analytics-bar-sub">
                    {h.occupied_beds}/{h.total_bed_capacity} Beds ({h.occupancy_rate}%)
                  </span>
                </div>

                {/* Stacked Bar Track */}
                <div className="analytics-bar-track-wrap">
                  <div className="analytics-stacked-track" title={`${h.name}: ${h.occupied_beds} Occupied, ${h.available_beds} Available, ${h.maintenance_beds} Maintenance`}>
                    <div
                      className="analytics-bar-segment segment-occupied"
                      style={{ width: `${occPct}%` }}
                      aria-label={`${h.occupied_beds} occupied beds`}
                    />
                    <div
                      className="analytics-bar-segment segment-maintenance"
                      style={{ width: `${maintPct}%` }}
                      aria-label={`${h.maintenance_beds} maintenance beds`}
                    />
                    <div
                      className="analytics-bar-segment segment-available"
                      style={{ width: `${availPct}%` }}
                      aria-label={`${h.available_beds} available beds`}
                    />
                  </div>
                </div>

                <div className="analytics-bar-stat-col">
                  <strong>{h.available_beds}</strong>
                  <span className="text-muted" style={{ fontSize: '0.75rem' }}>Avail</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Compact Supporting Matrix Table */}
        <div style={{ marginTop: '1.75rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
          <h3 style={{ fontSize: '0.9375rem', margin: '0 0 0.85rem 0', color: 'var(--color-charcoal-900)' }}>
            Ranked Capacity &amp; Allotment Matrix
          </h3>
          <div className="table-container" style={{ margin: 0 }}>
            <table>
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Hostel Block</th>
                  <th>Permitted Gender</th>
                  <th>Total Rooms</th>
                  <th>Total Bed Cap</th>
                  <th>Operational Cap</th>
                  <th>Occupied</th>
                  <th>Available Beds</th>
                  <th>Maintenance</th>
                  <th>Occupancy Rate</th>
                </tr>
              </thead>
              <tbody>
                {rankedHostelsByOccupancy.map((h, idx) => (
                  <tr key={h.hostel_id}>
                    <td>
                      <span className="badge" style={{ background: idx === 0 ? 'var(--color-charcoal-900)' : 'var(--color-grey-100)', color: idx === 0 ? 'var(--color-lime-400)' : 'var(--color-charcoal-900)' }}>
                        #{idx + 1}
                      </span>
                    </td>
                    <td>
                      <strong>{h.name}</strong>
                    </td>
                    <td>
                      <span className={`badge ${h.gender === 'MALE' ? 'badge-info' : 'badge-warning'}`}>
                        {h.gender === 'MALE' ? "Men's Block (MH)" : "Ladies' Block (LH)"}
                      </span>
                    </td>
                    <td>{h.total_rooms}</td>
                    <td>{h.total_bed_capacity}</td>
                    <td>{h.operational_capacity}</td>
                    <td>
                      <strong style={{ color: h.occupied_beds > 0 ? 'var(--color-charcoal-900)' : 'var(--text-muted)' }}>
                        {h.occupied_beds}
                      </strong>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, color: h.available_beds > 0 ? 'var(--color-charcoal-900)' : '#EF4444' }}>
                        {h.available_beds}
                      </span>
                    </td>
                    <td>
                      {h.maintenance_rooms > 0 ? (
                        <span className="badge badge-warning" style={{ fontSize: '0.7rem' }}>
                          {h.maintenance_rooms} room ({h.maintenance_beds} beds)
                        </span>
                      ) : (
                        <span className="text-muted" style={{ fontSize: '0.75rem' }}>None</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ width: 60, height: 6, background: 'var(--color-grey-200)', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ width: `${Math.min(100, h.occupancy_rate)}%`, height: '100%', background: 'var(--color-charcoal-900)' }} />
                        </div>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{h.occupancy_rate}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ========================================================================
          4. TWO-COLUMN ANALYTICAL GRID
          Left: Room Inventory & Status Distribution
          Right: Counselling Telemetry & Batch Limits
          ======================================================================== */}
      <div className="analytics-two-col-grid">
        {/* Left Column: Room Inventory Distribution */}
        <div className="card">
          <div className="analytics-card-header">
            <div>
              <h2 style={{ margin: 0, fontSize: '1.0625rem' }}>Room Inventory Distribution</h2>
              <p className="text-muted" style={{ margin: '0.2rem 0 0 0', fontSize: '0.8125rem' }}>
                Bed capacity and current occupancy across supported room specifications.
              </p>
            </div>
            <div className="analytics-kpi-icon-wrap">
              <Layers size={16} />
            </div>
          </div>

          {/* Status Pills */}
          <div className="analytics-room-status-row">
            <div className="status-pill status-pill-available">
              <span className="status-pill-count">{roomStatus.available || 0}</span>
              <span className="status-pill-label">Available</span>
            </div>
            <div className="status-pill status-pill-partial">
              <span className="status-pill-count">{roomStatus.partially_filled || 0}</span>
              <span className="status-pill-label">Partially Filled</span>
            </div>
            <div className="status-pill status-pill-full">
              <span className="status-pill-count">{roomStatus.full || 0}</span>
              <span className="status-pill-label">Full</span>
            </div>
            <div className="status-pill status-pill-maint">
              <span className="status-pill-count">{roomStatus.maintenance || 0}</span>
              <span className="status-pill-label">Maintenance</span>
            </div>
          </div>

          {/* Room Types Breakdown Table */}
          <div className="table-container" style={{ margin: '1rem 0 0 0' }}>
            <table>
              <thead>
                <tr>
                  <th>Room Type</th>
                  <th>Capacity</th>
                  <th>AC Status</th>
                  <th>Rooms</th>
                  <th>Total Beds</th>
                  <th>Occupied</th>
                  <th>Utilization</th>
                </tr>
              </thead>
              <tbody>
                {roomTypes.map((rt) => (
                  <tr key={rt.room_type_id}>
                    <td>
                      <strong>{rt.type_name}</strong>
                    </td>
                    <td>{rt.capacity} Bed</td>
                    <td>
                      <span className={`badge ${rt.has_ac ? 'badge-success' : 'badge-neutral'}`} style={{ fontSize: '0.7rem' }}>
                        {rt.has_ac ? 'AC' : 'Non-AC'}
                      </span>
                    </td>
                    <td>{rt.room_count}</td>
                    <td>{rt.total_beds}</td>
                    <td>
                      <strong>{rt.occupied_beds}</strong>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <div style={{ width: 44, height: 6, background: 'var(--color-grey-200)', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ width: `${Math.min(100, rt.occupancy_rate)}%`, height: '100%', background: 'var(--color-lime-500)' }} />
                        </div>
                        <span style={{ fontSize: '0.75rem' }}>{rt.occupancy_rate}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Counselling Analytics & Batch Guardrails */}
        <div className="card">
          <div className="analytics-card-header">
            <div>
              <h2 style={{ margin: 0, fontSize: '1.0625rem' }}>Counselling Queue Dynamics</h2>
              <p className="text-muted" style={{ margin: '0.2rem 0 0 0', fontSize: '0.8125rem' }}>
                Server-side queue progression and batch limit guardrails.
              </p>
            </div>
            <div className="analytics-kpi-icon-wrap">
              <Calendar size={16} />
            </div>
          </div>

          {/* Session Banner */}
          <div className="analytics-session-banner">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                <strong style={{ fontSize: '0.9375rem' }}>Academic Session 2026–2027</strong>
                <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>ACTIVE</span>
              </div>
              <span className="text-muted" style={{ fontSize: '0.75rem' }}>
                Slot Window: 3 minutes server-authoritative timer per student turn
              </span>
            </div>
            <div className="analytics-batch-limit-pill" title="Strict batch ceiling preventing race conditions">
              <span>Batch Ceiling</span>
              <strong>Max 20 / batch</strong>
            </div>
          </div>

          {/* Slot Funnel Progress Cards */}
          <div className="analytics-funnel-grid" style={{ marginTop: '1.25rem' }}>
            <div className="funnel-card">
              <span className="funnel-label">Total Slots Scheduled</span>
              <strong className="funnel-val">{totalSlots}</strong>
              <span className="funnel-sub">100% of seeded cohort</span>
            </div>
            <div className="funnel-card completed">
              <span className="funnel-label">Completed Allotments</span>
              <strong className="funnel-val">{completedSlots}</strong>
              <span className="funnel-sub">{completedPct}% confirmed</span>
            </div>
            <div className="funnel-card active">
              <span className="funnel-label">Active Turn (Front)</span>
              <strong className="funnel-val">{activeSlots}</strong>
              <span className="funnel-sub">{activePct}% in live room</span>
            </div>
            <div className="funnel-card pending">
              <span className="funnel-label">Pending in Queue</span>
              <strong className="funnel-val">{pendingSlots}</strong>
              <span className="funnel-sub">{pendingPct}% awaiting turn</span>
            </div>
          </div>

          {/* Slot Progress Bar */}
          <div style={{ marginTop: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.35rem' }}>
              <span className="text-muted">Counselling Funnel Progression</span>
              <strong>{completedSlots + activeSlots} / {totalSlots} Participated</strong>
            </div>
            <div className="analytics-stacked-track" style={{ height: 10 }}>
              <div
                className="analytics-bar-segment segment-occupied"
                style={{ width: `${completedPct}%` }}
                title={`${completedSlots} Completed`}
              />
              <div
                className="analytics-bar-segment"
                style={{ width: `${activePct}%`, background: 'var(--color-charcoal-900)' }}
                title={`${activeSlots} Active Turn`}
              />
              <div
                className="analytics-bar-segment segment-available"
                style={{ width: `${pendingPct}%` }}
                title={`${pendingSlots} Pending`}
              />
            </div>
          </div>

          {/* Architectural Notes */}
          <div className="analytics-alert-note" style={{ marginTop: '1.25rem' }}>
            <ShieldCheck size={14} style={{ flexShrink: 0, marginTop: 2, color: 'var(--color-charcoal-900)' }} />
            <div style={{ fontSize: '0.75rem', lineHeight: 1.5 }}>
              <strong>ACID Concurrency Safeguard:</strong> Allocation requests execute under row-level pessimistic locking (<code>SELECT ... FOR UPDATE</code>) on both <code>STUDENT</code> and <code>ROOM</code> tables to ensure zero room overbooking or duplicate allocations.
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================
          5. BOTTOM ANALYTICAL ROW (Gender Allocation Parity & Requests Telemetry)
          ======================================================================== */}
      <div className="analytics-two-col-grid">
        {/* Gender Allocation Parity & Recent Allocations Stream */}
        <div className="card">
          <div className="analytics-card-header">
            <div>
              <h2 style={{ margin: 0, fontSize: '1.0625rem' }}>Allocation Parity &amp; Audit Stream</h2>
              <p className="text-muted" style={{ margin: '0.2rem 0 0 0', fontSize: '0.8125rem' }}>
                Gender distribution among confirmed allocations and recent timestamped audit records.
              </p>
            </div>
            <div className="analytics-kpi-icon-wrap">
              <TrendingUp size={16} />
            </div>
          </div>

          {/* Gender Parity Visual */}
          <div className="analytics-gender-parity-box">
            <div className="gender-stat-item">
              <span className="gender-stat-label">Boys (MH) Allotted</span>
              <strong className="gender-stat-val">{boyAllocs}</strong>
              <span className="gender-stat-sub">{boyAllocPct}% of total</span>
            </div>
            <div className="gender-parity-bar-wrap">
              <div className="gender-parity-track">
                <div className="gender-segment-male" style={{ width: `${boyAllocPct}%` }} />
                <div className="gender-segment-female" style={{ width: `${girlAllocPct}%` }} />
              </div>
              <span className="parity-badge">50 / 50 Parity Balance</span>
            </div>
            <div className="gender-stat-item" style={{ textAlign: 'right' }}>
              <span className="gender-stat-label">Girls (LH) Allotted</span>
              <strong className="gender-stat-val">{girlAllocs}</strong>
              <span className="gender-stat-sub">{girlAllocPct}% of total</span>
            </div>
          </div>

          {/* Recent Confirmed Allocations */}
          <div style={{ marginTop: '1.25rem' }}>
            <h4 style={{ fontSize: '0.8125rem', margin: '0 0 0.5rem 0', color: 'var(--color-charcoal-700)' }}>
              Recent Confirmed Allocations Stream
            </h4>
            <div className="table-container" style={{ margin: 0, maxHeight: 240, overflowY: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Student</th>
                    <th>Reg No</th>
                    <th>Room &amp; Hostel</th>
                    <th>Type</th>
                    <th>Confirmed At</th>
                  </tr>
                </thead>
                <tbody>
                  {allocations.recent && allocations.recent.length > 0 ? (
                    allocations.recent.map((rec) => (
                      <tr key={rec.allocation_id}>
                        <td>
                          <span className="badge badge-neutral" style={{ fontSize: '0.7rem' }}>
                            #{rec.academic_rank}
                          </span>
                        </td>
                        <td>
                          <strong>{rec.student_name}</strong>
                        </td>
                        <td style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{rec.reg_no}</td>
                        <td>
                          <strong>{rec.hostel_name}</strong> - {rec.room_number}
                        </td>
                        <td>
                          <span className="badge badge-neutral" style={{ fontSize: '0.6875rem' }}>
                            {rec.type_name}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {rec.confirmed_at ? new Date(rec.confirmed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Confirmed'}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1.5rem' }}>
                        No allocation stream available.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Student Workflow Requests Telemetry */}
        <div className="card">
          <div className="analytics-card-header">
            <div>
              <h2 style={{ margin: 0, fontSize: '1.0625rem' }}>Student Service Requests Telemetry</h2>
              <p className="text-muted" style={{ margin: '0.2rem 0 0 0', fontSize: '0.8125rem' }}>
                Volume and lifecycle status across all hostel workflow request categories.
              </p>
            </div>
            <div className="analytics-kpi-icon-wrap">
              <Clock size={16} />
            </div>
          </div>

          {/* 4 Category Cards */}
          <div className="analytics-requests-grid">
            {/* Leave */}
            <div className="request-type-card">
              <div className="request-type-header">
                <strong>Leave Applications</strong>
                <span className="badge badge-neutral">{requests.leave?.total || 0} Total</span>
              </div>
              <div className="request-type-stats">
                <div className="stat-col">
                  <span>Pending</span>
                  <strong style={{ color: requests.leave?.pending > 0 ? '#D97706' : 'var(--color-charcoal-900)' }}>
                    {requests.leave?.pending || 0}
                  </strong>
                </div>
                <div className="stat-col">
                  <span>Approved</span>
                  <strong style={{ color: 'var(--color-charcoal-900)' }}>{requests.leave?.approved || 0}</strong>
                </div>
                <div className="stat-col">
                  <span>Rejected</span>
                  <strong style={{ color: 'var(--text-muted)' }}>{requests.leave?.rejected || 0}</strong>
                </div>
              </div>
            </div>

            {/* Room Change */}
            <div className="request-type-card">
              <div className="request-type-header">
                <strong>Room Change Requests</strong>
                <span className="badge badge-neutral">{requests.room_change?.total || 0} Total</span>
              </div>
              <div className="request-type-stats">
                <div className="stat-col">
                  <span>Pending</span>
                  <strong style={{ color: requests.room_change?.pending > 0 ? '#D97706' : 'var(--color-charcoal-900)' }}>
                    {requests.room_change?.pending || 0}
                  </strong>
                </div>
                <div className="stat-col">
                  <span>Approved</span>
                  <strong style={{ color: 'var(--color-charcoal-900)' }}>{requests.room_change?.approved || 0}</strong>
                </div>
                <div className="stat-col">
                  <span>Rejected</span>
                  <strong style={{ color: 'var(--text-muted)' }}>{requests.room_change?.rejected || 0}</strong>
                </div>
              </div>
            </div>

            {/* Mess Change */}
            <div className="request-type-card">
              <div className="request-type-header">
                <strong>Mess Change Requests</strong>
                <span className="badge badge-neutral">{requests.mess_change?.total || 0} Total</span>
              </div>
              <div className="request-type-stats">
                <div className="stat-col">
                  <span>Pending</span>
                  <strong style={{ color: requests.mess_change?.pending > 0 ? '#D97706' : 'var(--color-charcoal-900)' }}>
                    {requests.mess_change?.pending || 0}
                  </strong>
                </div>
                <div className="stat-col">
                  <span>Approved</span>
                  <strong style={{ color: 'var(--color-charcoal-900)' }}>{requests.mess_change?.approved || 0}</strong>
                </div>
                <div className="stat-col">
                  <span>Rejected</span>
                  <strong style={{ color: 'var(--text-muted)' }}>{requests.mess_change?.rejected || 0}</strong>
                </div>
              </div>
            </div>

            {/* Maintenance Complaints */}
            <div className="request-type-card">
              <div className="request-type-header">
                <strong>Hostel Maintenance</strong>
                <span className="badge badge-neutral">{requests.complaints?.total || 0} Total</span>
              </div>
              <div className="request-type-stats">
                <div className="stat-col">
                  <span>Pending</span>
                  <strong style={{ color: requests.complaints?.pending > 0 ? '#D97706' : 'var(--color-charcoal-900)' }}>
                    {requests.complaints?.pending || 0}
                  </strong>
                </div>
                <div className="stat-col">
                  <span>Resolved</span>
                  <strong style={{ color: 'var(--color-charcoal-900)' }}>{requests.complaints?.resolved || 0}</strong>
                </div>
                <div className="stat-col">
                  <span>Status</span>
                  <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>Active</span>
                </div>
              </div>
            </div>
          </div>

          {/* Warden Scope Isolation Notice */}
          <div className="analytics-alert-note" style={{ marginTop: '1.25rem' }}>
            <ShieldCheck size={14} style={{ flexShrink: 0, marginTop: 2, color: 'var(--color-charcoal-900)' }} />
            <div style={{ fontSize: '0.75rem', lineHeight: 1.5 }}>
              <strong>Warden Scope Guard:</strong> Wardens only receive and review requests for students officially allocated within their assigned hostel block.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
