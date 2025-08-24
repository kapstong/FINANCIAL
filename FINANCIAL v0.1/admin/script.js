 /* ---------- Tiny DOM helpers (needed everywhere) ---------- */
    const $  = (sel, root=document)=>root.querySelector(sel);
    const $$ = (sel, root=document)=>Array.from(root.querySelectorAll(sel));

    /* ---------- Loader + Toast (missing before) ---------- */
    const Loader = (() => {
      const el = $('#globalLoader'); let on=false, t0=0; const MIN=450;
      function show(){ if(on) return; on=true; t0=performance.now(); el.classList.remove('hidden'); el.classList.add('flex'); }
      function hide(){ if(!on) return; const d=Math.max(0, MIN-(performance.now()-t0)); setTimeout(()=>{ el.classList.add('hidden'); el.classList.remove('flex'); on=false; }, d); }
      async function wrap(job){ show(); try{ return typeof job==='function'? await job() : await job; } finally{ hide(); } }
      return { show, hide, wrap };
    })();

    function toast(msg, type='info'){
      const host=$('#toast'); host.classList.remove('hidden');
      const el=document.createElement('div'); el.className='toast-card mb-2';
      const colors={info:'text-slate-700',success:'text-emerald-700',error:'text-red-700',warn:'text-amber-700'};
      el.innerHTML=`<div class="${colors[type]||colors.info}">${msg}</div>`;
      host.appendChild(el);
      setTimeout(()=>el.remove(), 2200);
      setTimeout(()=>{ if(!host.hasChildNodes()) host.classList.add('hidden'); }, 2400);
    }

    /* ---------- Profile dropdown & basic layout wiring ---------- */
    const overlay = $('#overlay'), sidebar=$('#sidebar');
    const openSidebarBtn = $('#openSidebar'), darkModeToggle = $('#darkModeToggle');
    const profileBtn = $('#profileBtn'), profileMenu = $('#profileMenu');

    function openMenu(){ sidebar.classList.remove('-translate-x-full'); overlay.classList.add('active'); }
    function closeMenu(){ sidebar.classList.add('-translate-x-full'); overlay.classList.remove('active'); }
    openSidebarBtn.addEventListener('click', openMenu);
    overlay.addEventListener('click', closeMenu);

    profileBtn.addEventListener('click', ()=> profileMenu.classList.toggle('hidden'));
    document.addEventListener('click', (e)=>{
      if(!profileBtn.contains(e.target) && !profileMenu.contains(e.target)) profileMenu.classList.add('hidden');
    });

    darkModeToggle.addEventListener('click', ()=>{
      document.documentElement.classList.toggle('dark');
      document.body.classList.toggle('bg-soft');
      toast('Theme toggled');
    });

    /* ---------- Live date/time (desktop + mobile) ---------- */
    (() => {
      const elTime = $('#liveTime');
      const elDate = $('#liveDate');
      const mTime  = $('#liveTimeMobile');
      const mDate  = $('#liveDateMobile');

      let is24 = localStorage.getItem('fmt24') === '1';

      function fmtDate(d) {
        return new Intl.DateTimeFormat(undefined, { year:'numeric', month:'short', day:'2-digit', weekday:'short' }).format(d);
      }
      function fmtTime(d) {
        return new Intl.DateTimeFormat(undefined, { hour:'2-digit', minute:'2-digit', second:'2-digit', hour12: !is24 }).format(d);
      }
      function tick(){
        const now = new Date();
        const dt = fmtDate(now);
        const tm = fmtTime(now);
        if (elDate) elDate.textContent = dt;
        if (elTime) elTime.textContent = tm;
        if (mDate)  mDate.textContent  = dt;
        if (mTime)  mTime.textContent  = tm;
      }
      elTime?.addEventListener('click', ()=>{ is24=!is24; localStorage.setItem('fmt24', is24?'1':'0'); tick(); });
      tick(); setInterval(tick, 1000);
      $('#clockWrap')?.classList.remove('hidden');
      document.addEventListener('visibilitychange', ()=>{ if(!document.hidden) tick(); });
    })();

    /* ---------- Context Tabs + Views ---------- */
    const contextBar=$('#contextBar'), contextTitle=$('#contextTitle'), contextTabs=$('#contextTabs');
    const viewDash=$('#dashboardHome'), viewHost=$('#contentHost');

    const MODULE_TABS = {
      'General Ledger': [
        { id:'gl-je', label:'Journal Entries' },
        { id:'gl-tb', label:'Trial Balance' },
        { id:'gl-ledger', label:'Ledger Report' },
      ],
      'Accounts Receivable': [
        { id:'ar-open', label:'Open Invoices' },
        { id:'ar-pay',  label:'Payment History' },
      ],
      'Collections': [
        { id:'col-sum', label:'Collection Summary' },
        { id:'col-past',label:'Past Due List' },
      ],
      'Accounts Payable': [
        { id:'ap-open', label:'Open Bills' },
        { id:'ap-sched',label:'Payment Schedule' },
      ],
      'Disbursement': [
        { id:'disb-rec', label:'Disbursement Records' },
        { id:'disb-fund',label:'Fund Transfers' },
      ],
      'Budget Management': [
        { id:'bud-cur', label:'Current Budget' },
        { id:'bud-var', label:'Budget Variance' },
      ],
      'Reports': [
        { id:'rpt-fs', label:'Financial Statement' },
        { id:'rpt-custom', label:'Custom Reports' },
      ],
    };

    function showDashboard(){ viewHost.classList.add('hidden'); viewDash.classList.remove('hidden'); }

    function renderTabs(module, activeId=null){
      const tabs = MODULE_TABS[module];
      if(!tabs){ contextBar.classList.add('hidden'); showDashboard(); return; }
      contextTitle.textContent = module;
      contextTabs.innerHTML = '';
      tabs.forEach(t=>{
        const b=document.createElement('button');
        b.className='tab-pill'+(activeId===t.id?' active':'');
        b.dataset.tab=t.id; b.textContent=t.label;
        b.addEventListener('click', async ()=>{
          contextTabs.querySelectorAll('.tab-pill').forEach(x=>x.classList.remove('active'));
          b.classList.add('active');
          await Loader.wrap(new Promise(r=>setTimeout(r,300)));
          showView(module, t.id, t.label);
        });
        contextTabs.appendChild(b);
      });
      contextBar.classList.remove('hidden');
    }

    function showView(module, tabId, tabLabel){
      viewDash.classList.add('hidden'); viewHost.classList.remove('hidden');
      viewHost.innerHTML = `
        <div class="card p-5">
          <div class="flex items-center justify-between">
            <div>
              <div class="text-xs uppercase tracking-wide text-[var(--muted)]">${module}</div>
              <h2 class="text-xl font-bold">${tabLabel||'Overview'}</h2>
            </div>
            <div class="flex gap-2">
              <button class="btn btn-soft" data-open="mAddJE">+ Add</button>
              <button class="btn btn-brand" id="btnExport">Export</button>
            </div>
          </div>

          <div class="mt-4 border-t border-[var(--ring)] pt-4">
            <div class="overflow-x-auto">
              <table class="min-w-full text-sm">
                <thead class="bg-orange-50">
                  <tr>
                    <th class="text-left px-3 py-2">Date</th>
                    <th class="text-left px-3 py-2">Reference</th>
                    <th class="text-left px-3 py-2">Description</th>
                    <th class="text-left px-3 py-2">Amount</th>
                    <th class="text-left px-3 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody id="gridBody">
                  <tr class="border-t">
                    <td class="px-3 py-2">2025-08-01</td>
                    <td class="px-3 py-2">#0001</td>
                    <td class="px-3 py-2">Sample for <b>${tabLabel||''}</b></td>
                    <td class="px-3 py-2">$1,000.00</td>
                    <td class="px-3 py-2">
                      <button class="text-[var(--brand)] font-semibold hover:underline" data-open="mViewRow">View</button>
                      <button class="ml-3 text-slate-600 hover:underline" data-open="mEditRow">Edit</button>
                      <button class="ml-3 text-red-600 hover:underline" data-open="mDelRow">Delete</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="mt-5 grid grid-cols-1 md:grid-cols-2 gap-5">
              <div class="card p-4">
                <div class="font-semibold mb-2">Insight</div>
                <p class="text-sm text-slate-600">Replace with KPIs/charts for <b>${tabLabel||module}</b>.</p>
              </div>
              <div class="card p-4">
                <div class="font-semibold mb-2">Notes</div>
                <p class="text-sm text-slate-600">This is a placeholder area. The loader wraps all actions.</p>
              </div>
            </div>
          </div>
        </div>
      `;

      // Safe (no optional chaining) template resets
      let old = document.getElementById('tpl-mViewRow'); if (old) old.remove();
      const t1=document.createElement('template'); t1.id='tpl-mViewRow';
      t1.innerHTML=`<p>Viewing <b>${tabLabel}</b> row #0001 — replace with real fields.</p>`; document.body.appendChild(t1);

      old = document.getElementById('tpl-mEditRow'); if (old) old.remove();
      const t2=document.createElement('template'); t2.id='tpl-mEditRow';
      t2.innerHTML=`<form class="grid gap-3">
        <label class="text-sm">Description<input value="${tabLabel} item" class="w-full mt-1 border rounded px-2 py-1"/></label>
        <label class="text-sm">Amount<input type="number" step="0.01" value="1000" class="w-full mt-1 border rounded px-2 py-1"/></label>
      </form>`; document.body.appendChild(t2);

      old = document.getElementById('tpl-mDelRow'); if (old) old.remove();
      const t3=document.createElement('template'); t3.id='tpl-mDelRow';
      t3.innerHTML=`<p>Delete this record? This action cannot be undone.</p>`; document.body.appendChild(t3);

      $('#btnExport')?.addEventListener('click', async ()=>{
        await Loader.wrap(new Promise(r=>setTimeout(r,500)));
        toast('Exported CSV','success');
      });
    }

    // Sidebar clicks -> show tabs in top bar (no sidebar toggles)
    $$('.sidebar-item').forEach(btn=>{
      btn.addEventListener('click', async ()=>{
        $$('.sidebar-item').forEach(b=>b.classList.remove('active'));
        btn.classList.add('active');

        const module = btn.getAttribute('data-module');
        if(module==='Dashboard'){
          await Loader.wrap(new Promise(r=>setTimeout(r,250)));
          contextBar.classList.add('hidden'); showDashboard(); closeMenu(); return;
        }
        await Loader.wrap(new Promise(r=>setTimeout(r,300)));
        renderTabs(module);
        const first = MODULE_TABS[module] && MODULE_TABS[module][0];
        if(first){
          contextTabs.querySelectorAll('.tab-pill').forEach(x=>x.classList.remove('active'));
          const firstBtn = contextTabs.querySelector(`[data-tab="${first.id}"]`);
          if (firstBtn) firstBtn.classList.add('active');
          showView(module, first.id, first.label);
        }
        closeMenu();
      });
    });
