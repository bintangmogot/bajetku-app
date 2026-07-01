import { google } from 'googleapis';
import path from 'path';
import fs from 'fs';

let authClient = null;

/**
 * Initialize and return the Google Sheets API client
 */
export async function getGoogleSheets() {
  if (authClient) {
    return google.sheets({ version: 'v4', auth: authClient });
  }

  // Try to load credentials from file
  const credentialsPath = path.join(process.cwd(), 'credentials.json');
  let credentials;

  try {
    if (fs.existsSync(credentialsPath)) {
      const fileContent = fs.readFileSync(credentialsPath, 'utf8');
      credentials = JSON.parse(fileContent);
    } else if (process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
      // Fallback to environment variables
      credentials = {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      };
    } else {
      throw new Error('No credentials found. Please provide credentials.json or environment variables.');
    }

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    authClient = await auth.getClient();
    return google.sheets({ version: 'v4', auth: authClient });
  } catch (error) {
    console.error('Error initializing Google Sheets client:', error);
    throw error;
  }
}

/**
 * Gets the spreadsheet ID from environment variables
 */
export function getSpreadsheetId() {
  const spreadsheetId = process.env.NEXT_PUBLIC_SPREADSHEET_ID || process.env.SPREADSHEET_ID;
  if (!spreadsheetId) {
    console.warn('SPREADSHEET_ID is not set in environment variables');
  }
  return spreadsheetId;
}
