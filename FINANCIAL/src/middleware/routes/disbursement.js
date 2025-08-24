import { Router } from 'express'
import { all, run } from '../db.js'
const router = Router()

router.post('/', async (req, res) => {
  const { date, reference, payee, amount, account_id, purpose } = req.body || {}
  if (!date || !amount) return res.status(400).json({ error: 'missing fields' })
  const r = await run(
    'INSERT INTO disbursements(date,reference,payee,amount,account_id,purpose) VALUES(?,?,?,?,?,?)',
    [date, reference || null, payee || null, Number(amount), account_id || null, purpose || null]
  )
  res.json({ id: r.insertId })
})

router.get('/', async (_req, res) => {
  const rows = await all('SELECT * FROM disbursements ORDER BY date DESC, id DESC LIMIT 200')
  res.json({ data: rows })
})

export default router
