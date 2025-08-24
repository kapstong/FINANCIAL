export const ok  = (res, data) => res.json({ ok:true, data })
export const bad = (res, error, code=400) => res.status(code).json({ ok:false, error })
export const iso = (d) => new Date(d).toISOString().slice(0,10)
