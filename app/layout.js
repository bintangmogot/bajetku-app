import './globals.css'
import Link from 'next/link'
import AddButton from './components/AddButton'

export const metadata = {
  title: 'Bajetku',
  description: 'Minimalist financial tracker',
  themeColor: '#000000',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <div className="container">
          <main>{children}</main>
        </div>
        <div className="bottom-nav">
          <Link href="/">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
            Home
          </Link>
          <Link href="/transactions">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
            Log
          </Link>
          <AddButton />
          <Link href="/savings">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-.3-11 5 0 1.8 0 3 2 4.5V20h4v-2h3v2h4v-4c1-.5 1.7-1 2-2h2v-4h-2c0-1-.5-1.5-1-2"></path><path d="M2 9v1c0 1.1.9 2 2 2h1"></path><circle cx="16" cy="11" r="1"></circle></svg>
            Assets
          </Link>
          <Link href="/budget">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>
            Budget
          </Link>
        </div>
      </body>
    </html>
  )
}
