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
            <div key={idx} className="card" style={{display: 'flex', flexDirection: 'column', gap: '0.5rem'}}>
              <label style={{fontWeight: '500'}}>{b.category}</label>
              <input 
                type="text" 
                inputMode="numeric"
                value={b.amount ? new Intl.NumberFormat('id-ID').format(b.amount) : ''} 
                onChange={(e) => handleAmountChange(idx, e.target.value)}
                placeholder="0"
                style={{width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-primary)'}}
              />
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
