import { run } from './db.js'

export async function logActivity(
  actor_id,
  module,
  action,
  ref_table = null,
  ref_id = null,
  details = null,
  ip = null
) {
  await run(
    `INSERT INTO activity_log(actor_id,module,action,ref_table,ref_id,details,ip)
     VALUES (?,?,?,?,?,?,?)`,
    [actor_id, module, action, ref_table, ref_id, details ? JSON.stringify(details) : null, ip]
  )
}
