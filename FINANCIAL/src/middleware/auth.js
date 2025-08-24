import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { row } from '../db.js'

const router = Router()

router.post('/login', async (req, res) => {
  const { username, password } = req.body || {}
  if (!username || !password) return res.status(400).json({ error: 'Missing credentials' })
  const u = await row('SELECT * FROM users WHERE username=?', [username])
  if (!u || !bcrypt.compareSync(password, u.password_hash))
    return res.status(401).json({ error: 'Invalid username or password' })
  const token = jwt.sign(
    { id: u.id, username: u.username, role_id: u.role_id },
    process.env.JWT_SECRET || 'change-me',
    { expiresIn: '8h' }
  )
  res.json({ token })
})

export default router
