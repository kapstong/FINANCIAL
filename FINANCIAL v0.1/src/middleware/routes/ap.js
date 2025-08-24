import { Router } from 'express'
import { all, run, tx } from '../db.js'
import { logActivity } from '../activity.js'
const router = Router()

router.post('/vendors', async (req, res) => {
  const { name, email, phone, address } = req.body || {}
  if (!name) return res.status(400).json({ error: 'name required' })
  const r = await run('INSERT INTO vendors(name,email,phone,address) VALUES(?,?,?,?)', [
    name,
    email || null,
    phone || null,
    address || null
  ])
  await logActivity(1, 'AP', 'CREATE_VENDOR', 'vendors', r.insertId, { name })
  res.json({ id: r.insertId })
})

router.get('/vendors', async (_req, res) => {
  const rows = await all('SELECT * FROM vendors ORDER BY id DESC LIMIT 200')
  res.json({ data: rows })
})

router.post('/bills', async (req, res) => {
  const { vendor_id, bill_no, bill_date, due_date, lines } = req.body || {}
  if (!vendor_id || !bill_no || !bill_date || !due_date || !Array.isArray(lines) || !lines.length)
    return res.status(400).json({ error: 'missing fields' })
  const commit = tx(async (conn) => {
    const [r] = await conn.execute(
      'INSERT INTO bills(vendor_id,bill_no,bill_date,due_date,status) VALUES(?,?,?,?,?)',
      [vendor_id, bill_no, bill_date, due_date, 'OPEN']
    )
    const id = r.insertId
    const stmt = 'INSERT INTO bill_lines(bill_id,item,qty,unit_price,account_id) VALUES(?,?,?,?,?)'
    for (const l of lines) {
      await conn.execute(stmt, [id, l.item || null, Number(l.qty || 1), Number(l.unit_price || 0), l.account_id || null])
    }
    await logActivity(1, 'AP', 'CREATE_BILL', 'bills', id, { vendor_id, bill_no, count: lines.length })
    return id
  })
  res.json({ id: await commit() })
})

router.post('/payments', async (req, res) => {
  const { vendor_id, date, method, ref_no, amount, applications = [] } = req.body || {}
  if (!vendor_id || !date || !amount) return res.status(400).json({ error: 'missing fields' })
  const commit = tx(async (conn) => {
    const [p] = await conn.execute(
      'INSERT INTO payments(type,vendor_id,date,method,ref_no,amount) VALUES(?,?,?,?,?,?)',
      ['AP', vendor_id, date, method || null, ref_no || null, Number(amount)]
    )
    const pid = p.insertId
    const stmt = 'INSERT INTO payment_applications(payment_id,bill_id,amount) VALUES(?,?,?)'
    let applied = 0
    for (const a of applications) {
      await conn.execute(stmt, [pid, a.bill_id, Number(a.amount)])
      applied += Number(a.amount)
    }
    await logActivity(1, 'AP', 'MAKE_PAYMENT', 'payments', pid, { applied })
    return { pid, applied }
  })
  res.json(await commit())
})

router.get('/aging', async (_req, res) => {
  const rows = await all(
    `
    SELECT v.id AS vendor_id, v.name,
           SUM(CASE WHEN DATEDIFF(CURDATE(), bl.due_date) <= 0 THEN bl.balance ELSE 0 END) AS current,
           SUM(CASE WHEN DATEDIFF(CURDATE(), bl.due_date) BETWEEN 1 AND 30 THEN bl.balance ELSE 0 END) AS d030,
           SUM(CASE WHEN DATEDIFF(CURDATE(), bl.due_date) BETWEEN 31 AND 60 THEN bl.balance ELSE 0 END) AS d3160,
           SUM(CASE WHEN DATEDIFF(CURDATE(), bl.due_date) BETWEEN 61 AND 90 THEN bl.balance ELSE 0 END) AS d6190,
           SUM(CASE WHEN DATEDIFF(CURDATE(), bl.due_date) > 90 THEN bl.balance ELSE 0 END) AS d90p
    FROM (
      SELECT b.id, b.vendor_id, b.due_date,
             (SELECT IFNULL(SUM(qty*unit_price),0) FROM bill_lines WHERE bill_id=b.id)
             - (SELECT IFNULL(SUM(amount),0) FROM payment_applications WHERE bill_id=b.id) AS balance
      FROM bills b WHERE b.status <> 'VOID'
    ) bl
    JOIN vendors v ON v.id=bl.vendor_id
    GROUP BY v.id, v.name
    ORDER BY v.name
  `
  )
  res.json({ data: rows })
})

export default router
