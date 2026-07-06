import { NextResponse } from 'next/server';
import { getGoogleSheets, getSpreadsheetId } from '@/lib/googleSheets';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'all'; // 'all', 'YYYY-MM', or 'YYYY-MM-DD'

    const sheets = await getGoogleSheets();
    const spreadsheetId = getSpreadsheetId();

    if (!spreadsheetId) {
      return NextResponse.json({ error: 'Spreadsheet ID not configured' }, { status: 500 });
    }

    const [transactionsRes, budgetRes] = await Promise.all([
      sheets.spreadsheets.values.get({ spreadsheetId, range: 'Transactions!A:H' }).catch(() => ({ data: { values: [] } })),
      sheets.spreadsheets.values.get({ spreadsheetId, range: 'Budget!A:B' }).catch(() => ({ data: { values: [] } }))
    ]);

    const txRows = transactionsRes.data.values || [];
    const budgetRows = budgetRes.data.values || [];

    let totalIncome = 0;
    let totalExpense = 0;
    let dailyExpense = 0;
    let categoryBreakdown = {};

    const today = new Date().toISOString().split('T')[0];
    
    const budgetLimit = {};
    if (budgetRows.length > 1) {
      budgetRows.slice(1).forEach(row => {
        const amountStr = String(row[1] || '0').replace(/[^0-9-]/g, '');
        budgetLimit[row[0]] = Number(amountStr) || 0;
      });
    }

    if (txRows.length > 1) {
      txRows.slice(1).forEach(row => {
        const date = row[1] || '';
        
        // Filter by period (startsWith allows matching '2026-07' to '2026-07-01')
        if (period !== 'all' && !date.startsWith(period)) return;

        const type = row[2];
        const category = row[3];
        const amountStr = String(row[7] || '0').replace(/[^0-9-]/g, '');
        const amount = Number(amountStr) || 0;

        if (type === 'Income') {
          totalIncome += amount;
        } else if (type === 'Expense') {
          totalExpense += amount;
          if (date === today) dailyExpense += amount;
          categoryBreakdown[category] = (categoryBreakdown[category] || 0) + amount;
        }
      });
    }

    const netBalance = totalIncome - totalExpense;

    return NextResponse.json({
      summary: { totalIncome, totalExpense, netBalance, dailyExpense, categoryBreakdown, budgetLimit }
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
