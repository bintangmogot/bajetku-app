'use client';
import { useState, useEffect } from 'react';

export default function Savings() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/transactions');
      const json = await res.json();
      if (json.data) setTransactions(json.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);

  const savings = transactions.filter(t => t.type === 'Saving');
  const investments = transactions.filter(t => t.type === 'Investment');
  const loans = transactions.filter(t => t.type === 'Loan');
  const debts = transactions.filter(t => t.type === 'Debt');

  const totalSaving = savings.reduce((s, t) => s + t.amount, 0);
  const totalInvestment = investments.reduce((s, t) => s + t.amount, 0);
  const totalLoan = loans.reduce((s, t) => s + t.amount, 0);
  const totalDebt = debts.reduce((s, t) => s + t.amount, 0);
  const totalAssets = totalSaving + totalInvestment;

  // Emergency Fund tracker
  const emergencyTarget = 27000000;
  const emergencyProgress = Math.min(100, (totalSaving / emergencyTarget) * 100);

  // Group by category
  const groupByCategory = (items) => {
    const groups = {};
    items.forEach(t => {
      if (!groups[t.category]) groups[t.category] = 0;
      groups[t.category] += t.amount;
    });
    return Object.entries(groups).sort((a, b) => b[1] - a[1]);
  };

  if (loading) return <div className="loading-container"><div className="spinner"></div></div>;

  const sections = [
    {
      title: '🏦 Savings',
      total: totalSaving,
      color: '#2ecc71',
      items: groupByCategory(savings),
      showTarget: true,
    },
    {
      title: '📈 Investments',
      total: totalInvestment,
      color: '#3498db',
      items: groupByCategory(investments),
    },
    {
      title: '🤝 Loans Given',
      total: totalLoan,
      color: '#e6a817',
      items: groupByCategory(loans),
    },
    {
      title: '📋 Debts Owed',
      total: totalDebt,
      color: '#9b59b6',
      items: groupByCategory(debts),
    },
  ];

  return (
    <div>
      <h1 style={{marginBottom: '1.5rem'}}>Assets & Liabilities</h1>

      {/* Total Assets card */}
      <div className="card" style={{marginBottom: '0.5rem', textAlign: 'center'}}>
        <h3 style={{color: 'var(--text-secondary)', marginBottom: '0.25rem'}}>Total Assets</h3>
        <div style={{fontSize: '2rem', fontWeight: '700', color: '#2ecc71'}}>{formatCurrency(totalAssets)}</div>
        <p style={{fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem'}}>Savings + Investments</p>
      </div>

      {/* Emergency Fund Tracker */}
      <div className="card" style={{marginBottom: '0.5rem'}}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem'}}>
          <h3>🛡️ Emergency Fund</h3>
          <span style={{fontSize: '0.85rem', fontWeight: '600', color: emergencyProgress >= 100 ? '#2ecc71' : 'var(--text-secondary)'}}>
            {emergencyProgress.toFixed(0)}%
          </span>
        </div>
        <div style={{width: '100%', height: '12px', background: 'var(--border-color)', borderRadius: '6px', overflow: 'hidden', marginBottom: '0.5rem'}}>
          <div style={{
            height: '100%',
            width: `${emergencyProgress}%`,
            background: emergencyProgress >= 100 ? '#2ecc71' : 'linear-gradient(90deg, #e74c3c, #e6a817, #2ecc71)',
            borderRadius: '6px',
            transition: 'width 0.5s ease'
          }}></div>
        </div>
        <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)'}}>
          <span>{formatCurrency(totalSaving)}</span>
          <span>Target: {formatCurrency(emergencyTarget)}</span>
        </div>
      </div>

      {/* Section Cards */}
      {sections.map((section, idx) => (
        <div key={idx} className="card" style={{marginBottom: '0.5rem'}}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem'}}>
            <h3>{section.title}</h3>
            <span style={{fontWeight: '700', color: section.color, fontSize: '1.1rem'}}>{formatCurrency(section.total)}</span>
          </div>
          {section.items.length > 0 ? (
            section.items.map(([cat, amount]) => (
              <div key={cat} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '0.6rem 0', borderBottom: '1px solid var(--border-color)'
              }}>
                <span style={{fontSize: '0.9rem'}}>{cat}</span>
                <span style={{fontWeight: '600', color: section.color, fontSize: '0.9rem'}}>{formatCurrency(amount)}</span>
              </div>
            ))
          ) : (
            <p style={{color: 'var(--text-secondary)', fontSize: '0.85rem', textAlign: 'center', padding: '1rem 0'}}>No records yet</p>
          )}
        </div>
      ))}
    </div>
  );
}
