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
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [alertMessage, setAlertMessage] = useState(null);
  const [allCategories, setAllCategories] = useState({});
  const [filterType, setFilterType] = useState('All');

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    type: '',
    category: '',
    amount: '',
    description: '',
    qty: 1,
    place: ''
  });

  const [quickAmounts, setQuickAmounts] = useState([10000, 20000, 50000, 100000, 500000]);
  const [quickPlaces, setQuickPlaces] = useState(['Indomaret', 'Alfamart', 'Tokopedia', 'Shopee', 'Gojek', 'Grab']);

  const typeConfig = {
    Expense:    { icon: '↑', color: 'var(--danger-color)',  label: 'Expense' },
    Income:     { icon: '↓', color: 'var(--success-color)', label: 'Income' },
    Loan:       { icon: '🤝', color: '#e6a817',             label: 'Loan' },
    Debt:       { icon: '📋', color: '#9b59b6',             label: 'Debt' },
    Saving:     { icon: '🏦', color: '#2ecc71',             label: 'Saving' },
    Investment: { icon: '📈', color: '#3498db',             label: 'Investment' },
  };

  useEffect(() => {
    const saved = localStorage.getItem('bajetkuQuickAmounts');
    if (saved) {
      try { setQuickAmounts(JSON.parse(saved)); } catch (e) {}
    }
    const savedPlaces = localStorage.getItem('bajetkuQuickPlaces');
    if (savedPlaces) {
      try { setQuickPlaces(JSON.parse(savedPlaces)); } catch (e) {}
    }
    fetchTransactions();
    fetchCategories();
    fetchBudgets();
    
    const handleOpenWizard = () => openWizard();
    window.addEventListener('openTransactionWizard', handleOpenWizard);
    
    if (sessionStorage.getItem('pendingNewTransaction')) {
      sessionStorage.removeItem('pendingNewTransaction');
      setTimeout(() => openWizard(), 50);
    }
    
    return () => window.removeEventListener('openTransactionWizard', handleOpenWizard);
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
      const res = await fetch('/api/categories');
      const json = await res.json();
      if (json.data) setAllCategories(json.data);
    } catch (e) {
      console.error('Failed to fetch categories', e);
    }
  };

  const fetchBudgets = async () => {
    try {
      const res = await fetch('/api/budget');
      const json = await res.json();
      if (json.data && json.data.length > 0) {
        const limits = {};
        json.data.forEach(b => limits[b.category] = b.amount);
        setBudgetLimits(limits);
      }
    } catch (e) {
      console.error('Failed to fetch budgets', e);
    }
  };

  const openWizard = () => {
    setFormData({ date: new Date().toISOString().split('T')[0], type: '', category: '', amount: '', description: '', qty: 1, place: '' });
    setStep(1);
    setShowModal(true);
  };

  const handleTypeSelect = (type) => {
    setFormData({ ...formData, type });
    setStep(2);
  };

  const handleDateSelect = (e) => {
    e.preventDefault();
    setStep(3);
  };

  const handleCategorySelect = (category) => {
    setFormData({ ...formData, category });
    setStep(4);
  };

  const handleAmountChange = (e) => {
    const rawValue = e.target.value.replace(/\D/g, '');
    if (!rawValue) {
      setFormData({...formData, amount: ''});
      return;
    }
    const formatted = new Intl.NumberFormat('id-ID').format(Number(rawValue));
    setFormData({...formData, amount: formatted});
  };

  const handleAddCustomAmount = () => {
    setAlertMessage(null);
    const amtStr = prompt('Enter a new amount template (e.g. 75000):');
    const amtNum = Number(amtStr);
    if (amtNum && !isNaN(amtNum)) {
      const newAmounts = [...quickAmounts, amtNum].sort((a,b) => a - b);
      setQuickAmounts(newAmounts);
      localStorage.setItem('bajetkuQuickAmounts', JSON.stringify(newAmounts));
    }
  };

  const handleAddCustomPlace = () => {
    setAlertMessage(null);
    const placeStr = prompt('Enter a new place template (e.g. Starbucks):');
    if (placeStr && placeStr.trim()) {
      const newPlaces = [...new Set([...quickPlaces, placeStr.trim()])];
      setQuickPlaces(newPlaces);
      localStorage.setItem('bajetkuQuickPlaces', JSON.stringify(newPlaces));
    }
  };

  const handlePreSubmit = async (e, keepOpen = false) => {
    if (e) e.preventDefault();
    const rawAmount = Number(String(formData.amount).replace(/\./g, ''));
    
    if (formData.type === 'Expense') {
      const limit = budgetLimits[formData.category] || 0;
      if (limit > 0) {
        const currentMonth = formData.date.substring(0, 7);
        const currentTotal = transactions
          .filter(t => t.type === 'Expense' && t.category === formData.category && t.date.startsWith(currentMonth))
          .reduce((sum, t) => sum + t.amount, 0);
          
        if (currentTotal + (rawAmount * formData.qty) > limit) {
          setConfirmData({
            currentTotal,
            limit,
            rawAmount: rawAmount * formData.qty,
            keepOpen
          });
          return;
        }
      }
    }
    
    executeSubmit(rawAmount, keepOpen);
  };

  const executeSubmit = async (rawAmount, keepOpen = false) => {
    setSubmitting(true);
    setConfirmData(null);
    
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, amount: rawAmount })
      });
      const json = await res.json();
      if (json.error) setAlertMessage('Error: ' + json.error);
      else {
        fetchTransactions();
        if (keepOpen) {
          setFormData(prev => ({ ...prev, category: '', amount: '', description: '', qty: 1, place: '' }));
          setStep(3);
        } else {
          setShowModal(false);
        }
      }
    } catch (err) {
      setAlertMessage('Error: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTransaction = (id) => {
    setDeleteConfirm(id);
  };

  const confirmDelete = async () => {
    const id = deleteConfirm;
    setDeleteConfirm(null);
    try {
      const res = await fetch(`/api/transactions?id=${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.error) setAlertMessage('Error: ' + json.error);
      else fetchTransactions();
    } catch (err) {
      setAlertMessage('Error: ' + err.message);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
  };

  const categories = allCategories[formData.type] || [];
  const typeList = Object.keys(typeConfig);
  const filteredTransactions = filterType === 'All' ? transactions : transactions.filter(t => t.type === filterType);

  return (
    <div>
      <h1 style={{marginBottom: '1rem'}}>Transactions</h1>

      {/* Filter Chips */}
      <div style={{display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem'}}>
        {['All', ...typeList].map(t => (
          <button 
            key={t}
            onClick={() => setFilterType(t)}
            style={{
              padding: '0.4rem 0.75rem',
              borderRadius: '20px',
              border: filterType === t ? '2px solid var(--primary-color)' : '1px solid var(--border-color)',
              background: filterType === t ? 'var(--primary-color)' : 'transparent',
              color: filterType === t ? '#fff' : 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: '0.8rem',
              fontWeight: filterType === t ? '600' : '400',
              transition: 'all 0.2s ease'
            }}
          >
            {t === 'All' ? '🔍 All' : `${typeConfig[t].icon} ${t}`}
          </button>
        ))}
      </div>

      {loading && !transactions.length ? (
        <div className="loading-container"><div className="spinner"></div></div>
      ) : error ? (
        <div className="card"><p style={{color: 'var(--danger-color)'}}>{error}</p></div>
      ) : (
        <div style={{marginBottom: '5rem'}}>
          {filteredTransactions.length === 0 ? (
            <p style={{color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem 0'}}>No transactions found.</p>
          ) : (
            filteredTransactions.map((tx) => (
              <div key={tx.id} className="card" style={{padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0}}>
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: typeConfig[tx.type]?.color || 'var(--border-color)', opacity: 0.9, fontSize: '1rem', flexShrink: 0
                  }}>
                    {typeConfig[tx.type]?.icon || '?'}
                  </div>
                  <div style={{minWidth: 0}}>
                    <strong style={{display: 'block', fontSize: '0.95rem', marginBottom: '0.15rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>
                      {tx.description || 'No Title'} {tx.qty > 1 && <span style={{fontSize: '0.8rem', color: 'var(--text-secondary)'}}>x{tx.qty}</span>}
                    </strong>
                    <span style={{fontSize: '0.8rem', color: 'var(--text-secondary)'}}>{tx.date} • {tx.place ? `${tx.place} • ` : ''}{tx.category}</span>
                  </div>
                </div>
                <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0}}>
                  <div style={{fontWeight: '600', fontSize: '0.95rem', color: typeConfig[tx.type]?.color || 'var(--text-primary)'}}>
                    {['Expense', 'Debt'].includes(tx.type) ? '-' : '+'}{formatCurrency(tx.amount)}
                  </div>
                  <button onClick={() => handleDeleteTransaction(tx.id)} style={{background: 'transparent', border: 'none', color: 'var(--danger-color)', cursor: 'pointer', padding: '0.25rem', display: 'flex'}}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Multi-step Wizard */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>{step === 1 ? 'New Transaction' : step === 2 ? 'Select Date' : step === 3 ? 'Select Category' : 'Enter Details'}</h2>
              <button className="close-btn" onClick={() => setShowModal(false)}>&times;</button>
            </div>
          
          {step === 1 && (
            <div className="wizard-step" style={{textAlign: 'center', marginTop: '1.5rem'}}>
              <h2 style={{color: 'var(--text-primary)', marginBottom: '0.5rem'}}>What type?</h2>
              <p style={{color: 'var(--text-secondary)', marginBottom: '1.5rem'}}>Choose the transaction type.</p>
              <div style={{display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem'}}>
                {typeList.map(t => (
                  <button key={t} onClick={() => handleTypeSelect(t)} style={{
                    padding: '1.25rem 0.75rem', borderRadius: '12px', border: '1px solid var(--border-color)',
                    background: 'var(--surface-color)', cursor: 'pointer', display: 'flex', flexDirection: 'column',
                    alignItems: 'center', gap: '0.5rem', transition: 'all 0.2s ease', color: 'var(--text-primary)'
                  }}>
                    <span style={{fontSize: '1.75rem'}}>{typeConfig[t].icon}</span>
                    <span style={{fontWeight: '600', fontSize: '0.95rem', color: typeConfig[t].color}}>{typeConfig[t].label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="wizard-step">
              <button className="btn secondary" style={{padding: '0.5rem', width: 'auto', marginBottom: '1rem'}} onClick={() => setStep(1)}>← Back</button>
              <h2 style={{color: 'var(--text-primary)', marginBottom: '0.5rem'}}>When?</h2>
              <p style={{color: 'var(--text-secondary)', marginBottom: '1.5rem'}}>Select the date for this transaction.</p>
              <form onSubmit={handleDateSelect}>
                <div className="form-group">
                  <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} required style={{fontSize: '1.25rem', padding: '1rem'}} />
                </div>
                <button type="submit" className="btn" style={{marginTop: '2rem'}}>Next →</button>
              </form>
            </div>
          )}

          {step === 3 && (
            <div className="wizard-step">
              <button className="btn secondary" style={{padding: '0.5rem', width: 'auto', marginBottom: '1rem'}} onClick={() => setStep(2)}>← Back</button>
              <p style={{color: 'var(--text-secondary)'}}>Choose a category for your <strong style={{color: typeConfig[formData.type]?.color}}>{formData.type.toLowerCase()}</strong> on <strong>{formData.date}</strong>.</p>
              <div className="category-grid">
                {categories.map(cat => (
                  <button key={cat} className="cat-btn" onClick={() => handleCategorySelect(cat)}>
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="wizard-step">
              <button className="btn secondary" style={{padding: '0.5rem', width: 'auto', marginBottom: '1rem'}} onClick={() => setStep(3)}>← Back</button>
              
              <div style={{background: 'var(--surface-color)', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '1.5rem', display: 'flex', gap: '1.5rem', flexWrap: 'wrap'}}>
                <div>
                  <span style={{fontSize: '0.75rem', color: 'var(--text-secondary)'}}>Date</span>
                  <p style={{fontWeight: '600', margin: 0}}>{formData.date}</p>
                </div>
                <div>
                  <span style={{fontSize: '0.75rem', color: 'var(--text-secondary)'}}>Type</span>
                  <p style={{fontWeight: '600', color: typeConfig[formData.type]?.color, margin: 0}}>{formData.type}</p>
                </div>
                <div>
                  <span style={{fontSize: '0.75rem', color: 'var(--text-secondary)'}}>Category</span>
                  <p style={{fontWeight: '600', margin: 0}}>{formData.category}</p>
                </div>
              </div>

              <form onSubmit={e => handlePreSubmit(e, false)}>
                <div className="form-group">
                  <label>Title / Details</label>
                  <input type="text" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="What was this for?" required />
                </div>
                
                <div className="form-group">
                  <label>Where to buy? (Optional)</label>
                  <input type="text" value={formData.place} onChange={e => setFormData({...formData, place: e.target.value})} placeholder="e.g. Tokopedia, Indomaret..." />
                  
                  <div style={{display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.75rem'}}>
                    {quickPlaces.map(pl => (
                      <button 
                        key={pl} 
                        type="button" 
                        className="cat-btn" 
                        style={{padding: '0.5rem 0.75rem', background: formData.place === pl ? 'var(--primary-color)' : 'var(--surface-color)', color: formData.place === pl ? '#fff' : 'var(--text-primary)'}}
                        onClick={() => setFormData({...formData, place: pl})}
                      >
                        {pl}
                      </button>
                    ))}
                    <button 
                      type="button" 
                      className="cat-btn" 
                      style={{padding: '0.5rem 0.75rem', borderStyle: 'dashed'}}
                      onClick={handleAddCustomPlace}
                    >
                      + Add Place
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label>Price per item (IDR)</label>
                  <input 
                    type="text" 
                    inputMode="numeric"
                    value={formData.amount} 
                    onChange={handleAmountChange} 
                    placeholder="0" 
                    required 
                  />
                  {formData.qty > 1 && formData.amount && (
                    <div style={{fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.5rem', fontWeight: 'bold'}}>
                      Total: {new Intl.NumberFormat('id-ID').format(Number(formData.amount.replace(/\./g, '')) * formData.qty)} IDR
                    </div>
                  )}
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

                <div style={{display: 'flex', gap: '0.75rem', marginTop: '2rem'}}>
                  <button type="submit" className="btn secondary" style={{flex: 1}} disabled={submitting}>
                    {submitting ? 'Saving...' : 'Save & Close'}
                  </button>
                  <button type="button" className="btn" style={{flex: 1}} disabled={submitting} onClick={(e) => handlePreSubmit(e, true)}>
                    {submitting ? 'Saving...' : 'Save & Add Another'}
                  </button>
                </div>
              </form>
            </div>
          )}
          </div>
        </div>
      )}

      {/* Over Budget Confirmation Modal */}
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
              <button className="btn" style={{flex: 1, background: 'var(--danger-color)'}} onClick={() => executeSubmit(confirmData.rawAmount, confirmData.keepOpen)}>Continue</button>
            </div>
          </div>
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
      {deleteConfirm && (
        <div className="modal-overlay" style={{zIndex: 1100}}>
          <div className="modal-content" style={{maxWidth: '400px', textAlign: 'center'}}>
            <div style={{color: 'var(--danger-color)', marginBottom: '1rem'}}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </div>
            <h2 style={{marginBottom: '0.5rem'}}>Delete Transaction</h2>
            <p style={{color: 'var(--text-secondary)', marginBottom: '2rem'}}>Are you sure you want to permanently delete this transaction? This action cannot be undone.</p>
            <div style={{display: 'flex', gap: '1rem'}}>
              <button className="btn secondary" style={{flex: 1}} onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="btn" style={{flex: 1, background: 'var(--danger-color)'}} onClick={confirmDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
