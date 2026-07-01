import { NextResponse } from 'next/server';
import { getGoogleSheets, getSpreadsheetId } from '@/lib/googleSheets';

export async function GET() {
  try {
    const sheets = await getGoogleSheets();
    const spreadsheetId = getSpreadsheetId();

    if (!spreadsheetId) return NextResponse.json({ error: 'Spreadsheet ID not configured' }, { status: 500 });

    const response = await sheets.spreadsheets.values.get({ spreadsheetId, range: 'Budget!A:B' });
    const rows = response.data.values || [];
    
    const budgetList = [];
    if (rows.length > 1) {
      rows.slice(1).forEach(row => {
        budgetList.push({ category: row[0], amount: Number(row[1]) || 0 });
      });
    }

    return NextResponse.json({ data: budgetList });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { budgets } = body; // Array of {category, amount}

    const sheets = await getGoogleSheets();
    const spreadsheetId = getSpreadsheetId();

    if (!spreadsheetId) return NextResponse.json({ error: 'Spreadsheet ID not configured' }, { status: 500 });

    // Re-write the Budget sheet (Clear and then write)
    await sheets.spreadsheets.values.clear({ spreadsheetId, range: 'Budget!A2:B' });
    
    const values = budgets.map(b => [b.category, b.amount]);

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Budget!A2:B',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
