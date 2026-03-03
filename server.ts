import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";

const db = new Database("finops.db");

// Initialize DB
db.exec(`
  CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    date TEXT,
    customerId TEXT,
    customerName TEXT,
    category TEXT,
    region TEXT,
    paymentMethod TEXT,
    revenue REAL,
    cost REAL,
    profit REAL,
    discount REAL,
    quantity INTEGER
  )
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // API Routes
  app.get("/api/transactions", (req, res) => {
    const rows = db.prepare("SELECT * FROM transactions ORDER BY date DESC LIMIT 1000").all();
    res.json(rows);
  });

  app.post("/api/transactions/bulk", (req, res) => {
    const transactions = req.body;
    const insert = db.prepare(`
      INSERT OR REPLACE INTO transactions 
      (id, date, customerId, customerName, category, region, paymentMethod, revenue, cost, profit, discount, quantity)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertMany = db.transaction((data) => {
      for (const t of data) {
        insert.run(
          t.id, t.date, t.customerId, t.customerName, t.category, 
          t.region, t.paymentMethod, t.revenue, t.cost, t.profit, 
          t.discount, t.quantity
        );
      }
    });

    insertMany(transactions);
    res.json({ success: true, count: transactions.length });
  });

  app.get("/api/stats/revenue-by-month", (req, res) => {
    const rows = db.prepare(`
      SELECT 
        strftime('%Y-%m', date) as month,
        SUM(revenue) as revenue,
        SUM(profit) as profit
      FROM transactions
      GROUP BY month
      ORDER BY month ASC
    `).all();
    res.json(rows);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
