import { NextResponse } from 'next/server';
import { getGoogleSheets, getSpreadsheetId } from '@/lib/googleSheets';

export async function POST(request) {
  try {
    const sheets = await getGoogleSheets();
    const spreadsheetId = getSpreadsheetId();

    if (!spreadsheetId) {
      return NextResponse.json({ error: 'Spreadsheet ID not configured' }, { status: 500 });
    }

    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    const existingSheets = spreadsheet.data.sheets;
    const existingSheetTitles = existingSheets.map(s => s.properties.title);
    
    const requests = [];
    
    // 1. Create missing sheets
    if (!existingSheetTitles.includes('Transactions')) {
      requests.push({ addSheet: { properties: { title: 'Transactions', gridProperties: { frozenRowCount: 1 } } } });
    }
    if (!existingSheetTitles.includes('Budget')) {
      requests.push({ addSheet: { properties: { title: 'Budget', gridProperties: { frozenRowCount: 1 } } } });
    }

    // Execute creation first so we can get their sheetIds
    if (requests.length > 0) {
      await sheets.spreadsheets.batchUpdate({ spreadsheetId, requestBody: { requests } });
    }

    // Refetch to get updated sheetIds
    const updatedSpreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    const txSheet = updatedSpreadsheet.data.sheets.find(s => s.properties.title === 'Transactions');
    const budgetSheet = updatedSpreadsheet.data.sheets.find(s => s.properties.title === 'Budget');

    const txSheetId = txSheet.properties.sheetId;
    const budgetSheetId = budgetSheet.properties.sheetId;

    const styleRequests = [];

    // Format Transactions Header
    const txHeaders = ['ID', 'Date', 'Type', 'Category', 'Amount', 'Title / Name of Goods'];
    styleRequests.push({
      updateCells: {
        start: { sheetId: txSheetId, rowIndex: 0, columnIndex: 0 },
        rows: [{
          values: txHeaders.map(h => ({
            userEnteredValue: { stringValue: h },
            userEnteredFormat: {
              backgroundColor: { red: 0.1, green: 0.1, blue: 0.1 }, 
              textFormat: { foregroundColor: { red: 1, green: 1, blue: 1 }, bold: true, fontSize: 12 },
              horizontalAlignment: 'CENTER'
            }
          }))
        }],
        fields: 'userEnteredValue,userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)'
      }
    });

    // Banding for Transactions
    styleRequests.push({
      addBanding: {
        bandedRange: {
          range: { sheetId: txSheetId, startRowIndex: 1, startColumnIndex: 0, endColumnIndex: txHeaders.length },
          rowProperties: { firstBandColor: { red: 0.96, green: 0.96, blue: 0.96 }, secondBandColor: { red: 1, green: 1, blue: 1 } }
        }
      }
    });

    // Widen columns for Transactions
    styleRequests.push({ updateDimensionProperties: { range: { sheetId: txSheetId, dimension: 'COLUMNS', startIndex: 5, endIndex: 6 }, properties: { pixelSize: 300 }, fields: 'pixelSize' } });
    styleRequests.push({ updateDimensionProperties: { range: { sheetId: txSheetId, dimension: 'COLUMNS', startIndex: 4, endIndex: 5 }, properties: { pixelSize: 150 }, fields: 'pixelSize' } });
    styleRequests.push({ updateDimensionProperties: { range: { sheetId: txSheetId, dimension: 'COLUMNS', startIndex: 3, endIndex: 4 }, properties: { pixelSize: 150 }, fields: 'pixelSize' } });

    // Format Budget Header
    const budgetHeaders = ['Category', 'Monthly Limit'];
    styleRequests.push({
      updateCells: {
        start: { sheetId: budgetSheetId, rowIndex: 0, columnIndex: 0 },
        rows: [{
          values: budgetHeaders.map(h => ({
            userEnteredValue: { stringValue: h },
            userEnteredFormat: {
              backgroundColor: { red: 0.1, green: 0.1, blue: 0.1 }, 
              textFormat: { foregroundColor: { red: 1, green: 1, blue: 1 }, bold: true, fontSize: 12 },
              horizontalAlignment: 'CENTER'
            }
          }))
        }],
        fields: 'userEnteredValue,userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)'
      }
    });

    // Banding for Budget
    styleRequests.push({
      addBanding: {
        bandedRange: {
          range: { sheetId: budgetSheetId, startRowIndex: 1, startColumnIndex: 0, endColumnIndex: budgetHeaders.length },
          rowProperties: { firstBandColor: { red: 0.96, green: 0.96, blue: 0.96 }, secondBandColor: { red: 1, green: 1, blue: 1 } }
        }
      }
    });

    // Widen columns for Budget
    styleRequests.push({ updateDimensionProperties: { range: { sheetId: budgetSheetId, dimension: 'COLUMNS', startIndex: 0, endIndex: 2 }, properties: { pixelSize: 200 }, fields: 'pixelSize' } });

    // Execute styling sequentially. 
    // We run them individually because addBanding throws an error if banding already exists.
    // By doing it individually, we can safely ignore specific errors while updating the headers.
    for (const req of styleRequests) {
      try {
        await sheets.spreadsheets.batchUpdate({ spreadsheetId, requestBody: { requests: [req] } });
      } catch (e) {
        // Silently ignore "banding already exists" or overlap errors
        console.log('Setup styling step skipped (likely already exists)');
      }
    }

    // Default Budget data
    if (!existingSheetTitles.includes('Budget')) {
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: 'Budget!A2:B',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [
            ['Food', 1500000],
            ['Transport', 500000],
            ['Entertainment', 300000],
            ['Bills', 1000000],
            ['Shopping', 500000]
          ]
        }
      });
    }

    return NextResponse.json({ success: true, message: 'Spreadsheet styled and updated!' });
  } catch (error) {
    console.error('Setup Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
