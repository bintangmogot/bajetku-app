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
    
    const createRequests = [];
    
    // 1. Create missing sheets
    if (!existingSheetTitles.includes('Transactions')) {
      createRequests.push({ addSheet: { properties: { title: 'Transactions', gridProperties: { frozenRowCount: 1 } } } });
    }
    if (!existingSheetTitles.includes('Budget')) {
      createRequests.push({ addSheet: { properties: { title: 'Budget', gridProperties: { frozenRowCount: 1 } } } });
    }
    if (!existingSheetTitles.includes('Report')) {
      createRequests.push({ addSheet: { properties: { title: 'Report', gridProperties: { frozenRowCount: 2 } } } });
    }

    if (createRequests.length > 0) {
      await sheets.spreadsheets.batchUpdate({ spreadsheetId, requestBody: { requests: createRequests } });
    }

    // Refetch to get updated sheetIds
    const updatedSpreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    const txSheet = updatedSpreadsheet.data.sheets.find(s => s.properties.title === 'Transactions');
    const budgetSheet = updatedSpreadsheet.data.sheets.find(s => s.properties.title === 'Budget');
    const reportSheet = updatedSpreadsheet.data.sheets.find(s => s.properties.title === 'Report');

    const txSheetId = txSheet.properties.sheetId;
    const budgetSheetId = budgetSheet.properties.sheetId;
    const reportSheetId = reportSheet.properties.sheetId;

    // ===== DARK HEADER STYLING =====
    const darkBg = { red: 0.12, green: 0.12, blue: 0.12 };
    const whiteTxt = { red: 1, green: 1, blue: 1 };
    const accentBg = { red: 0.16, green: 0.5, blue: 0.73 };       // Blue accent
    const successBg = { red: 0.18, green: 0.49, blue: 0.2 };      // Green
    const dangerBg = { red: 0.78, green: 0.16, blue: 0.16 };      // Red
    const lightGray = { red: 0.96, green: 0.96, blue: 0.96 };
    const white = { red: 1, green: 1, blue: 1 };

    const styleRequests = [];

    // ===========================
    // TRANSACTIONS SHEET STYLING
    // ===========================
    const txHeaders = ['ID', 'Date', 'Type', 'Category', 'Title / Name of Goods', 'Qty', 'Price per Quantity', 'Amount'];
    styleRequests.push({
      updateCells: {
        start: { sheetId: txSheetId, rowIndex: 0, columnIndex: 0 },
        rows: [{
          values: txHeaders.map(h => ({
            userEnteredValue: { stringValue: h },
            userEnteredFormat: {
              backgroundColor: darkBg, 
              textFormat: { foregroundColor: whiteTxt, bold: true, fontSize: 11 },
              horizontalAlignment: 'CENTER',
              verticalAlignment: 'MIDDLE',
              padding: { top: 8, bottom: 8 }
            }
          }))
        }],
        fields: 'userEnteredValue,userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment,padding)'
      }
    });

    // Column widths for Transactions
    const txColWidths = [100, 120, 100, 150, 300, 80, 150, 150];
    txColWidths.forEach((px, i) => {
      styleRequests.push({ 
        updateDimensionProperties: { 
          range: { sheetId: txSheetId, dimension: 'COLUMNS', startIndex: i, endIndex: i + 1 }, 
          properties: { pixelSize: px }, fields: 'pixelSize' 
        } 
      });
    });

    // Banding for Transactions
    styleRequests.push({
      addBanding: {
        bandedRange: {
          range: { sheetId: txSheetId, startRowIndex: 1, startColumnIndex: 0, endColumnIndex: txHeaders.length },
          rowProperties: { 
            firstBandColor: lightGray, 
            secondBandColor: white 
          }
        }
      }
    });

    // ===========================
    // BUDGET SHEET STYLING  
    // ===========================
    const budgetHeaders = ['Category', 'Monthly Limit'];
    styleRequests.push({
      updateCells: {
        start: { sheetId: budgetSheetId, rowIndex: 0, columnIndex: 0 },
        rows: [{
          values: budgetHeaders.map(h => ({
            userEnteredValue: { stringValue: h },
            userEnteredFormat: {
              backgroundColor: darkBg, 
              textFormat: { foregroundColor: whiteTxt, bold: true, fontSize: 11 },
              horizontalAlignment: 'CENTER',
              verticalAlignment: 'MIDDLE',
              padding: { top: 8, bottom: 8 }
            }
          }))
        }],
        fields: 'userEnteredValue,userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment,padding)'
      }
    });

    // Column widths for Budget
    styleRequests.push({ updateDimensionProperties: { range: { sheetId: budgetSheetId, dimension: 'COLUMNS', startIndex: 0, endIndex: 1 }, properties: { pixelSize: 200 }, fields: 'pixelSize' } });
    styleRequests.push({ updateDimensionProperties: { range: { sheetId: budgetSheetId, dimension: 'COLUMNS', startIndex: 1, endIndex: 2 }, properties: { pixelSize: 200 }, fields: 'pixelSize' } });

    // Banding for Budget
    styleRequests.push({
      addBanding: {
        bandedRange: {
          range: { sheetId: budgetSheetId, startRowIndex: 1, startColumnIndex: 0, endColumnIndex: budgetHeaders.length },
          rowProperties: { firstBandColor: lightGray, secondBandColor: white }
        }
      }
    });

    // ===========================
    // REPORT SHEET - ADVANCED
    // ===========================

    // Set column widths for Report
    const reportColWidths = [200, 180, 180, 180, 180, 180];
    reportColWidths.forEach((px, i) => {
      styleRequests.push({ 
        updateDimensionProperties: { 
          range: { sheetId: reportSheetId, dimension: 'COLUMNS', startIndex: i, endIndex: i + 1 }, 
          properties: { pixelSize: px }, fields: 'pixelSize' 
        } 
      });
    });

    // Execute style requests one-by-one to skip errors (e.g. banding already exists)
    for (const req of styleRequests) {
      try {
        await sheets.spreadsheets.batchUpdate({ spreadsheetId, requestBody: { requests: [req] } });
      } catch (e) {
        console.log('Setup styling step skipped (likely already exists)');
      }
    }

    // ===========================
    // REPORT SHEET - FORMULAS
    // ===========================
    // Build the report content with formulas that auto-calculate from Transactions & Budget sheets

    const currentMonth = new Date().toISOString().slice(0, 7); // e.g. "2026-07"
    const reportData = [
      // Row 1-2: Title
      ['📊 BAJETKU — FINANCIAL REPORT', '', '', '', '', ''],
      [`Generated from live data  •  Current period: ${currentMonth}`, '', '', '', '', ''],
      ['', '', '', '', '', ''],
      // Row 4: Overview Section Header
      ['OVERVIEW', '', '', '', '', ''],
      // Row 5-8: Key Metrics
      ['Total Income (All Time)', `=SUMPRODUCT((Transactions!C2:C="Income")*(SUBSTITUTE(SUBSTITUTE(Transactions!H2:H,"Rp",""),",","")*1))`, '', 'Total Expense (All Time)', `=SUMPRODUCT((Transactions!C2:C="Expense")*(SUBSTITUTE(SUBSTITUTE(Transactions!H2:H,"Rp",""),",","")*1))`, ''],
      ['Net Balance (All Time)', `=B5-E5`, '', 'Total Transactions', `=COUNTA(Transactions!A2:A)`, ''],
      ['', '', '', '', '', ''],
      // Row 8: Monthly Breakdown Header
      ['MONTHLY BREAKDOWN', '', '', '', '', ''],
      // Row 9: Sub-headers
      ['Month', 'Income', 'Expenses', 'Net', 'Savings Rate', 'Txn Count'],
      // Rows 10-21: Monthly formulas (12 months back from current)
    ];

    // Generate 12 months of formulas
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
      
      const incomeFormula = `=SUMPRODUCT((LEFT(Transactions!B2:B,7)="${ym}")*(Transactions!C2:C="Income")*(SUBSTITUTE(SUBSTITUTE(Transactions!H2:H,"Rp",""),",","")*1))`;
      const expenseFormula = `=SUMPRODUCT((LEFT(Transactions!B2:B,7)="${ym}")*(Transactions!C2:C="Expense")*(SUBSTITUTE(SUBSTITUTE(Transactions!H2:H,"Rp",""),",","")*1))`;
      const rowNum = 10 + i;
      const netFormula = `=B${rowNum}-C${rowNum}`;
      const savingsFormula = `=IF(B${rowNum}=0,"—",TEXT(D${rowNum}/B${rowNum},"0%"))`;
      const countFormula = `=COUNTIFS(LEFT(Transactions!B2:B,7),"${ym}")`;
      
      reportData.push([label, incomeFormula, expenseFormula, netFormula, savingsFormula, countFormula]);
    }

    // Add Category Breakdown section
    reportData.push(['', '', '', '', '', '']);
    reportData.push(['EXPENSE BY CATEGORY (This Month)', '', '', '', '', '']);
    reportData.push(['Category', 'Spent', 'Budget Limit', 'Remaining', 'Usage %', 'Status']);

    const defaultCategories = ['Food', 'Transport', 'Entertainment', 'Bills', 'Shopping', 'Health', 'Education', 'Self Development', 'Grooming', 'Other'];
    const catStartRow = reportData.length + 1; // 1-indexed for formulas
    const overLabel = 'OVER BUDGET';
    const okLabel = 'OK';
    
    defaultCategories.forEach((cat, idx) => {
      const row = catStartRow + idx;
      const spentFormula = '=SUMPRODUCT((LEFT(Transactions!B2:B,7)="' + currentMonth + '")*(Transactions!C2:C="Expense")*(Transactions!D2:D="' + cat + '")*(SUBSTITUTE(SUBSTITUTE(Transactions!H2:H,"Rp",""),",","")*1))';
      const budgetFormula = '=IFERROR(VLOOKUP("' + cat + '",Budget!A:B,2,FALSE),0)';
      const remainingFormula = '=C' + row + '-B' + row;
      const usageFormula = '=IF(C' + row + '=0,"No Budget",TEXT(B' + row + '/C' + row + ',"0%"))';
      const statusFormula = '=IF(C' + row + '=0,"-",IF(B' + row + '>C' + row + ',"' + overLabel + '","' + okLabel + '"))';
      
      reportData.push([cat, spentFormula, budgetFormula, remainingFormula, usageFormula, statusFormula]);
    });

    // Add Top Expenses section
    reportData.push(['', '', '', '', '', '']);
    reportData.push(['QUICK STATS', '', '', '', '', '']);
    reportData.push(['Avg Daily Expense', '=IFERROR(B5/DAY(TODAY()),"-")', '', 'Days in Month', '=DAY(EOMONTH(TODAY(),0))', '']);
    const catEnd = catStartRow + defaultCategories.length - 1;
    const mostExpFormula = '=IFERROR(INDEX(A' + catStartRow + ':A' + catEnd + ',MATCH(MAX(B' + catStartRow + ':B' + catEnd + '),B' + catStartRow + ':B' + catEnd + ',0)),"-")';
    const overBudgetFormula = '=COUNTIF(F' + catStartRow + ':F' + catEnd + ',"' + overLabel + '")';
    reportData.push(['Most Expensive Category', mostExpFormula, '', 'Categories Over Budget', overBudgetFormula, '']);

    // Write all Report data
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `Report!A1:F${reportData.length}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: reportData }
    });

    // ===========================
    // REPORT SHEET - STYLING
    // ===========================
    const reportStyleRequests = [];

    // Title row styling (Row 1)
    reportStyleRequests.push({
      repeatCell: {
        range: { sheetId: reportSheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 6 },
        cell: { userEnteredFormat: { 
          textFormat: { bold: true, fontSize: 16, foregroundColor: darkBg },
          verticalAlignment: 'MIDDLE'
        }},
        fields: 'userEnteredFormat(textFormat,verticalAlignment)'
      }
    });

    // Subtitle row (Row 2)
    reportStyleRequests.push({
      repeatCell: {
        range: { sheetId: reportSheetId, startRowIndex: 1, endRowIndex: 2, startColumnIndex: 0, endColumnIndex: 6 },
        cell: { userEnteredFormat: { 
          textFormat: { fontSize: 10, foregroundColor: { red: 0.5, green: 0.5, blue: 0.5 } }
        }},
        fields: 'userEnteredFormat(textFormat)'
      }
    });

    // Section headers: OVERVIEW (Row 4)
    const sectionHeaderRows = [3, 7]; // 0-indexed: row 4, row 8
    sectionHeaderRows.forEach(rowIdx => {
      reportStyleRequests.push({
        repeatCell: {
          range: { sheetId: reportSheetId, startRowIndex: rowIdx, endRowIndex: rowIdx + 1, startColumnIndex: 0, endColumnIndex: 6 },
          cell: { userEnteredFormat: { 
            backgroundColor: accentBg,
            textFormat: { bold: true, fontSize: 12, foregroundColor: whiteTxt },
            horizontalAlignment: 'LEFT',
            padding: { top: 6, bottom: 6 }
          }},
          fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,padding)'
        }
      });
    });

    // Monthly Breakdown sub-header (Row 9)
    reportStyleRequests.push({
      repeatCell: {
        range: { sheetId: reportSheetId, startRowIndex: 8, endRowIndex: 9, startColumnIndex: 0, endColumnIndex: 6 },
        cell: { userEnteredFormat: { 
          backgroundColor: darkBg,
          textFormat: { bold: true, fontSize: 10, foregroundColor: whiteTxt },
          horizontalAlignment: 'CENTER'
        }},
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)'
      }
    });

    // Category Breakdown section header
    const catSectionHeaderRow = catStartRow - 3; // 0-indexed
    reportStyleRequests.push({
      repeatCell: {
        range: { sheetId: reportSheetId, startRowIndex: catSectionHeaderRow, endRowIndex: catSectionHeaderRow + 1, startColumnIndex: 0, endColumnIndex: 6 },
        cell: { userEnteredFormat: { 
          backgroundColor: accentBg,
          textFormat: { bold: true, fontSize: 12, foregroundColor: whiteTxt },
          horizontalAlignment: 'LEFT',
          padding: { top: 6, bottom: 6 }
        }},
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,padding)'
      }
    });

    // Category sub-headers
    const catSubHeaderRow = catStartRow - 2; // 0-indexed
    reportStyleRequests.push({
      repeatCell: {
        range: { sheetId: reportSheetId, startRowIndex: catSubHeaderRow, endRowIndex: catSubHeaderRow + 1, startColumnIndex: 0, endColumnIndex: 6 },
        cell: { userEnteredFormat: { 
          backgroundColor: darkBg,
          textFormat: { bold: true, fontSize: 10, foregroundColor: whiteTxt },
          horizontalAlignment: 'CENTER'
        }},
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)'
      }
    });

    // Quick Stats section header
    const quickStatsHeaderRow = catStartRow + defaultCategories.length; // 0-indexed
    reportStyleRequests.push({
      repeatCell: {
        range: { sheetId: reportSheetId, startRowIndex: quickStatsHeaderRow, endRowIndex: quickStatsHeaderRow + 1, startColumnIndex: 0, endColumnIndex: 6 },
        cell: { userEnteredFormat: { 
          backgroundColor: accentBg,
          textFormat: { bold: true, fontSize: 12, foregroundColor: whiteTxt },
          horizontalAlignment: 'LEFT',
          padding: { top: 6, bottom: 6 }
        }},
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,padding)'
      }
    });

    // Key metric labels bold
    [4, 5].forEach(rowIdx => { // 0-indexed rows 5, 6
      reportStyleRequests.push({
        repeatCell: {
          range: { sheetId: reportSheetId, startRowIndex: rowIdx, endRowIndex: rowIdx + 1, startColumnIndex: 0, endColumnIndex: 1 },
          cell: { userEnteredFormat: { textFormat: { bold: true, fontSize: 11 } } },
          fields: 'userEnteredFormat(textFormat)'
        }
      });
      reportStyleRequests.push({
        repeatCell: {
          range: { sheetId: reportSheetId, startRowIndex: rowIdx, endRowIndex: rowIdx + 1, startColumnIndex: 3, endColumnIndex: 4 },
          cell: { userEnteredFormat: { textFormat: { bold: true, fontSize: 11 } } },
          fields: 'userEnteredFormat(textFormat)'
        }
      });
    });

    // Merge title across columns
    reportStyleRequests.push({
      mergeCells: {
        range: { sheetId: reportSheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 6 },
        mergeType: 'MERGE_ALL'
      }
    });
    reportStyleRequests.push({
      mergeCells: {
        range: { sheetId: reportSheetId, startRowIndex: 1, endRowIndex: 2, startColumnIndex: 0, endColumnIndex: 6 },
        mergeType: 'MERGE_ALL'
      }
    });

    // Number formatting for currency columns in Report
    // Monthly breakdown: columns B, C, D (income, expenses, net) rows 10-21
    reportStyleRequests.push({
      repeatCell: {
        range: { sheetId: reportSheetId, startRowIndex: 9, endRowIndex: 21, startColumnIndex: 1, endColumnIndex: 4 },
        cell: { userEnteredFormat: { numberFormat: { type: 'CURRENCY', pattern: '"Rp"#,##0' } } },
        fields: 'userEnteredFormat(numberFormat)'
      }
    });

    // Category breakdown: columns B, C, D (spent, limit, remaining)
    reportStyleRequests.push({
      repeatCell: {
        range: { sheetId: reportSheetId, startRowIndex: catStartRow - 1, endRowIndex: catStartRow - 1 + defaultCategories.length, startColumnIndex: 1, endColumnIndex: 4 },
        cell: { userEnteredFormat: { numberFormat: { type: 'CURRENCY', pattern: '"Rp"#,##0' } } },
        fields: 'userEnteredFormat(numberFormat)'
      }
    });

    // Overview metric values: B5, E5, B6, E6
    [4, 5].forEach(rowIdx => {
      reportStyleRequests.push({
        repeatCell: {
          range: { sheetId: reportSheetId, startRowIndex: rowIdx, endRowIndex: rowIdx + 1, startColumnIndex: 1, endColumnIndex: 2 },
          cell: { userEnteredFormat: { numberFormat: { type: 'CURRENCY', pattern: '"Rp"#,##0' }, textFormat: { fontSize: 14, bold: true } } },
          fields: 'userEnteredFormat(numberFormat,textFormat)'
        }
      });
    });

    // Execute report styling
    for (const req of reportStyleRequests) {
      try {
        await sheets.spreadsheets.batchUpdate({ spreadsheetId, requestBody: { requests: [req] } });
      } catch (e) {
        console.log('Report styling step skipped:', e.message?.substring(0, 80));
      }
    }

    // Default Budget data (only if Budget sheet was just created)
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
            ['Shopping', 500000],
            ['Health', 300000],
            ['Education', 500000],
            ['Self Development', 300000],
            ['Grooming', 200000],
            ['Other', 200000]
          ]
        }
      });
    }

    return NextResponse.json({ success: true, message: 'Spreadsheet styled with advanced Report dashboard!' });
  } catch (error) {
    console.error('Setup Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
