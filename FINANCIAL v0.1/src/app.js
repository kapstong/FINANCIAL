import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { runMigrations } from './db.js'

import authRouter from './routes/auth.js'
import glRouter from './routes/gl.js'
import arRouter from './routes/ar.js'
import apRouter from './routes/ap.js'
import budgetRouter from './routes/budget.js'
import reportsRouter from './routes/reports.js'
import disbRouter from './routes/disbursement.js'
import collectionsRouter from './routes/collections.js'
import activityRouter from './routes/activity.js'

const app = express()
app.use(cors())
app.use(express.json({ limit: '2mb' }))

app.get('/api/health', (req, res) => res.json({ ok: true }))

app.use('/api/auth', authRouter)
app.use('/api/gl', glRouter)
app.use('/api/ar', arRouter)
app.use('/api/ap', apRouter)
app.use('/api/budget', budgetRouter)
app.use('/api/reports', reportsRouter)
app.use('/api/disbursement', disbRouter)
app.use('/api/collections', collectionsRouter)
app.use('/api/activity', activityRouter)

const PORT = process.env.PORT || 5050

await runMigrations() // auto-creates tables & seed if missing

app.listen(PORT, () => {
  console.log(`ATIERA MySQL backend running on http://localhost:${PORT}`)
})
