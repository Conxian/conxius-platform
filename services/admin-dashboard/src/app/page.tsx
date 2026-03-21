"use client";
import React, { useEffect, useState } from "react";

export default function AdminPage() {
  const [stats, setStats] = useState<any>(null);
  const [nexus, setNexus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchAll = async () => {
    setLoading(true);
    try {
      // Try dedicated port 3000 (Nexus default) first, fallback to 8080 (Gateway)
      const urls = [
        process.env.NEXT_PUBLIC_CORE_API_URL,
        "http://localhost:3000",
        "http://localhost:8080"
      ].filter(Boolean) as string[];

      let success = false;
      for (const baseUrl of urls) {
        try {
          const [sRes, nRes] = await Promise.all([
            fetch(`${baseUrl}/api/v1/status`).catch(() => fetch(`${baseUrl}/v1/status`)),
            fetch(`${baseUrl}/api/v1/nexus`).catch(() => fetch(`${baseUrl}/v1/metrics`))
          ]);
          
          if (sRes.ok) {
            const sData = await sRes.json();
            const nData = nRes.ok ? await nRes.json() : null;
            
            setStats({
              status: sData.safety_mode ? "Degraded" : "Healthy",
              version: sData.version || "v1.1.0",
              total_requests: sData.processed_height || 0,
              uptime_seconds: sData.uptime_seconds || 0
            });
            
            setNexus({
              merkle_root: sData.state_root || sData.mmr_root || "N/A",
              sync_status: sData.drift === 0 ? "synced" : "syncing",
              leaf_count: sData.processed_height || 0
            });
            
            success = true;
            break;
          }
        } catch (e) {
          continue;
        }
      }
      
      if (!success) {
        console.warn("Infrastructure Pulse: Could not connect to Nexus or Gateway. Ensure services are running on port 3000 or 8080.");
      }
    } catch (err) {
      console.error("Dashboard fetch error:", err);
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ margin: 0, color: '#2E403B' }}>Infrastructure Pulse</h2>
          <p style={{ margin: '0.5rem 0 0 0', color: '#666', fontSize: '0.9rem' }}>Real-time telemetry from the Unified Gateway Engine.</p>
        </div>
        <button
          onClick={fetchAll}
          disabled={loading}
          style={{
            padding: '0.6rem 1.2rem',
            cursor: 'pointer',
            backgroundColor: loading ? '#ccc' : '#2E403B',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontWeight: 'bold',
            transition: 'background-color 0.2s'
          }}
        >
          {loading ? "Refreshing..." : "Trigger Pulse"}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem' }}>
        <StatCard title="Gateway Health" value={stats?.status || "Unknown"} color="#2E403B" />
        <StatCard title="Engine Version" value={stats?.version || "N/A"} />
        <StatCard title="Requests Handled" value={stats?.total_requests || 0} />
        <StatCard title="Uptime" value={stats?.uptime_seconds ? `${Math.floor(stats.uptime_seconds / 60)}m ${stats.uptime_seconds % 60}s` : "0s"} />
      </div>

      <div style={{ marginTop: '3rem', display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '2rem' }}>
        <section>
          <h3 style={{ borderBottom: '2px solid #D4A017', paddingBottom: '0.5rem', color: '#2E403B' }}>Nexus "Glass Node" State</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem', marginTop: '1rem' }}>
            <div style={{ gridColumn: 'span 2' }}>
              <DataRow label="Merkle Root" value={nexus?.merkle_root || "Initializing..."} mono />
            </div>
            <DataRow label="Sync Status" value={nexus?.sync_status || "Pending"} highlight={nexus?.sync_status === 'synced'} />
            <DataRow label="Leaf Count" value={nexus?.leaf_count || 0} />
          </div>
        </section>

        <section>
          <h3 style={{ borderBottom: '2px solid #D4A017', paddingBottom: '0.5rem', color: '#2E403B' }}>Sovereign Services</h3>
          <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', marginTop: '1rem' }}>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              <ServiceItem name="Stacks (L2)" status="Operational" />
              <ServiceItem name="Bisq (P2P)" status="Operational" />
              <ServiceItem name="RGB (Client-side)" status="Operational" />
              <ServiceItem name="BitVM (Optimistic)" status="Operational" />
              <ServiceItem name="Lightning Network" status="Operational" />
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}

function StatCard({ title, value, color }: { title: string, value: string | number, color?: string }) {
  return (
    <div style={{
      padding: '1.5rem',
      backgroundColor: 'white',
      borderRadius: '8px',
      boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
      borderLeft: color ? `4px solid ${color}` : 'none'
    }}>
      <h4 style={{ margin: '0 0 0.5rem 0', color: '#666', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</h4>
      <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: color || '#333' }}>{value}</div>
    </div>
  );
}

function DataRow({ label, value, mono, highlight }: { label: string, value: string | number, mono?: boolean, highlight?: boolean }) {
  return (
    <div style={{ padding: '1rem', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.03)' }}>
      <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '0.25rem' }}>{label}</div>
      <div style={{
        fontSize: mono ? '0.85rem' : '1.1rem',
        fontWeight: 'bold',
        fontFamily: mono ? 'monospace' : 'inherit',
        color: highlight ? '#2E403B' : '#333',
        wordBreak: 'break-all'
      }}>
        {value}
      </div>
    </div>
  );
}

function ServiceItem({ name, status }: { name: string, status: string }) {
  return (
    <li style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: '1px solid #F0F0F0' }}>
      <span style={{ fontWeight: 500 }}>{name}</span>
      <span style={{ color: '#2E403B', fontWeight: 'bold', fontSize: '0.9rem' }}>{status}</span>
    </li>
  );
}
