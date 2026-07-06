import { NextResponse } from 'next/server';
import { getGoogleSheets, getSpreadsheetId } from '@/lib/googleSheets';

// GET /api/categories — returns categories grouped by type from the Start sheet
export async function GET() {
  try {
    const sheets = await getGoogleSheets();
    const spreadsheetId = getSpreadsheetId();

    if (!spreadsheetId) {
      return NextResponse.json({ error: 'Spreadsheet ID not configured' }, { status: 500 });
    }

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Start!A7:K100',
    });

    const rows = response.data.values || [];
    if (rows.length < 2) {
      return NextResponse.json({ data: getDefaults() });
    }

    // Row 0 = type headers (INCOME, EXPENSE, LOAN, DEBT, Saving, Investment)
    // Row 1+ = category names under each type
    // Columns: A=Income, C=Expense, E=Loan, G=Debt, I=Saving, K=Investment (B,D,F,H,J are spacers)
    const typeMap = { 0: 'Income', 2: 'Expense', 4: 'Loan', 6: 'Debt', 8: 'Saving', 10: 'Investment' };
    const result = { Income: [], Expense: [], Loan: [], Debt: [], Saving: [], Investment: [] };

    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      if (!row) continue;
      for (const [colIdx, typeName] of Object.entries(typeMap)) {
        const val = row[Number(colIdx)];
        if (val && val.trim()) {
          result[typeName].push(val.trim());
        }
      }
    }

    // Fill with defaults if empty
    const defaults = getDefaults();
    for (const type of Object.keys(result)) {
      if (result[type].length === 0) result[type] = defaults[type];
    }

    return NextResponse.json({ data: result });
  } catch (error) {
    console.error('Categories API Error:', error);
    // Return defaults on error so the app still works
    return NextResponse.json({ data: getDefaults() });
  }
}

function getDefaults() {
  return {
    Income: ['Salary', 'Freelance', 'Investment', 'Gift', 'Other'],
    Expense: ['Food', 'Transport', 'Entertainment', 'Bills', 'Shopping', 'Health', 'Education', 'Other'],
    Loan: ['Personal'],
    Debt: ['Personal'],
    Saving: ['Emergency Fund', 'General'],
    Investment: ['Stocks', 'Crypto', 'Other'],
  };
}
