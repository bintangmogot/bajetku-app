import fs from 'fs';
import path from 'path';

const dataDir = path.join(process.cwd(), 'data');
const transactionsFile = path.join(dataDir, 'transactions.json');
const budgetFile = path.join(dataDir, 'budget.json');

// Ensure data directory and files exist
function initDb() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  if (!fs.existsSync(transactionsFile)) {
    fs.writeFileSync(transactionsFile, JSON.stringify([]));
  }
  if (!fs.existsSync(budgetFile)) {
    // Default budgets
    const defaultBudget = {
      Food: 1500000,
      Transport: 500000,
      Entertainment: 300000,
      Bills: 1000000,
      Shopping: 500000
    };
    fs.writeFileSync(budgetFile, JSON.stringify(defaultBudget, null, 2));
  }
}

export function getTransactions() {
  initDb();
  const data = fs.readFileSync(transactionsFile, 'utf8');
  return JSON.parse(data);
}

export function addTransaction(transaction) {
  const transactions = getTransactions();
  transactions.push(transaction);
  fs.writeFileSync(transactionsFile, JSON.stringify(transactions, null, 2));
  return transaction;
}

export function getBudget() {
  initDb();
  const data = fs.readFileSync(budgetFile, 'utf8');
  return JSON.parse(data);
}
