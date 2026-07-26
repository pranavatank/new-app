import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { getDB } from '../db/schema';

// ── Generate PDF Analytics Report ────────────────────────────────────────────
export const exportToPDF = async (year, month) => {
  const db = getDB();
  const prefix = `${year}-${String(month).padStart(2, '0')}`;
  
  // Get monthly totals
  const totals = db.getFirstSync(`
    SELECT
      COALESCE(SUM(d.deposit_today), 0) as deposited,
      COALESCE(SUM(CASE WHEN e.payment_type='cash' THEN e.amount ELSE 0 END), 0) as cash_spent,
      COALESCE(SUM(CASE WHEN e.payment_type='online' THEN e.amount ELSE 0 END), 0) as online_spent
    FROM days d
    LEFT JOIN expenses e ON e.day_id = d.id
    WHERE d.date LIKE ?;
  `, [`${prefix}%`]);

  const savings = totals.deposited - totals.cash_spent;
  const totalSpent = totals.cash_spent + totals.online_spent;
  const savingsPercent = totals.deposited > 0 ? ((savings / totals.deposited) * 100).toFixed(1) : 0;

  // Get category breakdown (descending)
  const categories = db.getAllSync(`
    SELECT 
      c.name, c.icon,
      COALESCE(SUM(e.amount), 0) as total,
      COALESCE(SUM(CASE WHEN e.payment_type='cash' THEN e.amount ELSE 0 END), 0) as cash_total,
      COALESCE(SUM(CASE WHEN e.payment_type='online' THEN e.amount ELSE 0 END), 0) as online_total
    FROM categories c
    LEFT JOIN expenses e ON e.category_id = c.id
    LEFT JOIN days d ON e.day_id = d.id AND d.date LIKE ?
    WHERE c.is_active = 1
    GROUP BY c.id
    HAVING total > 0
    ORDER BY total DESC;
  `, [`${prefix}%`]);

  // Get daily totals (descending by amount)
  const dailyData = db.getAllSync(`
    SELECT
      d.date,
      COALESCE(SUM(e.amount), 0) as total,
      COALESCE(SUM(CASE WHEN e.payment_type='cash' THEN e.amount ELSE 0 END), 0) as cash_total,
      COALESCE(SUM(CASE WHEN e.payment_type='online' THEN e.amount ELSE 0 END), 0) as online_total,
      d.deposit_today
    FROM days d
    LEFT JOIN expenses e ON e.day_id = d.id
    WHERE d.date LIKE ?
    GROUP BY d.date
    HAVING total > 0
    ORDER BY total DESC
    LIMIT 10;
  `, [`${prefix}%`]);

  // Get top spending days
  const topDays = db.getAllSync(`
    SELECT d.date, COALESCE(SUM(e.amount), 0) as total
    FROM days d
    LEFT JOIN expenses e ON e.day_id = d.id
    WHERE d.date LIKE ?
    GROUP BY d.date
    HAVING total > 0
    ORDER BY total DESC
    LIMIT 5;
  `, [`${prefix}%`]);

  const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long', year: 'numeric' });

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
      padding: 40px;
      background: #fff;
      color: #1a1a1a;
    }
    .header {
      text-align: center;
      margin-bottom: 40px;
      border-bottom: 3px solid #4F46E5;
      padding-bottom: 20px;
    }
    .header h1 {
      font-size: 32px;
      color: #4F46E5;
      margin-bottom: 8px;
    }
    .header h2 {
      font-size: 20px;
      color: #6B7280;
      font-weight: 400;
    }
    .summary {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
      margin-bottom: 40px;
    }
    .card {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 24px;
      border-radius: 12px;
      color: white;
    }
    .card.green { background: linear-gradient(135deg, #10b981 0%, #059669 100%); }
    .card.red { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); }
    .card.blue { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); }
    .card.amber { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); }
    .card-label {
      font-size: 14px;
      opacity: 0.9;
      margin-bottom: 8px;
    }
    .card-value {
      font-size: 32px;
      font-weight: bold;
    }
    .section {
      margin-bottom: 40px;
    }
    .section-title {
      font-size: 20px;
      font-weight: bold;
      color: #1f2937;
      margin-bottom: 16px;
      padding-bottom: 8px;
      border-bottom: 2px solid #e5e7eb;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 12px;
    }
    th {
      background: #f3f4f6;
      padding: 12px;
      text-align: left;
      font-weight: 600;
      color: #374151;
      border-bottom: 2px solid #d1d5db;
    }
    td {
      padding: 12px;
      border-bottom: 1px solid #e5e7eb;
    }
    tr:hover {
      background: #f9fafb;
    }
    .bar-chart {
      margin-top: 16px;
    }
    .bar-item {
      margin-bottom: 12px;
    }
    .bar-label {
      display: flex;
      justify-content: space-between;
      margin-bottom: 4px;
      font-size: 14px;
    }
    .bar-bg {
      background: #e5e7eb;
      height: 24px;
      border-radius: 4px;
      overflow: hidden;
    }
    .bar-fill {
      height: 100%;
      background: linear-gradient(90deg, #4F46E5, #7C3AED);
      display: flex;
      align-items: center;
      padding: 0 8px;
      color: white;
      font-size: 12px;
      font-weight: bold;
    }
    .footer {
      margin-top: 60px;
      text-align: center;
      color: #9ca3af;
      font-size: 12px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
    }
    .rank {
      display: inline-block;
      width: 28px;
      height: 28px;
      background: #4F46E5;
      color: white;
      border-radius: 50%;
      text-align: center;
      line-height: 28px;
      font-weight: bold;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>📒 Hisab — Family Ledger</h1>
    <h2>Monthly Analytics Report: ${monthName}</h2>
  </div>

  <div class="summary">
    <div class="card green">
      <div class="card-label">💰 Total Deposited</div>
      <div class="card-value">₹${totals.deposited.toFixed(0)}</div>
    </div>
    <div class="card red">
      <div class="card-label">💸 Total Spent</div>
      <div class="card-value">₹${totalSpent.toFixed(0)}</div>
    </div>
    <div class="card blue">
      <div class="card-label">💵 Cash Spent</div>
      <div class="card-value">₹${totals.cash_spent.toFixed(0)}</div>
    </div>
    <div class="card amber">
      <div class="card-label">🌐 Online Spent</div>
      <div class="card-value">₹${totals.online_spent.toFixed(0)}</div>
    </div>
  </div>

  <div class="card ${savings >= 0 ? 'green' : 'red'}" style="margin-bottom: 40px;">
    <div class="card-label">${savings >= 0 ? '✅ Savings' : '⚠️ Over Budget'}</div>
    <div class="card-value">₹${Math.abs(savings).toFixed(0)} (${savingsPercent}%)</div>
  </div>

  <div class="section">
    <div class="section-title">📊 Category Breakdown (Highest to Lowest)</div>
    <div class="bar-chart">
      ${categories.map((cat, idx) => {
        const percent = totals.deposited > 0 ? (cat.total / totals.deposited * 100) : 0;
        return `
          <div class="bar-item">
            <div class="bar-label">
              <span><span class="rank">${idx + 1}</span> ${cat.icon} ${cat.name}</span>
              <strong>₹${cat.total.toFixed(0)}</strong>
            </div>
            <div class="bar-bg">
              <div class="bar-fill" style="width: ${Math.min(percent, 100)}%">
                ${percent.toFixed(1)}%
              </div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  </div>

  <div class="section">
    <div class="section-title">🔥 Top 5 Spending Days</div>
    <table>
      <thead>
        <tr>
          <th>Rank</th>
          <th>Date</th>
          <th>Total Spent</th>
        </tr>
      </thead>
      <tbody>
        ${topDays.map((day, idx) => `
          <tr>
            <td><span class="rank">${idx + 1}</span></td>
            <td>${new Date(day.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</td>
            <td><strong>₹${day.total.toFixed(0)}</strong></td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>

  <div class="section">
    <div class="section-title">📅 Daily Spending Details (Top 10 Days)</div>
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Deposited</th>
          <th>Cash</th>
          <th>Online</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
        ${dailyData.map(day => `
          <tr>
            <td>${new Date(day.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</td>
            <td>₹${day.deposit_today.toFixed(0)}</td>
            <td>₹${day.cash_total.toFixed(0)}</td>
            <td>₹${day.online_total.toFixed(0)}</td>
            <td><strong>₹${day.total.toFixed(0)}</strong></td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>

  <div class="footer">
    Generated on ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })} • Hisab Family Ledger
  </div>
</body>
</html>
  `;

  const { uri } = await Print.printToFileAsync({ html });
  const timestamp = new Date().toISOString().split('T')[0];
  const fileName = `hisab_analytics_${year}-${String(month).padStart(2, '0')}_${timestamp}.pdf`;
  
  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    dialogTitle: 'Export Analytics Report',
    UTI: 'com.adobe.pdf',
  });

  return fileName;
};
