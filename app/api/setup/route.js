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
    const requiredSheets = [
      { title: 'Start', frozen: 0 },
      { title: 'Log', frozen: 1 },
      { title: 'Budget', frozen: 1 },
      { title: 'Report', frozen: 2 },
    ];

    for (const s of requiredSheets) {
      if (!existingSheetTitles.includes(s.title)) {
        createRequests.push({ addSheet: { properties: { title: s.title, gridProperties: { frozenRowCount: s.frozen } } } });
      }
    }

    if (createRequests.length > 0) {
      await sheets.spreadsheets.batchUpdate({ spreadsheetId, requestBody: { requests: createRequests } });
    }

    // Refetch to get updated sheetIds
    const updatedSpreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    const getSheet = (title) => updatedSpreadsheet.data.sheets.find(s => s.properties.title === title);
    
    const startSheet = getSheet('Start');
    const logSheet = getSheet('Log');
    const budgetSheet = getSheet('Budget');
    const reportSheet = getSheet('Report');

    const startSheetId = startSheet.properties.sheetId;
    const logSheetId = logSheet.properties.sheetId;
    const budgetSheetId = budgetSheet.properties.sheetId;
    const reportSheetId = reportSheet.properties.sheetId;

    // ===== COLOR PALETTE =====
    const darkBg = { red: 0.12, green: 0.12, blue: 0.12 };
    const whiteTxt = { red: 1, green: 1, blue: 1 };
    const accentBg = { red: 0.16, green: 0.5, blue: 0.73 };
    const successBg = { red: 0.18, green: 0.49, blue: 0.2 };
    const dangerBg = { red: 0.78, green: 0.16, blue: 0.16 };
    const warningBg = { red: 0.85, green: 0.65, blue: 0.13 };
    const purpleBg = { red: 0.44, green: 0.24, blue: 0.69 };
    const lightGray = { red: 0.96, green: 0.96, blue: 0.96 };
    const white = { red: 1, green: 1, blue: 1 };

    const styleRequests = [];

    // ====================================
    // START SHEET — Categories & Config
    // ====================================
    const incomeCategories = ['Salary', 'Service', 'PT Comission', 'Trading', 'Side Hustle', 'Business'];
    const expenseCategories = ['Eating Out', 'Groceries', 'Rent', 'Electricity', 'Fuel', 'Restaurant', 'Charity', 'Tithes and Offering', 'Entertainment', 'Personal Development', 'Fitness Supplement', 'Health and Insurance', 'Laundry', 'Subscription', 'Family', 'Self Care', 'Shopping', 'Internet', 'Gift', 'Cleaning Supplies', 'Public Transport'];
    const loanCategories = ['Donny', 'Edo', 'Gek', 'Gede', 'Vendor AF', 'Jimmy', 'Cece'];
    const debtCategories = ['Adira', 'Natura', 'Dedek', 'Iphone'];
    const savingCategories = ['Dana Darurat'];
    const investmentCategories = ['Investment', 'Built By Gains Project', 'XIAO', 'Ninju'];

    const maxCatRows = Math.max(
      incomeCategories.length, expenseCategories.length, loanCategories.length,
      debtCategories.length, savingCategories.length, investmentCategories.length
    );

    // Build Start sheet data
    const startData = [
      ['BAJETKU — Expense Tracker', '', '', '', '', '', '', '', '', '', ''],
      [],
      ['CURRENCY', '', '', 'START DATE'],
      ['Rp', '', '', new Date().toISOString().split('T')[0]],
      [],
      ['CATEGORIES', '', '', '', '', '', '', '', 'Dana Darurat', 27000000],
      ['INCOME', '', 'EXPENSE', '', 'LOAN', '', 'DEBT', '', 'Saving', '', 'Investment'],
    ];

    for (let i = 0; i < maxCatRows; i++) {
      const row = [
        incomeCategories[i] || '', '',
        expenseCategories[i] || '', '',
        loanCategories[i] || '', '',
        debtCategories[i] || '', '',
        savingCategories[i] || '', '',
        investmentCategories[i] || ''
      ];
      startData.push(row);
    }

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `Start!A1:K${startData.length}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: startData }
    });

    // Start Sheet Styling — Title
    styleRequests.push({
      repeatCell: {
        range: { sheetId: startSheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 11 },
        cell: { userEnteredFormat: {
          backgroundColor: darkBg,
          textFormat: { bold: true, fontSize: 16, foregroundColor: whiteTxt },
          horizontalAlignment: 'CENTER',
          verticalAlignment: 'MIDDLE',
          padding: { top: 12, bottom: 12 }
        }},
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment,padding)'
      }
    });
    styleRequests.push({
      mergeCells: {
        range: { sheetId: startSheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 11 },
        mergeType: 'MERGE_ALL'
      }
    });

    // Start Sheet Styling — Category type headers (Row 7, index 6)
    const typeColors = [accentBg, dangerBg, warningBg, purpleBg, successBg, accentBg];
    const typeCols = [0, 2, 4, 6, 8, 10]; // A, C, E, G, I, K
    typeCols.forEach((col, idx) => {
      styleRequests.push({
        repeatCell: {
          range: { sheetId: startSheetId, startRowIndex: 6, endRowIndex: 7, startColumnIndex: col, endColumnIndex: col + 1 },
          cell: { userEnteredFormat: {
            backgroundColor: typeColors[idx],
            textFormat: { bold: true, fontSize: 11, foregroundColor: whiteTxt },
            horizontalAlignment: 'CENTER',
            padding: { top: 6, bottom: 6 }
          }},
          fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,padding)'
        }
      });
    });

    // Start Sheet column widths
    for (let i = 0; i < 11; i++) {
      const width = (i % 2 === 1) ? 20 : 180; // Spacer columns are narrow
      styleRequests.push({
        updateDimensionProperties: {
          range: { sheetId: startSheetId, dimension: 'COLUMNS', startIndex: i, endIndex: i + 1 },
          properties: { pixelSize: width }, fields: 'pixelSize'
        }
      });
    }

    // ====================================
    // LOG SHEET — Transaction Log
    // ====================================
    const logHeaders = ['ID', 'Date', 'Type', 'Category', 'Title / Details', 'Qty', 'Price per Qty', 'Amount'];
    styleRequests.push({
      updateCells: {
        start: { sheetId: logSheetId, rowIndex: 0, columnIndex: 0 },
        rows: [{
          values: logHeaders.map(h => ({
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

    const logColWidths = [100, 120, 100, 180, 300, 80, 150, 150];
    logColWidths.forEach((px, i) => {
      styleRequests.push({
        updateDimensionProperties: {
          range: { sheetId: logSheetId, dimension: 'COLUMNS', startIndex: i, endIndex: i + 1 },
          properties: { pixelSize: px }, fields: 'pixelSize'
        }
      });
    });

    styleRequests.push({
      addBanding: {
        bandedRange: {
          range: { sheetId: logSheetId, startRowIndex: 1, startColumnIndex: 0, endColumnIndex: logHeaders.length },
          rowProperties: { firstBandColor: lightGray, secondBandColor: white }
        }
      }
    });

    // ====================================
    // BUDGET SHEET STYLING
    // ====================================
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

    styleRequests.push({ updateDimensionProperties: { range: { sheetId: budgetSheetId, dimension: 'COLUMNS', startIndex: 0, endIndex: 1 }, properties: { pixelSize: 200 }, fields: 'pixelSize' } });
    styleRequests.push({ updateDimensionProperties: { range: { sheetId: budgetSheetId, dimension: 'COLUMNS', startIndex: 1, endIndex: 2 }, properties: { pixelSize: 200 }, fields: 'pixelSize' } });

    styleRequests.push({
      addBanding: {
        bandedRange: {
          range: { sheetId: budgetSheetId, startRowIndex: 1, startColumnIndex: 0, endColumnIndex: budgetHeaders.length },
          rowProperties: { firstBandColor: lightGray, secondBandColor: white }
        }
      }
    });

    // ====================================
    // REPORT SHEET
    // ====================================
    const reportColWidths = [200, 180, 180, 180, 180, 180];
    reportColWidths.forEach((px, i) => {
      styleRequests.push({
        updateDimensionProperties: {
          range: { sheetId: reportSheetId, dimension: 'COLUMNS', startIndex: i, endIndex: i + 1 },
          properties: { pixelSize: px }, fields: 'pixelSize'
        }
      });
    });

    // Execute style requests one-by-one to skip errors
    for (const req of styleRequests) {
      try {
        await sheets.spreadsheets.batchUpdate({ spreadsheetId, requestBody: { requests: [req] } });
      } catch (e) {
        console.log('Setup styling step skipped (likely already exists)');
      }
    }

    // ====================================
    // REPORT SHEET — FORMULAS
    // ====================================
    const currentMonth = new Date().toISOString().slice(0, 7);
    const reportData = [
      ['📊 BAJETKU — FINANCIAL REPORT', '', '', '', '', ''],
      [`Generated from live data  •  Current period: ${currentMonth}`, '', '', '', '', ''],
      ['', '', '', '', '', ''],
      ['OVERVIEW', '', '', '', '', ''],
      ['Total Income (All Time)', `=SUMPRODUCT((Log!C2:C="Income")*(SUBSTITUTE(SUBSTITUTE(Log!H2:H,"Rp",""),",","")*1))`, '', 'Total Expense (All Time)', `=SUMPRODUCT((Log!C2:C="Expense")*(SUBSTITUTE(SUBSTITUTE(Log!H2:H,"Rp",""),",","")*1))`, ''],
      ['Net Balance (All Time)', `=B5-E5`, '', 'Total Transactions', `=COUNTA(Log!A2:A)`, ''],
      ['', '', '', '', '', ''],
      ['MONTHLY BREAKDOWN', '', '', '', '', ''],
      ['Month', 'Income', 'Expenses', 'Net', 'Savings Rate', 'Txn Count'],
    ];

    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
      
      const incomeFormula = `=SUMPRODUCT((LEFT(Log!B2:B,7)="${ym}")*(Log!C2:C="Income")*(SUBSTITUTE(SUBSTITUTE(Log!H2:H,"Rp",""),",","")*1))`;
      const expenseFormula = `=SUMPRODUCT((LEFT(Log!B2:B,7)="${ym}")*(Log!C2:C="Expense")*(SUBSTITUTE(SUBSTITUTE(Log!H2:H,"Rp",""),",","")*1))`;
      const rowNum = 10 + i;
      const netFormula = `=B${rowNum}-C${rowNum}`;
      const savingsFormula = `=IF(B${rowNum}=0,"—",TEXT(D${rowNum}/B${rowNum},"0%"))`;
      const countFormula = `=COUNTIFS(LEFT(Log!B2:B,7),"${ym}")`;
      
      reportData.push([label, incomeFormula, expenseFormula, netFormula, savingsFormula, countFormula]);
    }

    // Category Breakdown section
    reportData.push(['', '', '', '', '', '']);
    reportData.push(['EXPENSE BY CATEGORY (This Month)', '', '', '', '', '']);
    reportData.push(['Category', 'Spent', 'Budget Limit', 'Remaining', 'Usage %', 'Status']);

    const defaultCategories = expenseCategories.slice(0, 15); // Use the first 15 expense categories
    const catStartRow = reportData.length + 1;
    
    defaultCategories.forEach((cat) => {
      const row = catStartRow + defaultCategories.indexOf(cat);
      const spentFormula = `=SUMPRODUCT((LEFT(Log!B2:B,7)="${currentMonth}")*(Log!C2:C="Expense")*(Log!D2:D="${cat}")*(SUBSTITUTE(SUBSTITUTE(Log!H2:H,"Rp",""),",","")*1))`;
      const budgetFormula = `=IFERROR(VLOOKUP("${cat}",Budget!A:B,2,FALSE),0)`;
      const remainingFormula = `=C${row}-B${row}`;
      const usageFormula = `=IF(C${row}=0,"No Budget",TEXT(B${row}/C${row},"0%"))`;
      const statusFormula = `=IF(C${row}=0,"-",IF(B${row}>C${row},"OVER BUDGET","OK"))`;
      reportData.push([cat, spentFormula, budgetFormula, remainingFormula, usageFormula, statusFormula]);
    });

    // Savings & Investment tracking section
    reportData.push(['', '', '', '', '', '']);
    reportData.push(['SAVINGS & INVESTMENT TRACKER', '', '', '', '', '']);
    reportData.push(['Type', 'Total Amount', 'This Month', 'Target', 'Progress', '']);

    const savingFormula = `=SUMPRODUCT((Log!C2:C="Saving")*(SUBSTITUTE(SUBSTITUTE(Log!H2:H,"Rp",""),",","")*1))`;
    const savingMonthFormula = `=SUMPRODUCT((LEFT(Log!B2:B,7)="${currentMonth}")*(Log!C2:C="Saving")*(SUBSTITUTE(SUBSTITUTE(Log!H2:H,"Rp",""),",","")*1))`;
    const investFormula = `=SUMPRODUCT((Log!C2:C="Investment")*(SUBSTITUTE(SUBSTITUTE(Log!H2:H,"Rp",""),",","")*1))`;
    const investMonthFormula = `=SUMPRODUCT((LEFT(Log!B2:B,7)="${currentMonth}")*(Log!C2:C="Investment")*(SUBSTITUTE(SUBSTITUTE(Log!H2:H,"Rp",""),",","")*1))`;
    
    const savRow = reportData.length + 1;
    reportData.push(['Saving', savingFormula, savingMonthFormula, 27000000, `=IF(D${savRow}=0,"—",TEXT(B${savRow}/D${savRow},"0%"))`, '']);
    const invRow = savRow + 1;
    reportData.push(['Investment', investFormula, investMonthFormula, '', '', '']);

    // Loan & Debt tracking section
    reportData.push(['', '', '', '', '', '']);
    reportData.push(['LOAN & DEBT OVERVIEW', '', '', '', '', '']);
    reportData.push(['Type', 'Total Given/Owed', 'This Month', '', '', '']);
    const loanRow = reportData.length + 1;
    const loanFormula = `=SUMPRODUCT((Log!C2:C="Loan")*(SUBSTITUTE(SUBSTITUTE(Log!H2:H,"Rp",""),",","")*1))`;
    const loanMonthFormula = `=SUMPRODUCT((LEFT(Log!B2:B,7)="${currentMonth}")*(Log!C2:C="Loan")*(SUBSTITUTE(SUBSTITUTE(Log!H2:H,"Rp",""),",","")*1))`;
    const debtFormula = `=SUMPRODUCT((Log!C2:C="Debt")*(SUBSTITUTE(SUBSTITUTE(Log!H2:H,"Rp",""),",","")*1))`;
    const debtMonthFormula = `=SUMPRODUCT((LEFT(Log!B2:B,7)="${currentMonth}")*(Log!C2:C="Debt")*(SUBSTITUTE(SUBSTITUTE(Log!H2:H,"Rp",""),",","")*1))`;
    reportData.push(['Loan (Given)', loanFormula, loanMonthFormula, '', '', '']);
    reportData.push(['Debt (Owed)', debtFormula, debtMonthFormula, '', '', '']);

    // Quick Stats
    reportData.push(['', '', '', '', '', '']);
    reportData.push(['QUICK STATS', '', '', '', '', '']);
    reportData.push(['Avg Daily Expense', '=IFERROR(B5/DAY(TODAY()),"-")', '', 'Days in Month', '=DAY(EOMONTH(TODAY(),0))', '']);
    const catEnd = catStartRow + defaultCategories.length - 1;
    const mostExpFormula = `=IFERROR(INDEX(A${catStartRow}:A${catEnd},MATCH(MAX(B${catStartRow}:B${catEnd}),B${catStartRow}:B${catEnd},0)),"-")`;
    const overBudgetFormula = `=COUNTIF(F${catStartRow}:F${catEnd},"OVER BUDGET")`;
    reportData.push(['Most Expensive Category', mostExpFormula, '', 'Categories Over Budget', overBudgetFormula, '']);

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `Report!A1:F${reportData.length}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: reportData }
    });

    // ====================================
    // REPORT SHEET — STYLING
    // ====================================
    const reportStyleRequests = [];

    // Title (Row 1)
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

    // Subtitle (Row 2)
    reportStyleRequests.push({
      repeatCell: {
        range: { sheetId: reportSheetId, startRowIndex: 1, endRowIndex: 2, startColumnIndex: 0, endColumnIndex: 6 },
        cell: { userEnteredFormat: {
          textFormat: { fontSize: 10, foregroundColor: { red: 0.5, green: 0.5, blue: 0.5 } }
        }},
        fields: 'userEnteredFormat(textFormat)'
      }
    });

    // Section headers styling (blue accent bars)
    const sectionHeaders = [3, 7]; // OVERVIEW, MONTHLY BREAKDOWN (0-indexed)
    // Find other section header rows dynamically
    for (let r = 0; r < reportData.length; r++) {
      const cell = reportData[r][0];
      if (typeof cell === 'string' && [
        'EXPENSE BY CATEGORY', 'SAVINGS & INVESTMENT', 'LOAN & DEBT', 'QUICK STATS'
      ].some(s => cell.includes(s))) {
        sectionHeaders.push(r);
      }
    }

    sectionHeaders.forEach(rowIdx => {
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

    // Sub-header rows (dark bg) — Monthly Breakdown header, Category header, Savings header, Loan header
    const subHeaderRows = [8]; // Monthly breakdown columns header
    for (let r = 0; r < reportData.length; r++) {
      const cell = reportData[r][0];
      if (cell === 'Category' || cell === 'Type') subHeaderRows.push(r);
    }

    subHeaderRows.forEach(rowIdx => {
      reportStyleRequests.push({
        repeatCell: {
          range: { sheetId: reportSheetId, startRowIndex: rowIdx, endRowIndex: rowIdx + 1, startColumnIndex: 0, endColumnIndex: 6 },
          cell: { userEnteredFormat: {
            backgroundColor: darkBg,
            textFormat: { bold: true, fontSize: 10, foregroundColor: whiteTxt },
            horizontalAlignment: 'CENTER'
          }},
          fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)'
        }
      });
    });

    // Key metric labels bold (rows 5-6)
    [4, 5].forEach(rowIdx => {
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

    // Merge titles
    reportStyleRequests.push({
      mergeCells: { range: { sheetId: reportSheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 6 }, mergeType: 'MERGE_ALL' }
    });
    reportStyleRequests.push({
      mergeCells: { range: { sheetId: reportSheetId, startRowIndex: 1, endRowIndex: 2, startColumnIndex: 0, endColumnIndex: 6 }, mergeType: 'MERGE_ALL' }
    });

    // Currency formatting for monthly breakdown
    reportStyleRequests.push({
      repeatCell: {
        range: { sheetId: reportSheetId, startRowIndex: 9, endRowIndex: 21, startColumnIndex: 1, endColumnIndex: 4 },
        cell: { userEnteredFormat: { numberFormat: { type: 'CURRENCY', pattern: '"Rp"#,##0' } } },
        fields: 'userEnteredFormat(numberFormat)'
      }
    });

    // Currency formatting for category breakdown
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
          values: expenseCategories.slice(0, 10).map(cat => [cat, 500000])
        }
      });
    }

    return NextResponse.json({ success: true, message: 'Spreadsheet styled with Start, Log, Budget, and Report sheets!' });
  } catch (error) {
    console.error('Setup Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
