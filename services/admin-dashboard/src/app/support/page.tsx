"use client";
import React, { useState } from "react";

export default function SupportPage() {
  const [adminApiKey, setAdminApiKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const handleSync = async () => {
    if (!adminApiKey) {
      alert("Please provide the Admin Dashboard API Key.");
      return;
    }

    setLoading(true);
    setStatus("Syncing...");
    try {
      const res = await fetch("/api/support/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-API-Key": adminApiKey
        }
      });
      if (res.ok) {
        setStatus("Sync completed successfully.");
      } else {
        const err = await res.json();
        setStatus(`Sync failed: ${err.error}`);
      }
    } catch (err: unknown) {
      setStatus(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <h2 style={{ color: '#2E403B', marginBottom: '1.5rem' }}>Support Mailbox Management</h2>

      <section style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', marginBottom: '2rem' }}>
        <h3 style={{ marginTop: 0, color: '#D4A017', fontSize: '1.2rem', borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>Manual Intake Trigger</h3>
        <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '1.5rem' }}>Manually trigger the IMAP polling worker to process unread support emails and create Linear issues.</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '400px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#444' }}>Admin API Key</label>
            <input
              type="password"
              value={adminApiKey}
              onChange={(e) => setAdminApiKey(e.target.value)}
              style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
              autoComplete="off"
            />
          </div>

          <button
            onClick={handleSync}
            disabled={loading}
            style={{
              padding: '0.8rem 2rem',
              backgroundColor: loading ? '#ccc' : '#2E403B',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontWeight: 'bold',
              cursor: loading ? 'default' : 'pointer'
            }}
          >
            {loading ? "Processing..." : "Trigger Sync"}
          </button>
        </div>

        {status && (
          <div style={{
            marginTop: '1.5rem',
            padding: '1rem',
            borderRadius: '4px',
            backgroundColor: status.includes('failed') || status.includes('Error') ? '#fef2f2' : '#f0fdf4',
            color: status.includes('failed') || status.includes('Error') ? '#991b1b' : '#166534',
            fontSize: '0.9rem',
            border: `1px solid ${status.includes('failed') || status.includes('Error') ? '#fee2e2' : '#dcfce7'}`
          }}>
            {status}
          </div>
        )}
      </section>

      <section style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
        <h3 style={{ marginTop: 0, color: '#D4A017', fontSize: '1.2rem', borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>Channel Configuration</h3>
        <table style={{ width: '100%', marginTop: '1rem', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', fontSize: '0.8rem', color: '#888', borderBottom: '1px solid #eee' }}>
              <th style={{ padding: '0.5rem 0' }}>Source Recipient</th>
              <th style={{ padding: '0.5rem 0' }}>Linear Channel</th>
              <th style={{ padding: '0.5rem 0' }}>Default Action</th>
            </tr>
          </thead>
          <tbody style={{ fontSize: '0.9rem' }}>
            <tr>
              <td style={{ padding: '0.75rem 0' }}>support@conxian-labs.com</td>
              <td style={{ padding: '0.75rem 0' }}>Support-Public</td>
              <td style={{ padding: '0.75rem 0' }}>Private Triage</td>
            </tr>
            <tr>
              <td style={{ padding: '0.75rem 0' }}>info@ / admin@</td>
              <td style={{ padding: '0.75rem 0' }}>Support-Internal</td>
              <td style={{ padding: '0.75rem 0' }}>Private Triage</td>
            </tr>
            <tr>
              <td style={{ padding: '0.75rem 0' }}>community@ / builders@</td>
              <td style={{ padding: '0.75rem 0' }}>Support-Community</td>
              <td style={{ padding: '0.75rem 0' }}>Publish Candidate</td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  );
}
