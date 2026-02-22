"use client";
import React, { useEffect, useState } from "react";

export default function AdminPage() {
  const [stats, setStats] = useState<any>(null);
  const [nexus, setNexus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_CORE_API_URL || "http://localhost:8080";
      const [sRes, nRes] = await Promise.all([
        fetch(`${baseUrl}/api/v1/status`),
        fetch(`${baseUrl}/api/v1/nexus`)
      ]);
      setStats(await sRes.json());
      setNexus(await nRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>System Overview</h2>
        <button onClick={fetchAll} disabled={loading} style={{ padding: '0.5rem 1rem', cursor: 'pointer' }}>
          {loading ? "Refreshing..." : "Refresh Now"}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
        <Card title="Gateway Status" value={stats?.status || "Unknown"} />
        <Card title="Gateway Version" value={stats?.version || "N/A"} />
        <Card title="Total Requests" value={stats?.total_requests || 0} />
        <Card title="Uptime (sec)" value={stats?.uptime_seconds || 0} />
      </div>

      <h2 style={{ marginTop: '2rem' }}>Nexus "Glass Node" State</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
        <Card title="Merkle Root" value={nexus?.merkle_root ? `${nexus.merkle_root.substring(0, 16)}...` : "Not Available"} />
        <Card title="Sync Status" value={nexus?.sync_status || "Initializing..."} />
        <Card title="Leaf Count" value={nexus?.leaf_count || 0} />
      </div>

      <h2 style={{ marginTop: '2rem' }}>Sovereign Services</h2>
      <div style={{ backgroundColor: 'white', padding: '1rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          <ServiceItem name="Stacks (L2)" status="Operational" />
          <ServiceItem name="Bisq (P2P)" status="Operational" />
          <ServiceItem name="RGB (Client-side)" status="Operational" />
          <ServiceItem name="BitVM (Optimistic)" status="Operational" />
          <ServiceItem name="Lightning Network" status="Operational" />
          <ServiceItem name="Liquid Network" status="Operational" />
        </ul>
      </div>
    </div>
  );
}

function Card({ title, value }: { title: string, value: string | number }) {
  return (
    <div style={{ padding: '1rem', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
      <h4 style={{ margin: '0 0 0.5rem 0', color: '#666' }}>{title}</h4>
      <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#333' }}>{value}</div>
    </div>
  );
}

function ServiceItem({ name, status }: { name: string, status: string }) {
  return (
    <li style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #eee' }}>
      <span>{name}</span>
      <span style={{ color: 'green', fontWeight: 'bold' }}>{status}</span>
    </li>
  );
}
