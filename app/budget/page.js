'use client';
import { useState, useEffect } from 'react';

export default function Budget() {
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchBudgets();
  }, []);

  const fetchBudgets = async () => {
    try {
      const res = await fetch('/api/budget');
      const json = await res.json();
      if (json.error) setError(json.error);
      else {
        const fetchedBudgets = json.data || [];
        const fetchedCats = fetchedBudgets.map(b => b.category);
        const defaultCats = ['Food', 'Transport', 'Entertainment', 'Bills', 'Shopping', 'Health', 'Education', 'Self Development', 'Grooming', 'Other'];
        
        const missing = defaultCats
          .filter(c => !fetchedCats.includes(c))
          .map(c => ({ category: c, amount: 0 }));
          
        setBudgets([...fetchedBudgets, ...missing]);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAmountChange = (index, value) => {
    const rawValue = value.replace(/\D/g, '');
    const newBudgets = [...budgets];
    newBudgets[index].amount = Number(rawValue);
    setBudgets(newBudgets);
  };

  const handleRemoveCategory = (index) => {
    if (!confirm('Are you sure you want to remove this category?')) return;
    const newBudgets = budgets.filter((_, i) => i !== index);
    setBudgets(newBudgets);
  };

  const handleAddCategory = () => {
    const cat = prompt('Enter new category name:');
    if (cat) {
      setBudgets([...budgets, { category: cat, amount: 0 }]);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/budget', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ budgets })
      });
      const json = await res.json();
      if (json.error) alert('Error: ' + json.error);
      else alert('Budget updated successfully!');
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="loading-container"><div className="spinner"></div></div>;

  return (
    <div>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem'}}>
        <h1>Set Budget</h1>
        <button className="btn secondary" style={{width: 'auto', padding: '0.5rem 1rem'}} onClick={handleAddCategory}>+ Category</button>
      </div>

      {error ? (
        <div className="card"><p style={{color: 'var(--danger-color)'}}>{error}</p></div>
      ) : (
        <div style={{marginBottom: '5rem'}}>
          {budgets.map((b, idx) => (
            <div key={idx} className="card" style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', gap: '1rem'}}>
              <label style={{fontWeight: '500', margin: 0, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{b.category}</label>
              <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1}}>
                <input 
                  type="text" 
                  inputMode="numeric"
                  value={b.amount ? new Intl.NumberFormat('id-ID').format(b.amount) : ''} 
                  onChange={(e) => handleAmountChange(idx, e.target.value)}
                  placeholder="0"
                  style={{width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-primary)', textAlign: 'right'}}
                />
                <button 
                  className="btn" 
                  style={{padding: '0.25rem', background: 'transparent', color: 'var(--danger-color)', width: 'auto', border: 'none', margin: 0}} 
                  onClick={() => handleRemoveCategory(idx)}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
              </div>
            </div>
          ))}
          
          <button className="btn" onClick={handleSave} disabled={saving} style={{marginTop: '1rem'}}>
            {saving ? 'Saving...' : 'Save Budgets'}
          </button>
        </div>
      )}
    </div>
  );
}
