'use client';
import { useState, useEffect } from 'react';

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Wizard state
  const [showModal, setShowModal] = useState(false);
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [budgetLimits, setBudgetLimits] = useState({});
  const [confirmData, setConfirmData] = useState(null);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    type: '',
    category: '',
    amount: '',
    description: '',
    qty: 1
  });

  const [quickAmounts, setQuickAmounts] = useState([10000, 20000, 50000, 100000, 500000]);
  const defaultExpenseCats = ['Food', 'Transport', 'Entertainment', 'Bills', 'Shopping', 'Health', 'Education', 'Self Development', 'Grooming', 'Other'];
  const [expenseCategories, setExpenseCategories] = useState(defaultExpenseCats);

  useEffect(() => {
    const saved = localStorage.getItem('bajetkuQuickAmounts');
    if (saved) {
      try { setQuickAmounts(JSON.parse(saved)); } catch (e) {}
    }
    fetchTransactions();
    fetchCategories();
  }, []);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/transactions');
      const json = await res.json();
      if (json.error) setError(json.error);
      else setTransactions(json.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/budget');
      const json = await res.json();
      if (json.data && json.data.length > 0) {
        const budgetCats = json.data.map(b => b.category);
        setExpenseCategories(Array.from(new Set([...budgetCats, ...defaultExpenseCats])));
        
        const limits = {};
        json.data.forEach(b => limits[b.category] = b.amount);
        setBudgetLimits(limits);
      }
    } catch (e) {
      console.error('Failed to fetch categories', e);
    }
  };


  const openWizard = () => {
    setFormData({ date: new Date().toISOString().split('T')[0], type: '', category: '', amount: '', description: '', qty: 1 });
    setStep(1);
    setShowModal(true);
  };

  const handleTypeSelect = (type) => {
    setFormData({ ...formData, type });
    setStep(2);
  };

  const handleCategorySelect = (category) => {
    setFormData({ ...formData, category });
    setStep(3);
  };

  const handleAmountChange = (e) => {
    // Remove all non-digits
    const rawValue = e.target.value.replace(/\D/g, '');
    if (!rawValue) {
      setFormData({...formData, amount: ''});
      return;
    }
    // Add thousand separator dots
    const formatted = new Intl.NumberFormat('id-ID').format(Number(rawValue));
    setFormData({...formData, amount: formatted});
  };

  const handleAddCustomAmount = () => {
    const amtStr = prompt('Enter a new amount template (e.g. 75000):');
    const amtNum = Number(amtStr);
    if (amtNum && !isNaN(amtNum)) {
      const newAmounts = [...quickAmounts, amtNum].sort((a,b) => a - b);
      setQuickAmounts(newAmounts);
      localStorage.setItem('bajetkuQuickAmounts', JSON.stringify(newAmounts));
    }
  };

  const handlePreSubmit = async (e) => {
    e.preventDefault();
    const rawAmount = Number(String(formData.amount).replace(/\./g, ''));
    
    if (formData.type === 'Expense') {
      const limit = budgetLimits[formData.category] || 0;
      if (limit > 0) {
        const currentMonth = formData.date.substring(0, 7);
        const currentTotal = transactions
          .filter(t => t.type === 'Expense' && t.category === formData.category && t.date.startsWith(currentMonth))
          .reduce((sum, t) => sum + t.amount, 0);
          
        if (currentTotal + rawAmount > limit) {
          setConfirmData({
            currentTotal,
            limit,
            rawAmount
          });
          return;
        }
      }
    }
    
    executeSubmit(rawAmount);
  };

  const executeSubmit = async (rawAmount) => {
    setSubmitting(true);
    setConfirmData(null);
    
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, amount: rawAmount })
      });
      const json = await res.json();
      if (json.error) alert('Error: ' + json.error);
      else {
        setShowModal(false);
        fetchTransactions();
      }
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTransaction = async (id) => {
    if (!confirm('Are you sure you want to delete this transaction?')) return;
    
    try {
      const res = await fetch(`/api/transactions?id=${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.error) alert('Error: ' + json.error);
      else fetchTransactions();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
  };

  const incomeCategories = ['Salary', 'Freelance', 'Investment', 'Gift', 'Other'];
  const categories = formData.type === 'Expense' ? expenseCategories : incomeCategories;

  return (
    <div>
      <h1 style={{marginBottom: '1.5rem'}}>Transactions</h1>

      {loading && !transactions.length ? (
        <div className="loading-container"><div className="spinner"></div></div>
      ) : error ? (
        <div className="card"><p style={{color: 'var(--danger-color)'}}>{error}</p></div>
      ) : (
        <div style={{marginBottom: '5rem'}}>
          {transactions.length === 0 ? (
            <p style={{color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem 0'}}>No transactions found.</p>
          ) : (
            transactions.map((tx) => (
              <div key={tx.id} className="card" style={{padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <div>
                  <strong style={{display: 'block', fontSize: '1rem', marginBottom: '0.25rem'}}>
                    {tx.description || 'No Title'} {tx.qty > 1 && <span style={{fontSize: '0.875rem', color: 'var(--text-secondary)'}}>x{tx.qty}</span>}
                  </strong>
                  <span style={{fontSize: '0.875rem', color: 'var(--text-secondary)'}}>{tx.date} • {tx.category}</span>
                </div>
                <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
                  <div style={{fontWeight: '600', color: tx.type === 'Expense' ? 'var(--text-primary)' : 'var(--success-color)'}}>
                    {tx.type === 'Expense' ? '-' : '+'}{formatCurrency(tx.amount)}
                  </div>
                  <button onClick={() => handleDeleteTransaction(tx.id)} style={{background: 'transparent', border: 'none', color: 'var(--danger-color)', cursor: 'pointer', padding: '0.25rem', display: 'flex'}}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Floating Action Button */}
      <button className="fab" onClick={openWizard}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
      </button>

      {/* Multi-step Wizard Overlay */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>{step === 1 ? 'New Transaction' : step === 2 ? 'Select Category' : 'Enter Details'}</h2>
              <button className="close-btn" onClick={() => setShowModal(false)}>&times;</button>
            </div>
          
          {step === 1 && (
            <div className="wizard-step" style={{textAlign: 'center', marginTop: '2rem'}}>
              <h2 style={{color: 'var(--text-primary)', marginBottom: '0.5rem'}}>What kind of transaction?</h2>
              <p style={{color: 'var(--text-secondary)'}}>Choose the type to continue.</p>
              <div className="big-btn-container">
                <button className="big-btn expense-btn" onClick={() => handleTypeSelect('Expense')}>
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>
                  Expense
                </button>
                <button className="big-btn income-btn" onClick={() => handleTypeSelect('Income')}>
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg>
                  Income
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="wizard-step">
              <button className="btn secondary" style={{padding: '0.5rem', width: 'auto', marginBottom: '1rem'}} onClick={() => setStep(1)}>← Back</button>
              <p style={{color: 'var(--text-secondary)'}}>Choose a category for your {formData.type.toLowerCase()}.</p>
              <div className="category-grid">
                {categories.map(cat => (
                  <button key={cat} className="cat-btn" onClick={() => handleCategorySelect(cat)}>
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="wizard-step">
              <button className="btn secondary" style={{padding: '0.5rem', width: 'auto', marginBottom: '1rem'}} onClick={() => setStep(2)}>← Back</button>
              
              <div style={{background: 'var(--surface-color)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '2rem'}}>
                <p style={{fontSize: '0.875rem', color: 'var(--text-secondary)'}}>Type: <strong>{formData.type}</strong></p>
                <p style={{fontSize: '0.875rem', color: 'var(--text-secondary)'}}>Category: <strong>{formData.category}</strong></p>
              </div>

              <form onSubmit={handlePreSubmit}>
                <div className="form-group">
                  <label>Title / Name of Goods</label>
                  <input type="text" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="What was this for?" required />
                </div>
                
                <div className="form-group">
                  <label>Amount (IDR)</label>
                  <input 
                    type="text" 
                    inputMode="numeric"
                    value={formData.amount} 
                    onChange={handleAmountChange} 
                    placeholder="0" 
                    required 
                  />
                  <div style={{display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.75rem'}}>
                    {quickAmounts.map(amt => (
                      <button 
                        key={amt} 
                        type="button" 
                        className="cat-btn" 
                        style={{padding: '0.5rem 0.75rem'}}
                        onClick={() => setFormData({...formData, amount: new Intl.NumberFormat('id-ID').format(amt)})}
                      >
                        +{amt >= 1000 ? (amt / 1000) + 'k' : amt}
                      </button>
                    ))}
                    <button 
                      type="button" 
                      className="cat-btn" 
                      style={{padding: '0.5rem 0.75rem', borderStyle: 'dashed'}}
                      onClick={handleAddCustomAmount}
                    >
                      + Custom
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label>Quantity</label>
                  <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
                    <button type="button" className="cat-btn" style={{padding: '0.5rem 1rem'}} onClick={() => setFormData({...formData, qty: Math.max(1, formData.qty - 1)})}>-</button>
                    <span style={{fontSize: '1.25rem', fontWeight: 'bold'}}>{formData.qty}</span>
                    <button type="button" className="cat-btn" style={{padding: '0.5rem 1rem'}} onClick={() => setFormData({...formData, qty: formData.qty + 1})}>+</button>
                  </div>
                </div>
                
                <div className="form-group">
                  <label>Date</label>
                  <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} required />
                </div>

                <button type="submit" className="btn" style={{marginTop: '2rem'}} disabled={submitting}>
                  {submitting ? 'Saving...' : 'Save Transaction'}
                </button>
              </form>
            </div>
          )}
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmData && (
        <div className="modal-overlay" style={{zIndex: 1000}}>
          <div className="modal-content" style={{maxWidth: '400px', textAlign: 'center'}}>
            <div style={{color: 'var(--danger-color)', marginBottom: '1rem'}}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
            </div>
            <h2 style={{marginBottom: '0.5rem'}}>Over Budget Alert</h2>
            <p style={{color: 'var(--text-secondary)', marginBottom: '1.5rem'}}>
              This transaction puts you over your {formData.category} budget for the month.
            </p>
            
            <div style={{textAlign: 'left', marginBottom: '2rem', padding: '1rem', background: 'var(--surface-color)', borderRadius: '8px', border: '1px solid var(--border-color)'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem'}}>
                <span>Budget Limit:</span>
                <strong>{formatCurrency(confirmData.limit)}</strong>
              </div>
              <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem'}}>
                <span>Current Total:</span>
                <strong>{formatCurrency(confirmData.currentTotal)}</strong>
              </div>
              <div style={{display: 'flex', justifyContent: 'space-between', color: 'var(--danger-color)'}}>
                <span>New Total:</span>
                <strong>{formatCurrency(confirmData.currentTotal + confirmData.rawAmount)}</strong>
              </div>
            </div>

            <div style={{display: 'flex', gap: '1rem'}}>
              <button className="btn secondary" style={{flex: 1}} onClick={() => setConfirmData(null)}>Cancel</button>
              <button className="btn" style={{flex: 1, background: 'var(--danger-color)'}} onClick={() => executeSubmit(confirmData.rawAmount)}>Continue</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
