"use client";

import React, { useState, useEffect } from 'react';
import SovereignFinancialOffice from '../pulse-bos-stub';
import Fdc3Console from './Fdc3Console';

export default function MultidimensionalDashboard() {
  const [data, setData] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/multidimensional/metrics");
      if (!res.ok) throw new Error(`Failed to fetch metrics: ${res.status}`);
      const d = await res.json();
      setData(d);
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading && !data) return <div style={{ padding: '2rem', color: '#2E403B', textAlign: 'center' }}>Loading Multidimensional Pulse...</div>;

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto', fontFamily: 'Inter, system-ui, sans-serif', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      <header style={{ marginBottom: '3rem', borderLeft: '4px solid #D4A017', paddingLeft: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ color: '#0f172a', margin: 0, fontSize: '2.25rem', fontWeight: 800 }}>Multidimensional Platform Operations</h1>
          <p style={{ color: '#64748b', marginTop: '0.5rem', fontSize: '1.1rem' }}>Bitcoin Standard Business Intelligence & Agentic Orchestration (Phase 7)</p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          style={{
            padding: '0.6rem 1.2rem',
            backgroundColor: loading ? '#ccc' : '#2E403B',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontWeight: 'bold',
            cursor: loading ? 'default' : 'pointer',
            transition: 'all 0.2s'
          }}
        >
          {loading ? "Refreshing..." : "Trigger Pulse"}
        </button>
      </header>

      {error && (
        <div style={{ padding: '1rem', backgroundColor: '#fef2f2', border: '1px solid #fee2e2', color: '#991b1b', borderRadius: '8px', marginBottom: '2rem' }}>
          Error: {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem', marginBottom: '3rem' }}>

        {/* Treasury Section */}
        <section style={{ backgroundColor: '#fff', padding: '2rem', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ color: '#D4A017', margin: 0, fontSize: '1.25rem' }}>BTC Standard Treasury</h2>
            <span style={{ fontSize: '0.75rem', padding: '0.25rem 0.75rem', backgroundColor: '#fef3c7', color: '#92400e', borderRadius: '9999px', fontWeight: 600 }}>OPTIMIZED</span>
          </div>
          <div style={{ display: 'grid', gap: '1rem' }}>
             <div style={{ padding: '1rem', backgroundColor: '#f1f5f9', borderRadius: '12px' }}>
                <div style={{ fontSize: '0.875rem', color: '#64748b' }}>sBTC Reserve</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>{data?.treasury?.sbtc?.balance} BTC</div>
                <div style={{ color: '#10b981', fontSize: '0.875rem', fontWeight: 600 }}>+${data?.treasury?.sbtc?.pnl_usd?.toLocaleString()} PnL</div>
             </div>
             <div style={{ padding: '1rem', backgroundColor: '#f1f5f9', borderRadius: '12px' }}>
                <div style={{ fontSize: '0.875rem', color: '#64748b' }}>STX Reserve</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>{data?.treasury?.stx?.balance?.toLocaleString()} STX</div>
                <div style={{ color: '#10b981', fontSize: '0.875rem', fontWeight: 600 }}>+${data?.treasury?.stx?.pnl_usd?.toLocaleString()} PnL</div>
             </div>
          </div>
        </section>

        {/* AI Agents Section */}
        <section style={{ backgroundColor: '#fff', padding: '2rem', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', border: '1px solid #e2e8f0' }}>
          <h2 style={{ color: '#2E403B', marginBottom: '1.5rem', fontSize: '1.25rem' }}>Agentic Resource Allocation</h2>
          <div style={{ display: 'grid', gap: '1.25rem' }}>
            {data?.agents?.map((agent: Record<string, unknown>) => (
              <div key={agent?.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                  <span style={{ fontWeight: 600, color: '#334155' }}>{agent?.id}</span>
                  <span style={{ color: '#64748b' }}>{(agent?.weight * 100).toFixed(0)}% Weight</span>
                </div>
                <div style={{ width: '100%', height: '10px', backgroundColor: '#f1f5f9', borderRadius: '5px', overflow: 'hidden' }}>
                  <div style={{ width: `${(agent?.consumed_usd / agent?.budget_usd) * 100}%`, height: '100%', backgroundColor: '#2E403B', transition: 'width 1s ease-in-out' }}></div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem', fontSize: '0.75rem', color: '#94a3b8' }}>
                  <span>Used: ${agent?.consumed_usd?.toLocaleString()}</span>
                  <span>Budget: ${agent?.budget_usd?.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* L2 Settlements Section */}
        <section style={{ backgroundColor: '#fff', padding: '2rem', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', border: '1px solid #e2e8f0' }}>
          <h2 style={{ color: '#D4A017', marginBottom: '1.5rem', fontSize: '1.25rem' }}>Network Settlements (L2/L3)</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={{ padding: '1rem', border: '1px solid #f1f5f9', borderRadius: '12px' }}>
              <div style={{ fontWeight: 700, color: '#0f172a' }}>Lightning</div>
              <div style={{ fontSize: '1.25rem', margin: '0.5rem 0' }}>{data?.settlements?.lightning?.count} <span style={{ fontSize: '0.875rem', color: '#64748b' }}>txs</span></div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{data?.settlements?.lightning?.volume_sats?.toLocaleString()} sats vol</div>
            </div>
            <div style={{ padding: '1rem', border: '1px solid #f1f5f9', borderRadius: '12px' }}>
              <div style={{ fontWeight: 700, color: '#0f172a' }}>RGB Protocol</div>
              <div style={{ fontSize: '1.25rem', margin: '0.5rem 0' }}>{data?.settlements?.rgb?.count} <span style={{ fontSize: '0.875rem', color: '#64748b' }}>txs</span></div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{data?.settlements?.rgb?.volume_sats?.toLocaleString()} sats vol</div>
            </div>
          </div>
        </section>

        {/* UBI Section */}
        <section style={{ backgroundColor: '#fff', padding: '2rem', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', border: '1px solid #e2e8f0' }}>
          <h2 style={{ color: '#2E403B', marginBottom: '1.5rem', fontSize: '1.25rem' }}>Sovereign UBI Distribution</h2>
          <div style={{ padding: '1.25rem', backgroundColor: '#f0fdf4', borderRadius: '12px', border: '1px solid #dcfce7' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <span style={{ color: '#166534', fontWeight: 600 }}>Active Identities</span>
              <span style={{ color: '#166534', fontSize: '1.25rem', fontWeight: 700 }}>{data?.ubi?.total_active}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#166534', fontSize: '0.875rem' }}>Next Window</span>
              <span style={{ color: '#166534', fontSize: '0.875rem', fontWeight: 600 }}>{new Date(data?.ubi?.next_cycle).toLocaleDateString()}</span>
            </div>
            <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #dcfce7', textAlign: 'center' }}>
               <div style={{ fontSize: '0.75rem', color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Compliance Rating</div>
               <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#166534' }}>{data?.ubi?.compliance_rating}</div>
            </div>
          </div>
        </section>

      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '4rem' }}>
        <Fdc3Console />
        <SovereignFinancialOffice />
      </div>

      <footer style={{ marginTop: '4rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.875rem' }}>
        Conxian Business Operations System • Multi-dimensional Pulse • {new Date().getFullYear()}
      </footer>
    </div>
  );
}
