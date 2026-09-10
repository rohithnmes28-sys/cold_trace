import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  BatteryCharging,
  Box,
  CheckCircle,
  Clock,
  MapPin,
  Phone,
  Plus,
  Radio,
  RefreshCw,
  Search,
  ShieldAlert,
  Thermometer,
  User,
  X,
} from 'lucide-react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import LeafletMap from '../components/LeafletMap';
import {
  createSession,
  getDeviceTelemetryHistory,
  getLiveSessions,
} from '../services/api';

const DEFAULT_DEVICE_ID = 'device001';

export default function Dashboard() {
  const [activeSessions, setActiveSessions] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState(DEFAULT_DEVICE_ID);
  const [telemetryHistory, setTelemetryHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newDevice, setNewDevice] = useState({
    deviceId: '',
    name: '',
    phone: '',
  });

  const fetchData = useCallback(async () => {
    try {
      const sessionsData = await getLiveSessions();
      setActiveSessions(sessionsData || []);

      const chosenDevice = selectedDeviceId || DEFAULT_DEVICE_ID;
      const historyData = await getDeviceTelemetryHistory(chosenDevice);
      setTelemetryHistory(historyData || []);
      setError(null);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
      setError('Unable to fetch live telemetry right now.');
    } finally {
      setLoading(false);
    }
  }, [selectedDeviceId]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const activeSessionMap = useMemo(() => {
    const map = {};
    activeSessions.forEach((s) => {
      map[s.deviceId] = s;
    });
    return map;
  }, [activeSessions]);

  const activeDeviceIds = useMemo(() => {
    return activeSessions.map((s) => s.deviceId);
  }, [activeSessions]);

  const latestTelemetry = useMemo(() => {
    if (!telemetryHistory.length) return null;
    return telemetryHistory[telemetryHistory.length - 1];
  }, [telemetryHistory]);

  const status = useMemo(() => {
    if (!latestTelemetry) {
      return {
        label: 'NO SIGNAL',
        colorClass: 'status-neutral',
        icon: ShieldAlert,
      };
    }

    const temp = latestTelemetry.vaccineTemp;
    const isDoorOpen =
      latestTelemetry.boxState &&
      latestTelemetry.boxState.toLowerCase() === 'open';

    if (temp < 2 || temp > 8 || isDoorOpen) {
      return {
        label: 'BREACH DETECTED',
        colorClass: 'status-danger',
        icon: AlertTriangle,
      };
    }

    return {
      label: 'OPTIMAL COLD-CHAIN',
      colorClass: 'status-success',
      icon: CheckCircle,
    };
  }, [latestTelemetry]);

  const chartData = useMemo(() => {
    return telemetryHistory.map((item) => ({
      time: new Date(item.timestamp).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
      temperature: item.vaccineTemp,
    }));
  }, [telemetryHistory]);

  const handleDeviceSelect = (e) => {
    setSelectedDeviceId(e.target.value);
  };

  const currentSession = activeSessionMap[selectedDeviceId];

  const openNewSession = () => {
    setNewDevice({ deviceId: '', name: '', phone: '' });
    setIsModalOpen(true);
  };

  const handleCreateSession = async (e) => {
    e.preventDefault();
    if (!newDevice.deviceId || !newDevice.name || !newDevice.phone) return;

    try {
      await createSession(newDevice);
      setIsModalOpen(false);
      setSelectedDeviceId(newDevice.deviceId);
      fetchData();
    } catch (err) {
      alert('Failed to start session');
    }
  };

  const formatValue = (val, suffix = '') => {
    if (val === undefined || val === null) return '--';
    return `${val}${suffix}`;
  };

  const StatusIcon = status.icon;

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div>
          <h1 className="brand-title">ColdTrace Control Panel</h1>
          <p className="brand-subtitle">
            Distributed Vaccine Integrity Assurance | Node ID: {selectedDeviceId}
          </p>
        </div>

        <div className="header-actions">
          <div className="device-select-box">
            <Search size={16} className="select-icon" />
            <select
              value={selectedDeviceId}
              onChange={handleDeviceSelect}
              className="device-dropdown"
            >
              <option value={DEFAULT_DEVICE_ID}>
                {DEFAULT_DEVICE_ID} (Default)
              </option>

              {activeDeviceIds
                .filter((id) => id !== DEFAULT_DEVICE_ID)
                .map((id) => (
                  <option key={id} value={id}>
                    {id}
                  </option>
                ))}
            </select>
          </div>

          <button className="primary-button" onClick={openNewSession}>
            <Plus size={16} />
            Start New Session
          </button>

          <div className={`status-pill ${status.colorClass}`}>
            {StatusIcon && <StatusIcon size={16} />}
            <span>{status.label}</span>
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

            <button className="secondary-button" onClick={openNewSession}>
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
                onClick={() => setSelectedDeviceId(session.deviceId)}
              >
                <div className="session-card-top">
                  <div>
                    <div className="session-device">{session.deviceId}</div>
                    <div className="session-name">
                      <User size={15} />
                      {session.name}
                    </div>
                  </div>
                  <span className="active-dot">ACTIVE</span>
                </div>

                <div className="session-contact">
                  <Phone size={14} />
                  <span>{session.phone}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {currentSession && (
        <div className="active-node-banner panel-card">
          <div className="node-banner-item">
            <span className="node-banner-label">CURRENT NODE</span>
            <span className="node-banner-value">{currentSession.deviceId}</span>
          </div>

          <div className="node-banner-item">
            <span className="node-banner-label">HEALTH WORKER</span>
            <span className="node-banner-value">{currentSession.name}</span>
          </div>

          <div className="node-banner-item">
            <span className="node-banner-label">CONTACT</span>
            <span className="node-banner-value">{currentSession.phone}</span>
          </div>
        </div>
      )}

      <div className="metrics-grid">
        {/* Time to Breach Card (Updated Color Condition) */}
        <div className="metric-card panel-card">
          <div className="metric-header">
            <Clock size={18} />
            <span>Time to Breach</span>
          </div>
          <div
            className="metric-value"
            style={{
              color: status.label === 'OPTIMAL COLD-CHAIN' ? '#000000' : '#ef4444',
            }}
          >
            {formatValue(latestTelemetry?.timeToBreach, ' mins')}
          </div>
        </div>

        <div className="metric-card panel-card">
          <div className="metric-header">
            <Thermometer size={18} />
            <span>Vaccine Temp</span>
          </div>
          <div className="metric-value">
            {formatValue(latestTelemetry?.vaccineTemp, ' °C')}
          </div>
        </div>

        <div className="metric-card panel-card">
          <div className="metric-header">
            <Box size={18} />
            <span>Box State</span>
          </div>
          <div className="metric-value">
            {formatValue(latestTelemetry?.boxState)}
          </div>
        </div>

        <div className="metric-card panel-card">
          <div className="metric-header">
            <BatteryCharging size={18} />
            <span>Node Battery</span>
          </div>
          <div className="metric-value">
            {formatValue(latestTelemetry?.nodeBattery, ' %')}
          </div>
        </div>
      </div>

      <div className="grid-two-columns">
        <div className="panel-card">
          <div className="panel-card-header">
            <h2 className="panel-title">
              <Activity size={18} />
              Thermal Decay History
            </h2>
          </div>

          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a324b" />
                <XAxis dataKey="time" stroke="#a0aec0" />
                <YAxis domain={[0, 12]} stroke="#a0aec0" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#161b26',
                    borderColor: '#2a324b',
                    color: '#fff',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="temperature"
                  stroke="#38bdf8"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="panel-card">
          <div className="panel-card-header">
            <h2 className="panel-title">
              <MapPin size={18} />
              Live GNSS Location
            </h2>
          </div>

          <div className="map-wrapper">
            <LeafletMap
              latitude={latestTelemetry?.latitude || 0}
              longitude={latestTelemetry?.longitude || 0}
              deviceName={selectedDeviceId}
            />
          </div>
        </div>
      </div>

      <div className="panel-card table-section">
        <div className="panel-card-header">
          <h2 className="panel-title">
            <RefreshCw size={18} />
            Recent Telemetry Audit Log
          </h2>
        </div>

        <div className="table-wrapper">
          <table className="telemetry-table">
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
              {telemetryHistory
                .slice()
                .reverse()
                .map((row, idx) => (
                  <tr key={row._id || idx}>
                    <td>{row.deviceId || selectedDeviceId}</td>
                    <td>
                      {new Date(row.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td>{row.vaccineTemp} °C</td>
                    <td>{row.boxState}</td>
                    <td>{row.timeToBreach} mins</td>
                    <td>
                      {row.latitude?.toFixed(4)}, {row.longitude?.toFixed(4)}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header">
              <h3>Start New Session</h3>
              <button
                className="icon-button"
                onClick={() => setIsModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSession} className="modal-form">
              <label>
                Device ID
                <input
                  type="text"
                  placeholder="e.g. device002"
                  value={newDevice.deviceId}
                  onChange={(e) =>
                    setNewDevice({ ...newDevice, deviceId: e.target.value })
                  }
                  required
                />
              </label>

              <label>
                Health Worker Name
                <input
                  type="text"
                  placeholder="e.g. Rahul Sharma"
                  value={newDevice.name}
                  onChange={(e) =>
                    setNewDevice({ ...newDevice, name: e.target.value })
                  }
                  required
                />
              </label>

              <label>
                Phone Number
                <input
                  type="text"
                  placeholder="e.g. 9876543210"
                  value={newDevice.phone}
                  onChange={(e) =>
                    setNewDevice({ ...newDevice, phone: e.target.value })
                  }
                  required
                />
              </label>

              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="primary-button">
                  Save Session
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
