import { NextResponse } from 'next/server';
import { getGoogleSheets, getSpreadsheetId } from '@/lib/googleSheets';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'all';

    const sheets = await getGoogleSheets();
    const spreadsheetId = getSpreadsheetId();

    if (!spreadsheetId) {
      return NextResponse.json({ error: 'Spreadsheet ID not configured' }, { status: 500 });
    }

    const [transactionsRes, budgetRes] = await Promise.all([
      sheets.spreadsheets.values.get({ spreadsheetId, range: 'Log!A:H' }).catch(() => ({ data: { values: [] } })),
      sheets.spreadsheets.values.get({ spreadsheetId, range: 'Budget!A:B' }).catch(() => ({ data: { values: [] } }))
    ]);

    const txRows = transactionsRes.data.values || [];
    const budgetRows = budgetRes.data.values || [];

    let totalIncome = 0;
    let totalExpense = 0;
    let totalSaving = 0;
    let totalInvestment = 0;
    let totalLoan = 0;
    let totalDebt = 0;
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
        if (!row[0] || !row[0].trim()) return; // skip empty rows
        const date = row[1] || '';
        
        if (period !== 'all' && !date.startsWith(period)) return;

        const type = row[2];
        const category = row[3];
        const amountStr = String(row[7] || '0').replace(/[^0-9-]/g, '');
        const amount = Number(amountStr) || 0;

        switch (type) {
          case 'Income':
            totalIncome += amount;
            break;
          case 'Expense':
            totalExpense += amount;
            if (date === today) dailyExpense += amount;
            categoryBreakdown[category] = (categoryBreakdown[category] || 0) + amount;
            break;
          case 'Saving':
            totalSaving += amount;
            break;
          case 'Investment':
            totalInvestment += amount;
            break;
          case 'Loan':
            totalLoan += amount;
            break;
          case 'Debt':
            totalDebt += amount;
            break;
        }
      });
    }

    const netBalance = totalIncome - totalExpense - totalSaving - totalInvestment;

    return NextResponse.json({
      summary: {
        totalIncome, totalExpense, netBalance, dailyExpense,
        totalSaving, totalInvestment, totalLoan, totalDebt,
        categoryBreakdown, budgetLimit
      }
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
