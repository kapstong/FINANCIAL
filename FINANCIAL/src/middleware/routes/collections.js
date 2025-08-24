import { Router } from 'express'
import { all } from '../db.js'
const router = Router()

router.get('/summary', async (_req, res) => {
  const rows = await all(
    `
    SELECT date,
           SUM(CASE WHEN type='AR' THEN amount ELSE 0 END) AS ar_received,
           SUM(CASE WHEN type='AP' THEN amount ELSE 0 END) AS ap_paid
    FROM payments
    GROUP BY date
    ORDER BY date DESC
    LIMIT 30
  `
  )
  res.json({ data: rows })
})

router.get('/past-due', async (_req, res) => {
  const rows = await all(
    `
    SELECT inv.invoice_no, inv.customer_name, inv.due_date, inv.balance
    FROM (
      SELECT i.id, i.invoice_no, c.name AS customer_name, i.due_date,
             (SELECT IFNULL(SUM(qty*unit_price),0) FROM invoice_lines WHERE invoice_id=i.id)
             - (SELECT IFNULL(SUM(amount),0) FROM payment_applications WHERE invoice_id=i.id) AS balance
      FROM invoices i
      JOIN customers c ON c.id=i.customer_id
    ) inv
    WHERE DATE(inv.due_date) < CURDATE() AND inv.balance > 0
    ORDER BY inv.due_date
  `
  )
  res.json({ data: rows })
})

export default router
