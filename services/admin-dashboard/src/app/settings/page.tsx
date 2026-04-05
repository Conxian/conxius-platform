"use client";
import React, { useState, useEffect } from "react";

function SecretInput({
  label,
  name,
  value,
  onChange,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
      <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#444' }}>{label}</label>
      <input 
        type="password"
        name={name}
        value={value}
        onChange={onChange}
        style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
        autoComplete="off"
      />
    </div>
  );
}

export default function SettingsPage() {
  const [secrets, setSecrets] = useState({
    ADMIN_PAT_TOKEN: "",
    ADMIN_NPM_TOKEN: "",
    ADMIN_PYPI_API_TOKEN: "",
    ADMIN_GCP_SA_KEY_JSON: "",
    ADMIN_CHANGELLY_API_KEY: "",
    ADMIN_CHANGELLY_API_SECRET: ""
  });
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setSecrets({ ...secrets, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/secrets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secrets })
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <h2 style={{ color: '#2E403B', marginBottom: '1.5rem' }}>Platform Admin Settings</h2>
      <div style={{ backgroundColor: "#fef2f2", border: "1px solid #fee2e2", padding: "1rem", borderRadius: "8px", marginBottom: "2rem", color: "#b91c1c", fontSize: "0.9rem" }}>
        <p style={{ margin: 0, fontWeight: "bold" }}>HIGH PRIVILEGE AREA</p>
        <p style={{ margin: "0.25rem 0 0 0" }}>Managing these secrets affects automated deployments and exchange integrations. Ensure you are authorized to make these changes.</p>
      </div>
      
      <section style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', marginBottom: '2rem' }}>
        <h3 style={{ marginTop: 0, color: '#D4A017', fontSize: '1.2rem', borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>Institutional Secrets</h3>
        <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '1.5rem' }}>These secrets are required for automated deployments (NPM, PyPI, GCP) and exchange integrations.</p>
        
        <div style={{ display: 'grid', gap: '1rem' }}>
          <SecretInput label="GitHub PAT Token" name="ADMIN_PAT_TOKEN" value={secrets.ADMIN_PAT_TOKEN} onChange={handleChange} />
          <SecretInput label="NPM Token" name="ADMIN_NPM_TOKEN" value={secrets.ADMIN_NPM_TOKEN} onChange={handleChange} />
          <SecretInput label="PyPI API Token" name="ADMIN_PYPI_API_TOKEN" value={secrets.ADMIN_PYPI_API_TOKEN} onChange={handleChange} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#444' }}>GCP Service Account Key (JSON)</label>
            <textarea 
              name="ADMIN_GCP_SA_KEY_JSON" 
              value={secrets.ADMIN_GCP_SA_KEY_JSON} 
              onChange={handleChange}
              rows={4}
              style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc', fontFamily: 'monospace', fontSize: '0.8rem' }}
              placeholder='{ "type": "service_account", "project_id": "..." }'
            />
          </div>
          <SecretInput label="Changelly API Key" name="ADMIN_CHANGELLY_API_KEY" value={secrets.ADMIN_CHANGELLY_API_KEY} onChange={handleChange} />
          <SecretInput label="Changelly API Secret" name="ADMIN_CHANGELLY_API_SECRET" value={secrets.ADMIN_CHANGELLY_API_SECRET} onChange={handleChange} />
        </div>
      </section>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', alignItems: 'center' }}>
        {saved && <span style={{ color: '#2E403B', fontWeight: 'bold' }}>✓ Settings Saved Successfully</span>}
        <button 
          onClick={handleSave}
          disabled={loading}
          style={{
            padding: '0.8rem 2rem',
            backgroundColor: loading ? '#ccc' : '#2E403B',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontWeight: 'bold',
            cursor: loading ? 'default' : 'pointer',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}
        >
          {loading ? "Saving..." : "Save Configuration"}
        </button>
      </div>
    </div>
  );
}
