'use client';
import { useState, useEffect } from 'react';

export default function Budget() {
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [alertMessage, setAlertMessage] = useState(null);
  const [promptData, setPromptData] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  useEffect(() => {
    fetchBudgets();
  }, []);

  const fetchBudgets = async () => {
    try {
      const [budgetRes, catRes] = await Promise.all([
        fetch('/api/budget'),
        fetch('/api/categories')
      ]);
      
      const budgetJson = await budgetRes.json();
      const catJson = await catRes.json();
      
      const expenseCats = catJson.data?.Expense || [];

      if (budgetJson.error) setError(budgetJson.error);
      else {
        const fetchedBudgets = budgetJson.data || [];
        const fetchedCats = fetchedBudgets.map(b => b.category);
        
        // Use dynamically fetched Expense categories as defaults
        const defaultCats = expenseCats.length > 0 
          ? expenseCats 
          : ['Food', 'Transport', 'Entertainment', 'Bills', 'Shopping', 'Health', 'Education', 'Self Development', 'Grooming', 'Other'];
        
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
    setDeleteConfirm(index);
  };

  const confirmDelete = () => {
    const index = deleteConfirm;
    setDeleteConfirm(null);
    const newBudgets = budgets.filter((_, i) => i !== index);
    setBudgets(newBudgets);
  };

  const handleAddCategory = () => {
    setNewCategoryName('');
    setPromptData(true);
  };

  const confirmAddCategory = () => {
    const cat = newCategoryName.trim();
    if (cat) {
      setBudgets([...budgets, { category: cat, amount: 0 }]);
    }
    setPromptData(false);
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
      if (json.error) setAlertMessage('Error: ' + json.error);
      else setAlertMessage('Budget updated successfully!');
    } catch (err) {
      setAlertMessage('Error: ' + err.message);
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

      {/* Alert Modal */}
      {alertMessage && (
        <div className="modal-overlay" style={{zIndex: 1100}}>
          <div className="modal-content" style={{maxWidth: '400px', textAlign: 'center'}}>
            <div style={{color: 'var(--text-primary)', marginBottom: '1rem'}}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
            </div>
            <h2 style={{marginBottom: '1rem'}}>Notice</h2>
            <p style={{color: 'var(--text-secondary)', marginBottom: '2rem'}}>{alertMessage}</p>
            <button className="btn" style={{width: '100%'}} onClick={() => setAlertMessage(null)}>OK</button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm !== null && (
        <div className="modal-overlay" style={{zIndex: 1100}}>
          <div className="modal-content" style={{maxWidth: '400px', textAlign: 'center'}}>
            <div style={{color: 'var(--danger-color)', marginBottom: '1rem'}}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </div>
            <h2 style={{marginBottom: '0.5rem'}}>Remove Category</h2>
            <p style={{color: 'var(--text-secondary)', marginBottom: '2rem'}}>Are you sure you want to remove this category?</p>
            <div style={{display: 'flex', gap: '1rem'}}>
              <button className="btn secondary" style={{flex: 1}} onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="btn" style={{flex: 1, background: 'var(--danger-color)'}} onClick={confirmDelete}>Remove</button>
            </div>
          </div>
        </div>
      )}

      {/* Prompt Modal */}
      {promptData && (
        <div className="modal-overlay" style={{zIndex: 1100}}>
          <div className="modal-content" style={{maxWidth: '400px'}}>
            <h2 style={{marginBottom: '1rem'}}>New Category</h2>
            <div className="form-group">
              <input 
                type="text" 
                value={newCategoryName} 
                onChange={(e) => setNewCategoryName(e.target.value)} 
                placeholder="Enter category name"
                autoFocus
              />
            </div>
            <div style={{display: 'flex', gap: '1rem', marginTop: '1.5rem'}}>
              <button className="btn secondary" style={{flex: 1}} onClick={() => setPromptData(false)}>Cancel</button>
              <button className="btn" style={{flex: 1}} onClick={confirmAddCategory}>Add</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
