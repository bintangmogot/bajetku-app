'use client';
import { useState, useEffect } from 'react';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [setupLoading, setSetupLoading] = useState(false);
  
  const [filterType, setFilterType] = useState('month'); // 'all', 'month', 'date'
  const [filterValue, setFilterValue] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  useEffect(() => {
    fetchSummary();
  }, [filterType, filterValue]);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      const period = filterType === 'all' ? 'all' : filterValue;
      const res = await fetch(`/api/summary?period=${period}`);
      if (!res.ok) throw new Error('Failed to fetch summary');
      const json = await res.json();
      
      if (json.error) setError(json.error);
      else setData(json.summary);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSetup = async () => {
    setSetupLoading(true);
    try {
      const res = await fetch('/api/setup', { method: 'POST' });
      const json = await res.json();
      if (json.error) alert('Error: ' + json.error);
      else {
        alert('Spreadsheet successfully styled and formatted!');
        fetchSummary();
      }
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setSetupLoading(false);
    }
  };

  if (loading) return <div className="loading-container"><div className="spinner"></div></div>;
  
  if (error) return (
    <div>
      <h1 style={{marginBottom: '1rem'}}>Dashboard</h1>
      <div className="card">
        <h3 style={{color: 'var(--danger-color)'}}>Connection Error</h3>
        <p style={{marginTop: '0.5rem', marginBottom: '1.5rem'}}>{error}</p>
        <p style={{fontSize: '0.875rem', color: 'var(--text-secondary)'}}>Ensure SPREADSHEET_ID and credentials are set in .env.local</p>
      </div>
    </div>
  );

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
  };

  return (
    <div>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem'}}>
        <h1>Overview</h1>
        <button className="btn secondary" style={{width: 'auto', padding: '0.5rem 1rem', fontSize: '0.875rem'}} onClick={handleSetup} disabled={setupLoading}>
          {setupLoading ? 'Setting up...' : 'Setup Sheet'}
        </button>
      </div>

      <div style={{display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap'}}>
        <select 
          value={filterType} 
          onChange={(e) => {
            setFilterType(e.target.value);
            const now = new Date();
            if (e.target.value === 'month') setFilterValue(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
            if (e.target.value === 'date') setFilterValue(now.toISOString().split('T')[0]);
          }}
          style={{padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--surface-color)', color: 'var(--text-primary)'}}
        >
          <option value="month">Monthly</option>
          <option value="date">Daily</option>
          <option value="all">All Time</option>
        </select>
        
        {filterType !== 'all' && (
          <input 
            type={filterType} 
            value={filterValue} 
            onChange={(e) => setFilterValue(e.target.value)}
            style={{padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--surface-color)', color: 'var(--text-primary)'}}
          />
        )}
      </div>

      <div className="dashboard-grid">
        <div className="card" style={{gridColumn: '1 / -1'}}>
          <h3>Net Balance</h3>
          <div className={`value ${data?.netBalance >= 0 ? 'income' : 'expense'}`}>
            {formatCurrency(data?.netBalance || 0)}
          </div>
        </div>
        <div className="card">
          <h3>Income</h3>
          <div className="value income" style={{fontSize: '1.5rem'}}>{formatCurrency(data?.totalIncome || 0)}</div>
        </div>
        <div className="card">
          <h3>Expense</h3>
          <div className="value expense" style={{fontSize: '1.5rem'}}>{formatCurrency(data?.totalExpense || 0)}</div>
        </div>
      </div>

      <div className="card">
        <h3 style={{marginBottom: '1rem'}}>Spending by Category</h3>
        <div>
          {data?.categoryBreakdown && Object.keys(data.categoryBreakdown).length > 0 ? (
            Object.entries(data.categoryBreakdown).map(([category, amount]) => (
              <div key={category} className="list-item" style={{display: 'block'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem'}}>
                  <div className="left">
                    <strong>{category}</strong>
                    <span>{data?.budgetLimit?.[category] ? `Limit: ${formatCurrency(data.budgetLimit[category])}` : 'No limit set'}</span>
                  </div>
                  <div className="right expense">
                    {formatCurrency(amount)}
                  </div>
                </div>
                {data?.budgetLimit?.[category] > 0 && (
                  <div style={{width: '100%', height: '8px', background: 'var(--border-color)', borderRadius: '4px', overflow: 'hidden'}}>
                    <div style={{
                      height: '100%', 
                      width: `${Math.min(100, (amount / data.budgetLimit[category]) * 100)}%`,
                      background: (amount / data.budgetLimit[category]) > 0.9 ? 'var(--danger-color)' : 'var(--primary-color)',
                      transition: 'width 0.3s ease'
                    }}></div>
                  </div>
                )}
              </div>
            ))
          ) : (
             <p style={{color: 'var(--text-secondary)', fontSize: '0.875rem'}}>No expenses recorded yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
