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
      range: 'Log!A:H',
    });

    const rows = response.data.values;
    if (!rows || rows.length <= 1) {
      return NextResponse.json({ data: [] });
    }

    const data = rows.slice(1).filter(row => row[0] && row[0].trim() !== '').map(row => {
      const amountStr = String(row[7] || '0').replace(/[^0-9-]/g, '');
      return {
        id: row[0] || '',
        date: row[1] || '',
        type: row[2] || '',
        category: row[3] || '',
        description: row[4] || '',
        qty: Number(row[5]) || 1,
        price: Number(String(row[6] || '0').replace(/[^0-9-]/g, '')) || 0,
        amount: Number(amountStr) || 0,
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
    const pricePerQty = amount;
    const totalAmount = amount * qty;
    const newRow = [id, date, type, category, description, qty, pricePerQty, totalAmount];

    // Find the first empty row (in case of gaps from deletions)
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Log!A:A',
    });
    const rows = response.data?.values || [];
    
    let insertRowIndex = rows.length;
    for (let i = 1; i < rows.length; i++) {
      if (!rows[i] || !rows[i][0] || rows[i][0].trim() === '') {
        insertRowIndex = i;
        break;
      }
    }

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `Log!A${insertRowIndex + 1}:H${insertRowIndex + 1}`,
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
      range: 'Log!A:A',
    });
    
    const rows = response.data.values;
    if (!rows) return NextResponse.json({ error: 'No transactions found' }, { status: 404 });
    
    const rowIndex = rows.findIndex(row => row[0] === id);
    if (rowIndex === -1) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    const sheet = spreadsheet.data.sheets.find(s => s.properties.title === 'Log');
    
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
