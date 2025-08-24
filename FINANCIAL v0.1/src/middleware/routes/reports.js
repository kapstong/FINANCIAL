import { Router } from 'express'
import { all } from '../db.js'
const router = Router()

router.get('/financial-statements', async (req, res) => {
  const y = parseInt(req.query.year || new Date().getFullYear(), 10)
  const m = parseInt(req.query.month || 12, 10)

  const income = await all(
    `
    SELECT a.code, a.name,
           SUM(CASE WHEN a.type='REVENUE' THEN jl.credit-jl.debit
                    WHEN a.type='EXPENSE' THEN jl.debit-jl.credit ELSE 0 END) AS amount
    FROM journal_lines jl
    JOIN journal_entries je ON je.id=jl.journal_entry_id AND YEAR(je.date)=? AND MONTH(je.date)<=?
    JOIN accounts a ON a.id=jl.account_id
    WHERE a.type IN ('REVENUE','EXPENSE')
    GROUP BY a.id ORDER BY a.code
  `,
    [y, m]
  )

  const balance = await all(
    `
    SELECT a.code, a.name, a.type,
           SUM(CASE WHEN a.type='ASSET' THEN jl.debit-jl.credit
                    WHEN a.type IN ('LIABILITY','EQUITY') THEN jl.credit-jl.debit ELSE 0 END) AS amount
    FROM journal_lines jl
    JOIN journal_entries je ON je.id=jl.journal_entry_id AND YEAR(je.date)=? AND MONTH(je.date)<=?
    JOIN accounts a ON a.id=jl.account_id
    WHERE a.type IN ('ASSET','LIABILITY','EQUITY')
    GROUP BY a.id ORDER BY a.code
  `,
    [y, m]
  )

  res.json({ income, balance })
})

export default router
