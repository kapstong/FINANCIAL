import { Router } from 'express'
import { all, row, tx } from '../db.js'
import { logActivity } from '../activity.js'
const router = Router()

router.get('/accounts', async (_req, res) => {
  const rows = await all('SELECT * FROM accounts WHERE is_active=1 ORDER BY code')
  res.json({ data: rows })
})

router.post('/journal-entries', async (req, res) => {
  const { date, memo, lines, posted_by = 1, je_no } = req.body || {}
  if (!date || !Array.isArray(lines) || !lines.length)
    return res.status(400).json({ error: 'Missing date or lines' })

  const dr = lines.reduce((a, b) => a + Number(b.debit || 0), 0).toFixed(2)
  const cr = lines.reduce((a, b) => a + Number(b.credit || 0), 0).toFixed(2)
  if (dr !== cr) return res.status(400).json({ error: 'Debits must equal credits' })

  const commit = tx(async (conn) => {
    const [r] = await conn.execute(
      'INSERT INTO journal_entries(je_no,date,memo,posted_by) VALUES(?,?,?,?)',
      [je_no || null, date, memo || null, posted_by]
    )
    const jeId = r.insertId
    const stmt =
      'INSERT INTO journal_lines(journal_entry_id,account_id,description,debit,credit,customer_id,vendor_id) VALUES(?,?,?,?,?,?,?)'
    for (const l of lines) {
      await conn.execute(stmt, [
        jeId,
        l.account_id,
        l.description || null,
        Number(l.debit || 0),
        Number(l.credit || 0),
        l.customer_id || null,
        l.vendor_id || null
      ])
    }
    await logActivity(posted_by, 'GL', 'CREATE_JE', 'journal_entries', jeId, {
      je_no,
      lines_count: lines.length
    })
    return jeId
  })

  const jeId = await commit()
  res.json({ ok: true, id: jeId })
})

router.get('/journal-entries', async (req, res) => {
  const { from, to, search } = req.query
  let sql = `SELECT je.*, COALESCE(SUM(jl.debit),0) total_debit, COALESCE(SUM(jl.credit),0) total_credit
             FROM journal_entries je LEFT JOIN journal_lines jl ON jl.journal_entry_id=je.id WHERE 1=1`
  const p = []
  if (from) {
    sql += ' AND je.date>=?'; p.push(from)
  }
  if (to) {
    sql += ' AND je.date<=?'; p.push(to)
  }
  if (search) {
    sql += ' AND (je.memo LIKE ? OR je.je_no LIKE ?)'; p.push(`%${search}%`, `%${search}%`)
  }
  sql += ' GROUP BY je.id ORDER BY je.date DESC, je.id DESC LIMIT 200'
  const rows = await all(sql, p)
  res.json({ data: rows })
})

router.get('/trial-balance', async (req, res) => {
  const asOf = req.query.asOf || new Date().toISOString().slice(0, 10)
  const rows = await all(
    `
    SELECT a.id, a.code, a.name, a.type,
           COALESCE(SUM(CASE WHEN je.date <= ? THEN jl.debit ELSE 0 END),0) dr,
           COALESCE(SUM(CASE WHEN je.date <= ? THEN jl.credit ELSE 0 END),0) cr
    FROM accounts a
    LEFT JOIN journal_lines jl ON jl.account_id=a.id
    LEFT JOIN journal_entries je ON je.id=jl.journal_entry_id
    GROUP BY a.id ORDER BY a.code
  `,
    [asOf, asOf]
  )
  const out = rows.map((r) => ({
    ...r,
    balance: ['ASSET', 'EXPENSE'].includes(r.type) ? Number(r.dr) - Number(r.cr) : Number(r.cr) - Number(r.dr)
  }))
  const totals = out.reduce((t, r) => ((t.dr += Number(r.dr || 0)), (t.cr += Number(r.cr || 0)), t), {
    dr: 0,
    cr: 0
  })
  res.json({ asOf, totals, rows: out })
})

router.get('/ledger', async (req, res) => {
  const { account_id, from, to } = req.query
  if (!account_id) return res.status(400).json({ error: 'account_id required' })
  const rows = await all(
    `
    SELECT je.date, je.je_no, jl.description, jl.debit, jl.credit
    FROM journal_lines jl JOIN journal_entries je ON je.id=jl.journal_entry_id
    WHERE jl.account_id=? AND (? IS NULL OR je.date>=?) AND (? IS NULL OR je.date<=?)
    ORDER BY je.date, je.id, jl.id
  `,
    [account_id, from, from, to, to]
  )
  const acct = await row('SELECT * FROM accounts WHERE id=?', [account_id])
  let bal = 0
  const out = rows.map((r) => {
    const d = +r.debit || 0,
      c = +r.credit || 0
    bal += ['ASSET', 'EXPENSE'].includes(acct.type) ? d - c : c - d
    return { ...r, balance: bal }
  })
  res.json({ account: acct, rows: out })
})

export default router
