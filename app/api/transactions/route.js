import { NextResponse } from 'next/server';
import { getGoogleSheets, getSpreadsheetId } from '@/lib/googleSheets';

export async function GET() {
  try {
    const sheets = await getGoogleSheets();
    const spreadsheetId = getSpreadsheetId();

    if (!spreadsheetId) {
      return NextResponse.json({ error: 'Spreadsheet ID not configured' }, { status: 500 });
    }

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Transactions!A:G',
    });

    const rows = response.data.values;
    if (!rows || rows.length <= 1) {
      return NextResponse.json({ data: [] });
    }

    const data = rows.slice(1).filter(row => row[0] && row[0].trim() !== '').map(row => {
      // Clean amount string: remove "Rp", commas, and any non-numeric chars (except minus)
      const amountStr = String(row[4] || '0').replace(/[^0-9-]/g, '');
      return {
        id: row[0] || '',
        date: row[1] || '',
        type: row[2] || '',
        category: row[3] || '',
        amount: Number(amountStr) || 0,
        description: row[5] || '',
        qty: Number(row[6]) || 1,
      };
    }).reverse();

    return NextResponse.json({ data });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { date, type, category, amount, description, qty = 1 } = body;

    const sheets = await getGoogleSheets();
    const spreadsheetId = getSpreadsheetId();

    if (!spreadsheetId) {
      return NextResponse.json({ error: 'Spreadsheet ID not configured' }, { status: 500 });
    }

    const id = Date.now().toString();
    const newRow = [id, date, type, category, amount, description, qty];

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Transactions!A:G',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [newRow] },
    });

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });

    const sheets = await getGoogleSheets();
    const spreadsheetId = getSpreadsheetId();

    if (!spreadsheetId) {
      return NextResponse.json({ error: 'Spreadsheet ID not configured' }, { status: 500 });
    }

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Transactions!A:A',
    });
    
    const rows = response.data.values;
    if (!rows) return NextResponse.json({ error: 'No transactions found' }, { status: 404 });
    
    const rowIndex = rows.findIndex(row => row[0] === id);
    if (rowIndex === -1) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    const sheet = spreadsheet.data.sheets.find(s => s.properties.title === 'Transactions');
    
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [{
          deleteDimension: {
            range: {
              sheetId: sheet.properties.sheetId,
              dimension: 'ROWS',
              startIndex: rowIndex,
              endIndex: rowIndex + 1
            }
          }
        }]
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
