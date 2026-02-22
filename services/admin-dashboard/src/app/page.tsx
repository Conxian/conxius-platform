"use client";
import React, { useEffect, useState } from "react";

export default function AdminPage() {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    fetch("http://localhost:8080/api/v1/status")
      .then(res => res.json())
      .then(setStats)
      .catch(console.error);
  }, []);

  return (
    <div>
      <h2>System Overview</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
        <div style={{ padding: '1rem', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h3>Status</h3>
          <p>{stats?.status || "Unknown"}</p>
        </div>
        <div style={{ padding: '1rem', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h3>Version</h3>
          <p>{stats?.version || "N/A"}</p>
        </div>
        <div style={{ padding: '1rem', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h3>Requests</h3>
          <p>{stats?.total_requests || 0}</p>
        </div>
      </div>

      <h2 style={{ marginTop: '2rem' }}>Sovereign Services</h2>
      <ul>
        <li>Stacks (L2) - Active</li>
        <li>Bisq (P2P) - Active</li>
        <li>RGB (Client-side) - Active</li>
        <li>BitVM (Optimistic) - Active</li>
      </ul>
    </div>
  );
}
