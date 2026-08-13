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
  const [dateFilterType, setDateFilterType] = useState('month');
  const getLocalDateStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const [dateFilterValue, setDateFilterValue] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [sortOrder, setSortOrder] = useState('desc');
  const [calendarDate, setCalendarDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const [formData, setFormData] = useState({
    date: getLocalDateStr(),
    type: '',
    category: '',
    amount: '',
    description: '',
    qty: 1,
    place: ''
  });

  const [quickAmounts, setQuickAmounts] = useState([5000, 10000, 15000, 20000, 25000, 50000, 100000, 150000]);
  const [quickPlaces, setQuickPlaces] = useState(['Indomaret', 'Alfamart', 'Tokopedia', 'Shopee', 'Gojek', 'Grab']);
  const [quickTitles, setQuickTitles] = useState(['Lunch', 'Dinner', 'Coffee', 'Snack', 'Groceries', 'Transport']);

  const typeConfig = {
    Expense:    { icon: '↑', color: 'var(--danger-color)',  label: 'Expense' },
    Income:     { icon: '↓', color: 'var(--success-color)', label: 'Income' },
    Loan:       { icon: '🤝', color: '#e6a817',             label: 'Loan' },
    Debt:       { icon: '📋', color: '#9b59b6',             label: 'Debt' },
    Saving:     { icon: '🏦', color: '#2ecc71',             label: 'Saving' },
    Investment: { icon: '📈', color: '#3498db',             label: 'Investment' },
  };



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
    setFormData({ date: getLocalDateStr(), type: '', category: '', amount: '', description: '', qty: 1, place: '' });
    setStep(1);
    setShowModal(true);
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
    const savedTitles = localStorage.getItem('bajetkuQuickTitles');
    if (savedTitles) {
      try { setQuickTitles(JSON.parse(savedTitles)); } catch (e) {}
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

  const handleTypeSelect = (type) => {
    setFormData({ ...formData, type });
    setStep(2);
  };

  const handleDateSelect = (e) => {
    if (e) e.preventDefault();
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

  const handleAddCustomTitle = () => {
    setAlertMessage(null);
    const titleStr = prompt('Enter a new title template (e.g. Movie):');
    if (titleStr && titleStr.trim()) {
      const newTitles = [...new Set([...quickTitles, titleStr.trim()])];
      setQuickTitles(newTitles);
      localStorage.setItem('bajetkuQuickTitles', JSON.stringify(newTitles));
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
  
  let filteredTransactions = filterType === 'All' ? transactions : transactions.filter(t => t.type === filterType);
  
  if (dateFilterType === 'month') {
    filteredTransactions = filteredTransactions.filter(t => t.date.startsWith(dateFilterValue));
  } else if (dateFilterType === 'date') {
    filteredTransactions = filteredTransactions.filter(t => t.date === dateFilterValue);
  }
  
  filteredTransactions.sort((a, b) => {
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();
    if (dateA !== dateB) {
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    }
    // Fallback to maintain stable sort when dates are identical
    return 0;
  });

  return (
    <div>
      <h1 style={{marginBottom: '1rem'}}>Transactions</h1>

      {/* Filter Chips */}
      <div style={{display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem'}}>
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

      {/* Date Filter & Sort */}
      <div style={{display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap'}}>
        <div style={{display: 'flex', gap: '0.5rem', flex: 1, minWidth: '200px'}}>
          <select 
            value={dateFilterType} 
            onChange={(e) => {
              setDateFilterType(e.target.value);
              const now = new Date();
              if (e.target.value === 'month') setDateFilterValue(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
              if (e.target.value === 'date') setDateFilterValue(getLocalDateStr());
            }}
            style={{padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--surface-color)', color: 'var(--text-primary)', cursor: 'pointer'}}
          >
            <option value="month">Monthly</option>
            <option value="date">Daily</option>
            <option value="all">All Time</option>
          </select>
          
          {dateFilterType !== 'all' && (
            <input 
              type={dateFilterType} 
              value={dateFilterValue} 
              onChange={(e) => setDateFilterValue(e.target.value)}
              onClick={(e) => { try { e.target.showPicker(); } catch(err){} }}
              style={{flex: 1, padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--surface-color)', color: 'var(--text-primary)', cursor: 'pointer', width: '100%'}}
            />
          )}
        </div>
        
        <select
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
          style={{padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--surface-color)', color: 'var(--text-primary)', cursor: 'pointer', minWidth: '120px'}}
        >
          <option value="desc">Newest First</option>
          <option value="asc">Oldest First</option>
        </select>
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
              
              <div style={{background: 'var(--surface-color)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-color)'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem'}}>
                  <button type="button" onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1))} style={{background: 'var(--background-color)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', cursor: 'pointer', padding: '0.4rem 0.8rem'}}>◀</button>
                  <div style={{fontWeight: 'bold', fontSize: '1.1rem'}}>
                    {calendarDate.toLocaleString('default', { month: 'long' })} {calendarDate.getFullYear()}
                  </div>
                  <button type="button" onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1))} style={{background: 'var(--background-color)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', cursor: 'pointer', padding: '0.4rem 0.8rem'}}>▶</button>
                </div>
                
                <div style={{display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.5rem', textAlign: 'center'}}>
                  {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => <div key={d} style={{fontSize: '0.8rem', color: 'var(--text-secondary)', paddingBottom: '0.5rem'}}>{d}</div>)}
                  
                  {Array.from({ length: new Date(calendarDate.getFullYear(), calendarDate.getMonth(), 1).getDay() }).map((_, i) => <div key={`empty-${i}`} />)}
                  
                  {Array.from({ length: new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 0).getDate() }).map((_, i) => {
                    const day = i + 1;
                    const dateStr = `${calendarDate.getFullYear()}-${String(calendarDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const isSelected = formData.date === dateStr;
                    const isToday = getLocalDateStr() === dateStr;
                    
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => {
                          setFormData({ ...formData, date: dateStr });
                          setStep(3);
                        }}
                        style={{
                          padding: '0.75rem 0',
                          borderRadius: '8px',
                          border: 'none',
                          background: isSelected ? 'var(--primary-color)' : (isToday ? 'var(--background-color)' : 'transparent'),
                          color: isSelected ? '#fff' : (isToday ? 'var(--primary-color)' : 'var(--text-primary)'),
                          fontWeight: isSelected || isToday ? 'bold' : 'normal',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: isToday && !isSelected ? '1px solid var(--primary-color)' : '1px solid transparent',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>
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
              <h2 style={{color: 'var(--text-primary)', marginBottom: '0.5rem'}}>What was it for?</h2>
              
              <div className="form-group" style={{marginTop: '1.5rem'}}>
                <input 
                  type="text" 
                  value={formData.description} 
                  onChange={e => setFormData({...formData, description: e.target.value})} 
                  onKeyDown={e => { if (e.key === 'Enter' && formData.description.trim()) setStep(5); }}
                  placeholder="e.g. Lunch" 
                  autoFocus 
                  required 
                  style={{fontSize: '1.25rem', padding: '1rem'}}
                />
              </div>
              
              <div style={{display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '1rem'}}>
                {quickTitles.map(t => (
                  <button 
                    key={t} 
                    type="button" 
                    className="cat-btn" 
                    style={{padding: '0.5rem 0.75rem'}}
                    onClick={() => {
                      setFormData({...formData, description: t});
                      setStep(5);
                    }}
                  >
                    {t}
                  </button>
                ))}
                <button 
                  type="button" 
                  className="cat-btn" 
                  style={{padding: '0.5rem 0.75rem', borderStyle: 'dashed'}}
                  onClick={handleAddCustomTitle}
                >
                  + Add Title
                </button>
              </div>

              <button className="btn" style={{marginTop: '2rem'}} onClick={() => setStep(5)} disabled={!formData.description.trim()}>Next →</button>
            </div>
          )}

          {step === 5 && (
            <div className="wizard-step">
              <button className="btn secondary" style={{padding: '0.5rem', width: 'auto', marginBottom: '1rem'}} onClick={() => setStep(4)}>← Back</button>
              <h2 style={{color: 'var(--text-primary)', marginBottom: '0.5rem'}}>Where? (Optional)</h2>
              
              <div className="form-group" style={{marginTop: '1.5rem'}}>
                <input 
                  type="text" 
                  value={formData.place} 
                  onChange={e => setFormData({...formData, place: e.target.value})} 
                  onKeyDown={e => { if (e.key === 'Enter') setStep(6); }}
                  placeholder="e.g. Tokopedia" 
                  autoFocus 
                  style={{fontSize: '1.25rem', padding: '1rem'}}
                />
              </div>
              
              <div style={{display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '1rem'}}>
                {quickPlaces.map(pl => (
                  <button 
                    key={pl} 
                    type="button" 
                    className="cat-btn" 
                    style={{padding: '0.5rem 0.75rem'}}
                    onClick={() => {
                      setFormData({...formData, place: pl});
                      setStep(6);
                    }}
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
              
              <button className="btn" style={{marginTop: '2rem'}} onClick={() => setStep(6)}>Skip / Next →</button>
            </div>
          )}

          {step === 6 && (
            <div className="wizard-step">
              <button className="btn secondary" style={{padding: '0.5rem', width: 'auto', marginBottom: '1rem'}} onClick={() => setStep(5)}>← Back</button>
              <h2 style={{color: 'var(--text-primary)', marginBottom: '0.5rem'}}>Quantity</h2>
              
              <div className="form-group" style={{marginTop: '1.5rem', textAlign: 'center'}}>
                <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.5rem'}}>
                  <button type="button" className="cat-btn" style={{padding: '1rem 1.5rem', fontSize: '1.5rem'}} onClick={() => setFormData({...formData, qty: Math.max(1, formData.qty - 1)})}>-</button>
                  <input 
                    type="number"
                    min="1"
                    value={formData.qty}
                    onChange={e => setFormData({...formData, qty: Math.max(1, parseInt(e.target.value) || 1)})}
                    onKeyDown={e => { if (e.key === 'Enter') setStep(7); }}
                    autoFocus
                    style={{fontSize: '2rem', padding: '1rem', width: '100px', textAlign: 'center'}}
                  />
                  <button type="button" className="cat-btn" style={{padding: '1rem 1.5rem', fontSize: '1.5rem'}} onClick={() => setFormData({...formData, qty: formData.qty + 1})}>+</button>
                </div>
              </div>

              <div style={{display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '1.5rem', justifyContent: 'center'}}>
                {[1, 2, 3, 4, 5, 10].map(q => (
                  <button 
                    key={q} 
                    type="button" 
                    className="cat-btn" 
                    style={{padding: '0.75rem 1.25rem', fontSize: '1.1rem'}}
                    onClick={() => {
                      setFormData({...formData, qty: q});
                      setStep(7);
                    }}
                  >
                    x{q}
                  </button>
                ))}
              </div>

              <button className="btn" style={{marginTop: '2rem'}} onClick={() => setStep(7)}>Next →</button>
            </div>
          )}

          {step === 7 && (
            <div className="wizard-step">
              <button className="btn secondary" style={{padding: '0.5rem', width: 'auto', marginBottom: '1rem'}} onClick={() => setStep(6)}>← Back</button>
              
              <div style={{background: 'var(--surface-color)', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.875rem'}}>
                <span>{formData.date}</span> • 
                <span style={{color: typeConfig[formData.type]?.color}}>{formData.type}</span> • 
                <span>{formData.category}</span> •
                <strong>{formData.description}</strong> {formData.place && `(${formData.place})`} x{formData.qty}
              </div>

              <h2 style={{color: 'var(--text-primary)', marginBottom: '0.5rem'}}>Price (per item)</h2>

              <form onSubmit={e => handlePreSubmit(e, false)}>
                <div className="form-group" style={{marginTop: '1.5rem'}}>
                  <input 
                    type="text" 
                    inputMode="numeric"
                    value={formData.amount} 
                    onChange={handleAmountChange} 
                    onKeyDown={e => { if (e.key === 'Enter' && formData.amount) handlePreSubmit(e, false); }}
                    placeholder="0" 
                    autoFocus 
                    required 
                    style={{fontSize: '2rem', padding: '1rem', textAlign: 'center'}}
                  />
                  {formData.qty > 1 && formData.amount && (
                    <div style={{fontSize: '1rem', color: 'var(--primary-color)', marginTop: '0.75rem', fontWeight: 'bold', textAlign: 'center'}}>
                      Total: {new Intl.NumberFormat('id-ID').format(Number(formData.amount.replace(/\./g, '')) * formData.qty)} IDR
                    </div>
                  )}
                  
                  <div style={{display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '1.5rem', justifyContent: 'center'}}>
                    {quickAmounts.map(amt => (
                      <button 
                        key={amt} 
                        type="button" 
                        className="cat-btn" 
                        style={{padding: '0.75rem 1rem', fontSize: '1rem', fontWeight: 'bold'}}
                        onClick={() => {
                          const formatted = new Intl.NumberFormat('id-ID').format(amt);
                          setFormData({...formData, amount: formatted});
                          // Directly submit when clicking quick amount
                          executeSubmit(amt, false);
                        }}
                      >
                        {amt >= 1000 ? (amt / 1000) + 'k' : amt}
                      </button>
                    ))}
                    <button 
                      type="button" 
                      className="cat-btn" 
                      style={{padding: '0.75rem 1rem', borderStyle: 'dashed'}}
                      onClick={handleAddCustomAmount}
                    >
                      + Custom
                    </button>
                  </div>
                </div>

                <div style={{display: 'flex', gap: '0.75rem', marginTop: '2.5rem'}}>
                  <button type="submit" className="btn" style={{flex: 1}} disabled={submitting || !formData.amount}>
                    {submitting ? 'Saving...' : 'Save & Close'}
                  </button>
                  <button type="button" className="btn secondary" style={{flex: 1}} disabled={submitting || !formData.amount} onClick={(e) => handlePreSubmit(e, true)}>
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
