import React, { useState, useEffect } from 'react';

/**
 * Sovereign Financial Office (SFO) - Command Pulse
 * Codified roles: SFO, SBC (Sovereign Business Cells), SYI (Sovereign Yield Index)
 * Aligned with Sovereign Earthy Branding: Forest Green (#2E403B), Nakamoto Gold (#D4A017)
 */

const SBC_LIST = ["Conxian-Core", "Nexus-Labs", "DeFi-Desk", "Sovereign-Grants"];

export default function SovereignFinancialOffice() {
  const [selectedSBC, setSelectedSBC] = useState(SBC_LIST[0]);
  const [fiscalData, setFiscalData] = useState({
    liquidReserve: 0,
    yieldHarvested: 0,
    syi: 0, // Sovereign Yield Index (BPS)
    status: "ACTIVE"
  });

  const [globalSymmetry, setGlobalSymmetry] = useState(0);

  useEffect(() => {
    // In production, this would call fiscal-intelligence.get-sbc-status
    simulateFiscalPulse();
  }, [selectedSBC]);

  const simulateFiscalPulse = () => {
    const mockReserve = Math.floor(Math.random() * 1000000);
    const mockYield = Math.floor(Math.random() * 50000);
    const mockSyi = (mockYield / (mockReserve + mockYield)) * 10000;
    
    setFiscalData({
      liquidReserve: mockReserve,
      yieldHarvested: mockYield,
      syi: Math.round(mockSyi),
      status: "ACTIVE"
    });
    setGlobalSymmetry(mockReserve + mockYield * 1.5);
  };

  const harvestYield = () => {
    console.log(`[SFO] Initiating harvest for ${selectedSBC}...`);
    // call fiscal-intelligence.harvest-sovereign-yield
    simulateFiscalPulse();
  };

  const forestGreen = "#2E403B";
  const nakamotoGold = "#D4A017";

  return (
    <div className="sfo-container" style={{ padding: '1.5rem', backgroundColor: '#1a2421', color: '#f1f5f9', borderRadius: '0.75rem', border: `1px solid ${forestGreen}`, boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.5)' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', borderBottom: `1px solid ${forestGreen}`, paddingBottom: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.025em', color: nakamotoGold }}>Sovereign Financial Office</h1>
          <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>Fiscal Orchestration & Symmetry Management</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b' }}>Global symmetry</span>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, fontFamily: 'monospace', color: nakamotoGold }}>{globalSymmetry.toLocaleString()} sBTC</div>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {SBC_LIST.map(name => (
          <button
            key={name}
            onClick={() => setSelectedSBC(name)}
            style={{
              padding: '0.75rem',
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: 500,
              transition: 'all 0.2s',
              backgroundColor: selectedSBC === name ? 'rgba(212, 160, 23, 0.2)' : 'rgba(46, 64, 59, 0.4)',
              border: selectedSBC === name ? `1px solid ${nakamotoGold}` : `1px solid ${forestGreen}`,
              color: selectedSBC === name ? '#fff' : '#94a3b8',
              cursor: 'pointer'
            }}
          >
            {name}
          </button>
        ))}
      </div>

      <div style={{ backgroundColor: 'rgba(46, 64, 59, 0.2)', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid rgba(46, 64, 59, 0.5)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#e2e8f0' }}>Cell Intel: {selectedSBC}</h2>
          <span style={{ padding: '0.25rem 0.5rem', backgroundColor: 'rgba(212, 160, 23, 0.1)', color: nakamotoGold, fontSize: '0.75rem', borderRadius: '0.25rem', border: `1px solid ${nakamotoGold}` }}>
            {fiscalData.status}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
          <div>
            <label style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>Liquid Reserve</label>
            <div style={{ fontSize: '1.5rem', fontFamily: 'monospace' }}>{fiscalData.liquidReserve.toLocaleString()} STX</div>
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>Yield Harvested</label>
            <div style={{ fontSize: '1.5rem', fontFamily: 'monospace', color: nakamotoGold }}>+{fiscalData.yieldHarvested.toLocaleString()} STX</div>
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>Yield Index (SYI)</label>
            <div style={{ fontSize: '1.5rem', fontFamily: 'monospace', color: nakamotoGold }}>{fiscalData.syi} BPS</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <button
            onClick={harvestYield}
            style={{ flex: 1, padding: '0.75rem', backgroundColor: forestGreen, color: 'white', border: `1px solid ${nakamotoGold}`, borderRadius: '0.5rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}
          >
            Harvest Sovereign Yield
          </button>
          <button style={{ flex: 1, padding: '0.75rem', backgroundColor: 'transparent', color: 'white', border: `1px solid ${forestGreen}`, borderRadius: '0.5rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}>
            Deploy Symmetry
          </button>
        </div>
      </div>

      <footer style={{ marginTop: '2rem', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.25rem 0.75rem', backgroundColor: '#1e2927', borderRadius: '9999px', fontSize: '0.625rem', color: '#64748b' }}>
          <span style={{ width: '0.5rem', height: '0.5rem', backgroundColor: nakamotoGold, borderRadius: '50%' }}></span>
          Nakamoto Heartbeat Active • Fiscal Orchestrator v4.2.4
        </div>
      </footer>
    </div>
  );
}
