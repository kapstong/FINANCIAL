import { Router } from 'express'
import { all, run } from '../db.js'
const router = Router()

router.post('/headers', async (req, res) => {
  const { fiscal_year, department, created_by = 1 } = req.body || {}
  if (!fiscal_year) return res.status(400).json({ error: 'fiscal_year required' })
  const r = await run('INSERT INTO budgets(fiscal_year,department,created_by) VALUES(?,?,?)', [
    fiscal_year,
    department || null,
    created_by
  ])
  res.json({ id: r.insertId })
})

router.post('/lines', async (req, res) => {
  const { budget_id, account_id, period, amount } = req.body || {}
  if (!budget_id || !account_id || !period) return res.status(400).json({ error: 'missing fields' })
  const r = await run(
    'INSERT INTO budget_lines(budget_id,account_id,period,amount) VALUES(?,?,?,?) ON DUPLICATE KEY UPDATE amount=VALUES(amount)',
    [budget_id, account_id, period, Number(amount || 0)]
  )
  res.json({ affected: r.affectedRows })
})

router.get('/variance', async (req, res) => {
  const year = parseInt(req.query.year, 10)
  const month = parseInt(req.query.month, 10)
  if (!year || !month) return res.status(400).json({ error: 'year & month required' })

  const rows = await all(
    `
    SELECT ac.code, ac.name, ac.type,
           COALESCE(b.budget,0) AS budget,
           COALESCE(a.actual,0) AS actual,
           COALESCE(b.budget,0) - COALESCE(a.actual,0) AS variance
    FROM accounts ac
    LEFT JOIN (
      SELECT bl.account_id, SUM(bl.amount) AS budget
      FROM budget_lines bl
      JOIN budgets bu ON bu.id=bl.budget_id AND bu.fiscal_year=?
      WHERE bl.period=?
      GROUP BY bl.account_id
    ) b ON b.account_id=ac.id
    LEFT JOIN (
      SELECT jl.account_id,
             SUM(CASE WHEN a.type IN ('EXPENSE','ASSET') THEN jl.debit - jl.credit ELSE jl.credit - jl.debit END) AS actual
      FROM journal_lines jl
      JOIN journal_entries je ON je.id=jl.journal_entry_id
      JOIN accounts a ON a.id=jl.account_id
      WHERE YEAR(je.date)=? AND MONTH(je.date)=?
      GROUP BY jl.account_id
    ) a ON a.account_id=ac.id
    WHERE b.budget IS NOT NULL OR a.actual IS NOT NULL
    ORDER BY ac.code
  `,
    [year, month, year, month]
  )

  res.json({ data: rows })
})

export default router
