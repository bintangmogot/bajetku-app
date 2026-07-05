'use client';
import { useRouter } from 'next/navigation';

export default function AddButton() {
  const router = useRouter();

  const handleAdd = (e) => {
    e.preventDefault();
    if (window.location.pathname === '/transactions') {
      window.dispatchEvent(new CustomEvent('openTransactionWizard'));
    } else {
      sessionStorage.setItem('pendingNewTransaction', 'true');
      router.push('/transactions');
    }
  };

  return (
    <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px'}}>
      <button 
        onClick={handleAdd}
        style={{
          background: 'var(--accent-color)',
          color: 'var(--bg-color)',
          width: '32px',
          height: '32px',
          borderRadius: '16px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          border: 'none',
          cursor: 'pointer',
          padding: 0
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
      </button>
      <span style={{fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)'}}>Add</span>
    </div>
  );
}
