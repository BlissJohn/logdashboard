import React, { useState, useEffect } from "react";
import "./App.css";
import { io } from "socket.io-client";

const socket = io("http://localhost:3000");

function App() {
  const [logs, setLogs] = useState([]);
  const [filters, setFilters] = useState({
    level: "",
    message: "",
    resourceId: ""
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadLogs = async () => {
      setLoading(true);
      const res = await fetch("http://localhost:3000/logs");
      const data = await res.json();
      setLogs(data);
      setLoading(false);
    };

    loadLogs();

    socket.on("newLog", (log) => {
      setLogs((prevLogs) => [log, ...prevLogs]);
    });

    return () => socket.off("newLog");
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    let query = new URLSearchParams(filters).toString();
    const res = await fetch(`http://localhost:3000/logs?${query}`);
    const data = await res.json();
    setLogs(data);
    setLoading(false);
  };

  return (
    <div className="container">
      <h1>🚀 Log Dashboard</h1>

      <div className="filters">
        <select onChange={(e) => setFilters({ ...filters, level: e.target.value })}>
          <option value="">All Levels</option>
          <option value="error">Error</option>
          <option value="info">Info</option>
          <option value="warning">Warning</option>
        </select>

        <input
          placeholder="Search message"
          onChange={(e) =>
            setFilters({ ...filters, message: e.target.value })
          }
        />

        <input
          placeholder="Resource ID"
          onChange={(e) =>
            setFilters({ ...filters, resourceId: e.target.value })
          }
        />

        <button onClick={fetchLogs}>Search</button>
      </div>

      {loading && <p>Loading...</p>}

      <table>
        <thead>
          <tr>
            <th>Level</th>
            <th>Message</th>
            <th>Resource</th>
            <th>Timestamp</th>
          </tr>
        </thead>
        <tbody>
          {logs.length === 0 ? (
            <tr>
              <td colSpan="4" className="empty">
                No logs found
              </td>
            </tr>
          ) : (
            logs.map((log, index) => (
              <tr key={index}>
                <td className={`level ${log.level}`}>{log.level}</td>
                <td>{log.message}</td>
                <td>{log.resourceId}</td>
                <td>{new Date(log.timestamp).toLocaleString()}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default App;