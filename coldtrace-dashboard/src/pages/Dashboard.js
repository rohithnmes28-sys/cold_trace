import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';
import {
  AlertTriangle,
  Thermometer,
  Battery,
  DoorClosed,
  DoorOpen,
  Clock,
  MapPin,
  Plus,
  Phone,
  User,
  Radio,
  X,
  Square
} from 'lucide-react';
import L from 'leaflet';
import './Dashboard.css';

import markerIconPng from 'leaflet/dist/images/marker-icon.png';

const customIcon = new L.Icon({
  iconUrl: markerIconPng,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34]
});

const API_BASE =
  `${process.env.REACT_APP_API_BASE_URL}/api/device`;

const emptyTelemetry = {
  deviceId: '',
  name: '',
  number: '',
  temperature: 0,
  prediction: -1,
  latitude: 0,
  longitude: 0,
  door: 'Closed',
  battery: 0,
  timestamp: new Date().toISOString()
};

const Dashboard = () => {
  const [telemetry, setTelemetry] = useState(emptyTelemetry);
  const [history, setHistory] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [showSessionModal, setShowSessionModal] = useState(false);

  const [sessionForm, setSessionForm] = useState({
    deviceId: '',
    name: '',
    number: ''
  });

  const [savingSession, setSavingSession] = useState(false);
  const [sessionError, setSessionError] = useState('');

  const activeSessions = useMemo(
    () => sessions.filter((session) => session.active),
    [sessions]
  );

  const loadSessions = useCallback(async () => {
    try {
      const response = await fetch(
        `${API_BASE}/sessions`,
        { cache: 'no-store' }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch sessions');
      }

      const data = await response.json();

      setSessions(data);

      if (!selectedDeviceId && data.length > 0) {
        const active = data.find((session) => session.active);

        if (active) {
          setSelectedDeviceId(active.deviceId);
        }
      }
    } catch (err) {
      console.error(err);
    }
  }, [selectedDeviceId]);

  const loadTelemetry = useCallback(async () => {
    try {
      const latestQuery = selectedDeviceId
        ? `?deviceId=${encodeURIComponent(selectedDeviceId)}`
        : '';

      const historyQuery = selectedDeviceId
        ? `?deviceId=${encodeURIComponent(selectedDeviceId)}&limit=200`
        : '?limit=200';

      const [latestResponse, historyResponse] = await Promise.all([
        fetch(
          `${API_BASE}/latest${latestQuery}`,
          { cache: 'no-store' }
        ),

        fetch(
          `${API_BASE}/history${historyQuery}`,
          { cache: 'no-store' }
        )
      ]);

      if (latestResponse.ok) {
        const data = await latestResponse.json();

        setTelemetry(data);
      } else if (selectedDeviceId) {
        setTelemetry({
          ...emptyTelemetry,
          deviceId: selectedDeviceId
        });
      }

      if (historyResponse.ok) {
        const data = await historyResponse.json();

        setHistory(data);
      }
    } catch (err) {
      console.error(err);
    }
  }, [selectedDeviceId]);

  useEffect(() => {
    loadSessions();

    const interval = setInterval(
      loadSessions,
      5000
    );

    return () => clearInterval(interval);
  }, [loadSessions]);

  useEffect(() => {
    loadTelemetry();

    const interval = setInterval(
      loadTelemetry,
      2000
    );

    return () => clearInterval(interval);
  }, [loadTelemetry]);

  const getStatus = (predictionMins) => {
    if (predictionMins === -1) {
      return {
        label: 'OPTIMAL COLD-CHAIN',
        class: 'status-safe',
        icon: false
      };
    }

    if (predictionMins <= 20) {
      return {
        label: 'CRITICAL BREACH ALERT',
        class: 'status-critical',
        icon: true
      };
    }

    if (predictionMins <= 60) {
      return {
        label: 'WARNING - THERMAL DECAY',
        class: 'status-warning',
        icon: false
      };
    }

    return {
      label: 'OPTIMAL COLD-CHAIN',
      class: 'status-safe',
      icon: false
    };
  };

  const status = getStatus(
    Number(telemetry.prediction)
  );

  const openNewSession = () => {
    setSessionError('');

    setSessionForm({
      deviceId: selectedDeviceId || '',
      name: '',
      number: ''
    });

    setShowSessionModal(true);
  };

  const startSession = async (event) => {
    event.preventDefault();

    setSessionError('');
    setSavingSession(true);

    try {
      const response = await fetch(
        `${API_BASE}/session/start`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(sessionForm)
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || 'Failed to start session'
        );
      }

      setShowSessionModal(false);

      setSelectedDeviceId(
        data.deviceId
      );

      await loadSessions();
      await loadTelemetry();
    } catch (err) {
      setSessionError(err.message);
    } finally {
      setSavingSession(false);
    }
  };

  const endSession = async (deviceId) => {
    if (
      !window.confirm(
        `End the current session for ${deviceId}?`
      )
    ) {
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE}/session/end`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ deviceId })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || 'Failed to end session'
        );
      }

      await loadSessions();

      if (selectedDeviceId === deviceId) {
        setTelemetry({
          ...emptyTelemetry,
          deviceId
        });
      }
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  };

  const selectedSession = activeSessions.find(
    (session) =>
      session.deviceId === selectedDeviceId
  );

  const chartData = [...history].reverse();

  const hasLocation =
    Number.isFinite(
      Number(telemetry.latitude)
    ) &&
    Number.isFinite(
      Number(telemetry.longitude)
    ) &&
    (
      Number(telemetry.latitude) !== 0 ||
      Number(telemetry.longitude) !== 0
    );

  return (
    <div className="dashboard-container">

      <header className="dashboard-header">

        <div>
          <h1 className="header-title">
            ColdTrace Control Panel
          </h1>

          <p className="header-subtitle">
            Distributed Vaccine Integrity Assurance
            {selectedDeviceId
              ? ` | Node ID: ${selectedDeviceId}`
              : ''}
          </p>
        </div>

        <div className="header-actions">

          <select
            className="device-select"
            value={selectedDeviceId}
            onChange={(e) =>
              setSelectedDeviceId(
                e.target.value
              )
            }
          >
            <option value="">
              All / Latest Device
            </option>

            {sessions.map((session) => (
              <option
                key={session._id}
                value={session.deviceId}
              >
                {session.deviceId}
                {session.active
                  ? ` — ${session.name}`
                  : ''}
              </option>
            ))}
          </select>

          <button
            className="primary-button"
            onClick={openNewSession}
          >
            <Plus size={18} />
            Start New Session
          </button>

          <div
            className={`status-badge ${status.class}`}
          >
            {status.icon && (
              <AlertTriangle
                size={18}
                className="pulse-icon"
              />
            )}

            <span>
              {status.label}
            </span>
          </div>

        </div>
      </header>

      {activeSessions.length > 0 && (
        <div className="sessions-panel panel-card">

          <div className="sessions-heading">

            <div>
              <h3 className="panel-title">
                <Radio size={18} />
                Active Vaccine Sessions
              </h3>

              <p className="panel-subtitle">
                Select a node to view its live telemetry.
              </p>
            </div>

            <button
              className="secondary-button"
              onClick={openNewSession}
            >
              <Plus size={16} />
              Add Node / Session
            </button>

          </div>

          <div className="session-grid">

            {activeSessions.map((session) => (

              <div
                key={session._id}
                className={`session-card ${
                  selectedDeviceId === session.deviceId
                    ? 'session-card-selected'
                    : ''
                }`}
                onClick={() =>
                  setSelectedDeviceId(
                    session.deviceId
                  )
                }
              >

                <div className="session-card-top">

                  <div>

                    <div className="session-device">
                      {session.deviceId}
                    </div>

                    <div className="session-name">
                      <User size={15} />
                      {session.name}
                    </div>

                  </div>

                  <span className="active-dot">
                    ACTIVE
                  </span>

                </div>

                <div className="session-contact">
                  <Phone size={14} />
                  {session.number}
                </div>

                <button
                  className="end-session-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    endSession(
                      session.deviceId
                    );
                  }}
                >
                  <Square size={14} />
                  End Session
                </button>

              </div>

            ))}

          </div>

        </div>
      )}

      <div className="selected-session-bar">

        <div>
          <span className="selected-label">
            CURRENT NODE
          </span>

          <strong>
            {selectedDeviceId ||
              'No device selected'}
          </strong>
        </div>

        {selectedSession && (
          <div className="selected-handler">

            <User size={16} />

            <span>
              {selectedSession.name}
            </span>

            <Phone size={16} />

            <span>
              {selectedSession.number}
            </span>

          </div>
        )}

      </div>

      <div className="stats-grid">

        <div
          className={`stat-card ${
            Number(telemetry.prediction) <= 20
              ? 'alert-border'
              : ''
          }`}
        >

          <div className="card-header">
            <Clock size={18} />
            <span>Time to Breach</span>
          </div>

          <div className="card-value red-accent">
            {telemetry.prediction}
            <span className="unit">
              mins
            </span>
          </div>

        </div>

        <div className="stat-card">

          <div className="card-header">
            <Thermometer size={18} />
            <span>Vaccine Temp</span>
          </div>

          <div className="card-value">
            {telemetry.temperature}
            <span className="unit">
              °C
            </span>
          </div>

        </div>

        <div className="stat-card">

          <div className="card-header">

            {telemetry.door === 'Open' ? (
              <DoorOpen
                size={18}
                className="text-red"
              />
            ) : (
              <DoorClosed size={18} />
            )}

            <span>
              Box State
            </span>

          </div>

          <div
            className={`card-value ${
              telemetry.door === 'Open'
                ? 'text-red'
                : ''
            }`}
          >
            {telemetry.door}
          </div>

        </div>

        <div className="stat-card">

          <div className="card-header">
            <Battery size={18} />
            <span>Node Battery</span>
          </div>

          <div className="card-value">
            {telemetry.battery}
            <span className="unit">
              %
            </span>
          </div>

        </div>

      </div>

      <div className="content-grid">

        <div className="panel-card">

          <h3 className="panel-title">
            Thermal Decay History
          </h3>

          <div className="chart-wrapper">

            <ResponsiveContainer
              width="100%"
              height={300}
            >

              <LineChart data={chartData}>

                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#e2e8f0"
                />

                <XAxis
                  dataKey="timestamp"
                  stroke="#64748b"
                  fontSize={12}
                  tickFormatter={(value) =>
                    new Date(value)
                      .toLocaleTimeString(
                        [],
                        {
                          hour: '2-digit',
                          minute: '2-digit'
                        }
                      )
                  }
                />

                <YAxis
                  domain={[0, 12]}
                  stroke="#64748b"
                  fontSize={12}
                  unit="°C"
                />

                <Tooltip
                  labelFormatter={(value) =>
                    new Date(value)
                      .toLocaleString()
                  }
                />

                <ReferenceLine
                  y={8}
                  label="Max Threshold (8°C)"
                  stroke="#ef4444"
                  strokeDasharray="4 4"
                />

                <Line
                  type="monotone"
                  dataKey="temperature"
                  stroke="#2563eb"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 6 }}
                />

              </LineChart>

            </ResponsiveContainer>

          </div>

        </div>

        <div className="panel-card">

          <h3 className="panel-title">
            <MapPin size={18} />
            Live GNSS Location
          </h3>

          <div className="map-container-wrapper">

            <MapContainer
              center={[
                Number(telemetry.latitude) ||
                  12.9716,

                Number(telemetry.longitude) ||
                  77.5946
              ]}
              zoom={13}
              scrollWheelZoom={false}
              style={{
                height: '300px',
                width: '100%',
                borderRadius: '8px'
              }}
            >

              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {hasLocation && (
                <Marker
                  position={[
                    Number(
                      telemetry.latitude
                    ),
                    Number(
                      telemetry.longitude
                    )
                  ]}
                  icon={customIcon}
                >
                  <Popup>

                    <strong>
                      {telemetry.deviceId ||
                        'ColdTrace Node'}
                    </strong>

                    <br />

                    Temp:
                    {' '}
                    {telemetry.temperature}
                    °C

                    <br />

                    Breach Est:
                    {' '}
                    {telemetry.prediction}
                    {' '}
                    mins

                  </Popup>
                </Marker>
              )}

            </MapContainer>

          </div>

        </div>

      </div>

      <div className="panel-card table-panel">

        <h3 className="panel-title">
          Recent Telemetry Audit Log
        </h3>

        <div className="table-responsive">

          <table className="audit-table">

            <thead>

              <tr>
                <th>Device</th>
                <th>Time</th>
                <th>Temperature</th>
                <th>Door State</th>
                <th>Est. Breach</th>
                <th>Location</th>
              </tr>

            </thead>

            <tbody>

              {history.map((row) => (

                <tr key={row._id}>

                  <td>
                    {row.deviceId}
                  </td>

                  <td>
                    {new Date(
                      row.timestamp
                    ).toLocaleTimeString(
                      [],
                      {
                        hour: '2-digit',
                        minute: '2-digit'
                      }
                    )}
                  </td>

                  <td>
                    {row.temperature}°C
                  </td>

                  <td>

                    <span
                      className={`badge ${
                        row.door === 'Open'
                          ? 'badge-danger'
                          : 'badge-success'
                      }`}
                    >
                      {row.door}
                    </span>

                  </td>

                  <td>
                    {row.prediction} mins
                  </td>

                  <td>
                    {Number(
                      row.latitude
                    ).toFixed(4)}
                    ,{' '}
                    {Number(
                      row.longitude
                    ).toFixed(4)}
                  </td>

                </tr>

              ))}

            </tbody>

          </table>

        </div>

      </div>

      {showSessionModal && (

        <div
          className="modal-backdrop"
          onMouseDown={() =>
            setShowSessionModal(false)
          }
        >

          <div
            className="session-modal"
            onMouseDown={(e) =>
              e.stopPropagation()
            }
          >

            <div className="modal-header">

              <div>

                <h2>
                  Start New Vaccine Session
                </h2>

                <p>
                  Assign a carrier to a specific
                  ColdTrace device.
                </p>

              </div>

              <button
                className="icon-button"
                onClick={() =>
                  setShowSessionModal(false)
                }
                aria-label="Close"
              >
                <X size={20} />
              </button>

            </div>

            <form onSubmit={startSession}>

              <label>

                Device ID

                <input
                  value={
                    sessionForm.deviceId
                  }
                  onChange={(e) =>
                    setSessionForm({
                      ...sessionForm,
                      deviceId:
                        e.target.value.trim()
                    })
                  }
                  placeholder="device001"
                  required
                />

                <span className="field-help">
                  Must match the NODE_ID programmed
                  into the nRF52840.
                </span>

              </label>

              <label>

                Carrier Name

                <input
                  value={
                    sessionForm.name
                  }
                  onChange={(e) =>
                    setSessionForm({
                      ...sessionForm,
                      name: e.target.value
                    })
                  }
                  placeholder="Person carrying the vaccine"
                  required
                />

              </label>

              <label>

                Contact Number

                <input
                  value={
                    sessionForm.number
                  }
                  onChange={(e) =>
                    setSessionForm({
                      ...sessionForm,
                      number: e.target.value
                    })
                  }
                  placeholder="9876543210"
                  inputMode="tel"
                  required
                />

              </label>

              {sessionError && (
                <div className="form-error">
                  {sessionError}
                </div>
              )}

              <div className="modal-actions">

                <button
                  type="button"
                  className="secondary-button"
                  onClick={() =>
                    setShowSessionModal(false)
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-button"
                  disabled={savingSession}
                >

                  <Radio size={17} />

                  {savingSession
                    ? 'Starting...'
                    : 'Start Session'}

                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </div>
  );
};

export default Dashboard;
