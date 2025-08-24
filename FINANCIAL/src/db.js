import 'dotenv/config'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'
import mysql from 'mysql2/promise'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: +(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'atiera',
  connectionLimit: 10,
  multipleStatements: true
})

export async function runMigrations() {
  const fp = resolve(__dirname, 'sql', 'schema.sql')
  const sql = fs.readFileSync(fp, 'utf8')
  const conn = await pool.getConnection()
  try {
    await conn.query(sql)
  } finally {
    conn.release()
  }
}

export async function row(sql, params = []) {
  const [rows] = await pool.execute(sql, params)
  return rows[0] || null
}
export async function all(sql, params = []) {
  const [rows] = await pool.execute(sql, params)
  return rows
}
export async function run(sql, params = []) {
  const [r] = await pool.execute(sql, params)
  return r
}
export function tx(fn) {
  return async (...args) => {
    const conn = await pool.getConnection()
    try {
      await conn.beginTransaction()
      const res = await fn(conn, ...args)
      await conn.commit()
      return res
    } catch (e) {
      await conn.rollback()
      throw e
    } finally {
      conn.release()
    }
  }
}
