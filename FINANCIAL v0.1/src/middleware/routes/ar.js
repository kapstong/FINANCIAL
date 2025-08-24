import { Router } from 'express'
import { all, run, tx } from '../db.js'
import { logActivity } from '../activity.js'
const router = Router()

router.post('/customers', async (req, res) => {
  const { name, email, phone, address } = req.body || {}
  if (!name) return res.status(400).json({ error: 'name required' })
  const r = await run('INSERT INTO customers(name,email,phone,address) VALUES(?,?,?,?)', [
    name,
    email || null,
    phone || null,
    address || null
  ])
  await logActivity(1, 'AR', 'CREATE_CUSTOMER', 'customers', r.insertId, { name })
  res.json({ id: r.insertId })
})

router.get('/customers', async (_req, res) => {
  const rows = await all('SELECT * FROM customers ORDER BY id DESC LIMIT 200')
  res.json({ data: rows })
})

router.post('/invoices', async (req, res) => {
  const { customer_id, invoice_no, invoice_date, due_date, lines } = req.body || {}
  if (!customer_id || !invoice_no || !invoice_date || !due_date || !Array.isArray(lines) || !lines.length)
    return res.status(400).json({ error: 'missing fields' })

  const commit = tx(async (conn) => {
    const [r] = await conn.execute(
      'INSERT INTO invoices(customer_id,invoice_no,invoice_date,due_date,status) VALUES(?,?,?,?,?)',
      [customer_id, invoice_no, invoice_date, due_date, 'OPEN']
    )
    const id = r.insertId
    const stmt = 'INSERT INTO invoice_lines(invoice_id,item,qty,unit_price,account_id) VALUES(?,?,?,?,?)'
    for (const l of lines) {
      await conn.execute(stmt, [id, l.item || null, Number(l.qty || 1), Number(l.unit_price || 0), l.account_id || null])
    }
    await logActivity(1, 'AR', 'CREATE_INVOICE', 'invoices', id, {
      customer_id,
      invoice_no,
      count: lines.length
    })
    return id
  })
  const id = await commit()
  res.json({ id })
})

router.get('/invoices', async (_req, res) => {
  const rows = await all(
    `SELECT i.*, c.name AS customer_name,
            (SELECT SUM(qty*unit_price) FROM invoice_lines il WHERE il.invoice_id=i.id) AS total
     FROM invoices i JOIN customers c ON c.id=i.customer_id
     ORDER BY i.id DESC LIMIT 200`
  )
  res.json({ data: rows })
})

router.post('/payments', async (req, res) => {
  const { customer_id, date, method, ref_no, amount, applications = [] } = req.body || {}
  if (!customer_id || !date || !amount) return res.status(400).json({ error: 'missing fields' })
  const commit = tx(async (conn) => {
    const [p] = await conn.execute(
      'INSERT INTO payments(type,customer_id,date,method,ref_no,amount) VALUES(?,?,?,?,?,?)',
      ['AR', customer_id, date, method || null, ref_no || null, Number(amount)]
    )
    const pid = p.insertId
    const stmt = 'INSERT INTO payment_applications(payment_id,invoice_id,amount) VALUES(?,?,?)'
    let applied = 0
    for (const a of applications) {
      await conn.execute(stmt, [pid, a.invoice_id, Number(a.amount)])
      applied += Number(a.amount)
    }
    await logActivity(1, 'AR', 'RECEIVE_PAYMENT', 'payments', pid, { applied })
    return { pid, applied }
  })
  res.json(await commit())
})

router.get('/aging', async (_req, res) => {
  const rows = await all(
    `
    SELECT c.id AS customer_id, c.name,
           SUM(CASE WHEN DATEDIFF(CURDATE(), inv.due_date) <= 0 THEN inv.balance ELSE 0 END) AS current,
           SUM(CASE WHEN DATEDIFF(CURDATE(), inv.due_date) BETWEEN 1 AND 30 THEN inv.balance ELSE 0 END) AS d030,
           SUM(CASE WHEN DATEDIFF(CURDATE(), inv.due_date) BETWEEN 31 AND 60 THEN inv.balance ELSE 0 END) AS d3160,
           SUM(CASE WHEN DATEDIFF(CURDATE(), inv.due_date) BETWEEN 61 AND 90 THEN inv.balance ELSE 0 END) AS d6190,
           SUM(CASE WHEN DATEDIFF(CURDATE(), inv.due_date) > 90 THEN inv.balance ELSE 0 END) AS d90p
    FROM (
      SELECT i.id, i.customer_id, i.due_date,
             (SELECT IFNULL(SUM(qty*unit_price),0) FROM invoice_lines WHERE invoice_id=i.id)
             - (SELECT IFNULL(SUM(amount),0) FROM payment_applications WHERE invoice_id=i.id) AS balance
      FROM invoices i WHERE i.status <> 'VOID'
    ) inv
    JOIN customers c ON c.id=inv.customer_id
    GROUP BY c.id, c.name
    ORDER BY c.name
  `
  )
  res.json({ data: rows })
})

export default router
