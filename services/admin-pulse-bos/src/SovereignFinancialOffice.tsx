import React, { useState, useEffect } from 'react';

/**
 * Sovereign Financial Office (SPO) - Command Pulse
 * Codified roles: SFO, SBC (Sovereign Business Cells), SYI (Sovereign Yield Index)
 * Aligned with Chappies 4.0+: Autonomous, DeFi-Exploiting, Multi-Dimensional
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

  return (
    <div className="sfo-container p-6 bg-slate-900 text-slate-100 rounded-xl border border-slate-700 shadow-2xl">
      <header className="flex justify-between items-center mb-8 border-b border-slate-700 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-cyan-400">Sovereign Financial Office</h1>
          <p className="text-slate-400 text-sm">Fiscal Orchestration & Symmetry Management</p>
        </div>
        <div className="text-right">
          <span className="text-xs uppercase tracking-widest text-slate-500">Global symmetry</span>
          <div className="text-xl font-mono text-emerald-400">{globalSymmetry.toLocaleString()} sBTC</div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {SBC_LIST.map(name => (
          <button
            key={name}
            onClick={() => setSelectedSBC(name)}
            className={`p-3 rounded-lg text-sm font-medium transition-all ${
              selectedSBC === name 
              ? 'bg-cyan-900/40 border border-cyan-500 text-cyan-100' 
              : 'bg-slate-800/40 border border-slate-700 text-slate-400 hover:border-slate-500'
            }`}
          >
            {name}
          </button>
        ))}
      </div>

      <div className="bg-slate-800/30 p-6 rounded-xl border border-slate-700/50">
        <div className="flex justify-between items-start mb-6">
          <h2 className="text-lg font-semibold text-slate-200">Cell Intel: {selectedSBC}</h2>
          <span className="px-2 py-1 bg-emerald-900/30 text-emerald-400 text-xs rounded border border-emerald-500/30">
            {fiscalData.status}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="stat-card">
            <label className="text-xs text-slate-500 uppercase">Liquid Reserve</label>
            <div className="text-2xl font-mono">{fiscalData.liquidReserve.toLocaleString()} STX</div>
          </div>
          <div className="stat-card">
            <label className="text-xs text-slate-500 uppercase">Yield Harvested</label>
            <div className="text-2xl font-mono text-emerald-400">+{fiscalData.yieldHarvested.toLocaleString()} STX</div>
          </div>
          <div className="stat-card">
            <label className="text-xs text-slate-500 uppercase">Yield Index (SYI)</label>
            <div className="text-2xl font-mono text-cyan-400">{fiscalData.syi} BPS</div>
          </div>
        </div>

        <div className="flex gap-4">
          <button 
            onClick={harvestYield}
            className="flex-1 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-bold transition-all shadow-lg shadow-cyan-900/20"
          >
            Harvest Sovereign Yield
          </button>
          <button className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-bold transition-all">
            Deploy Symmetry
          </button>
        </div>
      </div>

      <footer className="mt-8 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-800 rounded-full text-[10px] text-slate-500">
          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
          Nakamoto Heartbeat Active • Fiscal Orchestrator v4.2.0
        </div>
      </footer>
    </div>
  );
}
