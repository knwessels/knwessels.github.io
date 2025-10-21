// script.js - small behavior: toggle mobile nav, chat, and booking calendar

// Mobile nav toggle
const toggle = document.querySelectorAll('.menu-toggle');
const navs = document.querySelectorAll('.main-nav');

function toggleNav(e){
  const header = e.target.closest('.site-header');
  if(!header) return;
  const nav = header.querySelector('.main-nav');
  if(!nav) return;
  nav.classList.toggle('open');
  e.target.setAttribute('aria-expanded', nav.classList.contains('open'));
}

toggle.forEach(t=>t.addEventListener('click', toggleNav));

// close nav when clicking outside (for mobile)
document.addEventListener('click', (e)=>{ if(!e.target.closest('.site-header')) navs.forEach(n=>n.classList.remove('open')); });

/* Theme system removed — site uses a single consistent style.
   Keep this file focused on navigation, chat, and booking calendar behavior.
*/

/* Live chat widget (simple local mock with optional webhook) */
(function(){
  const CHAT_KEY = 'brightbash_chat_messages_v1';
  const WEBHOOK = window.CHAT_WEBHOOK || null; // optional global

  function pushMessage(who, text){
    const msgs = loadMessages(); msgs.push({who,text,ts:Date.now()});
    try{ localStorage.setItem(CHAT_KEY, JSON.stringify(msgs)); }catch(e){}
    // notify any listeners (chat UI) that a message arrived
    try{ document.dispatchEvent(new CustomEvent('brightbash:message',{detail:{who,text}})); }catch(e){}
  }
  function loadMessages(){ try{ const r = localStorage.getItem(CHAT_KEY); return r?JSON.parse(r):[] }catch(e){return []} }

  function createChat(){
    const existing = document.querySelector('.chat-widget'); if(existing) return;
  const wrapper = document.createElement('div'); wrapper.className='chat-widget';
  // header uses class 'chat-toggle' so existing CSS applies
  wrapper.innerHTML = `<div class="chat-toggle"><div class="title">Chat with us<span class="badge" style="display:none"></span></div><button class="minimize" aria-label="Minimize chat">─</button></div><div class="chat-body"><div class="messages"></div></div><div class="chat-input"><input placeholder="Type a message..."/><button>Send</button></div>`;
    document.body.appendChild(wrapper);
  const messagesEl = wrapper.querySelector('.messages');
  const input = wrapper.querySelector('.chat-input input');
  const sendBtn = wrapper.querySelector('.chat-input button');
  const header = wrapper.querySelector('.chat-toggle');
  const minBtn = wrapper.querySelector('.minimize');

  const MIN_KEY = 'brightbash_chat_min_v1';
  const UNREAD_KEY = 'brightbash_chat_unread_v1';
  function updateBadge(){ try{ const b = header.querySelector('.badge'); const n = Number(localStorage.getItem(UNREAD_KEY) || '0'); if(!b) return; if(n>0){ b.style.display='inline-block'; b.textContent = n>99 ? '99+' : String(n); } else { b.style.display='none'; b.textContent=''; } }catch(e){} }

  function setMinimized(v){ if(v) wrapper.classList.add('minimized'); else wrapper.classList.remove('minimized'); localStorage.setItem(MIN_KEY, v ? '1' : '0'); if(!v){ /* opened */ localStorage.setItem(UNREAD_KEY,'0'); updateBadge(); } }
    function toggleMin(){ setMinimized(!wrapper.classList.contains('minimized')); }
    // restore saved state
    const saved = localStorage.getItem(MIN_KEY);
    if(saved === '1') setMinimized(true);

  function renderMessages(){ messagesEl.innerHTML = ''; const msgs = loadMessages(); msgs.forEach(m=>{ const p = document.createElement('div'); p.className='msg ' + (m.who==='user'?'user':'bot'); p.textContent = m.text; messagesEl.appendChild(p); }); messagesEl.scrollTop = messagesEl.scrollHeight; }

    async function forwardToWebhook(payload){
      if(!WEBHOOK) return false;
      try{ const res = await fetch(WEBHOOK, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}); return res.ok; }catch(e){return false}
    }

  function mockReply(userText){ setTimeout(()=>{ const reply = `Thanks for your message about "${userText}". We'll get back to you soon!`; pushMessage('bot',reply); renderMessages(); }, 700 + Math.random()*800); }

    sendBtn.addEventListener('click', async ()=>{
      const val = input.value && input.value.trim(); if(!val) return; pushMessage('user', val); input.value=''; renderMessages(); const ok = await forwardToWebhook({text:val,source:'client',url:location.href}); if(!ok) mockReply(val);
    });
    input.addEventListener('keydown', (e)=>{ if(e.key==='Enter'){ e.preventDefault(); sendBtn.click(); } });

    // minimize/open handlers
    minBtn.addEventListener('click', (e)=>{ e.stopPropagation(); toggleMin(); });
    // clicking the minimized header should reopen
    header.addEventListener('click', (e)=>{ if(wrapper.classList.contains('minimized')){ setMinimized(false); } });

    // show persisted unread count
    if(!localStorage.getItem(UNREAD_KEY)) localStorage.setItem(UNREAD_KEY,'0');
    updateBadge();

    // listen for new messages and update unread if minimized
    document.addEventListener('brightbash:message', (ev)=>{
      try{
        const {who} = ev.detail || {};
        renderMessages();
        const isMin = wrapper.classList.contains('minimized');
        if(who === 'bot' && isMin){ const current = Number(localStorage.getItem(UNREAD_KEY)||'0') || 0; localStorage.setItem(UNREAD_KEY, String(current+1)); updateBadge(); }
      }catch(e){}
    });
    renderMessages();
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', createChat); else createChat();
})();

/* Booking calendar
   - persists bookings in localStorage under BRIGHTBASH_BOOKINGS_V1
   - renders month view and marks days busy/free
   - clicking a free day fills the date input in the booking form
   - submitting the booking form saves the booking for the chosen date
*/
(function(){
  const KEY = 'BRIGHTBASH_BOOKINGS_V1';
  const API_ROOT = window.BOOKINGS_API || 'http://localhost:4000';
  let apiAvailable = false;

  async function probeApi(){ try{ const res = await fetch(API_ROOT + '/ping'); if(res.ok){ apiAvailable = true; return true; } }catch(e){} apiAvailable = false; return false; }
  function loadBookingsLocal(){ try{const raw = localStorage.getItem(KEY); return raw?JSON.parse(raw):{}}catch(e){return{}} }
  function saveBookingsLocal(obj){ try{localStorage.setItem(KEY, JSON.stringify(obj))}catch(e){} }
  async function loadBookings(){ if(apiAvailable){ try{ const res = await fetch(API_ROOT + '/bookings'); if(res.ok) return await res.json(); }catch(e){} } return loadBookingsLocal(); }
  async function saveBookings(obj){ if(apiAvailable){ try{ saveBookingsLocal(obj); return true; }catch(e){} } saveBookingsLocal(obj); return true; }
  async function postBookingToServer(entry){ if(!apiAvailable) return {ok:false}; try{ const res = await fetch(API_ROOT + '/bookings', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(entry)}); const json = await res.json().catch(()=>({})); return {ok: res.ok, status: res.status, json}; }catch(e){return {ok:false}} }

  function pad(n){ return String(n).padStart(2,'0'); }
  function getDateKey(d){ return d.getFullYear() + '-' + pad(d.getMonth()+1) + '-' + pad(d.getDate()); }

  async function renderCalendar(container){
    if(!container) return;
    const grid = container.querySelector('.calendar-grid');
    const title = container.querySelector('.cal-title');
    let state = container._calState || {year:(new Date()).getFullYear(), month:(new Date()).getMonth()};

    async function draw(){
      const bookings = await loadBookings(); grid.innerHTML = '';
      const first = new Date(state.year, state.month, 1); const startDay = first.getDay(); const daysInMonth = new Date(state.year, state.month+1,0).getDate();
      const monthName = first.toLocaleString(undefined,{month:'long',year:'numeric'}); title.textContent = monthName;
      const weekDays = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']; weekDays.forEach(w=>{ const h = document.createElement('div'); h.className='day header'; h.textContent = w; grid.appendChild(h); });
      for(let i=0;i<startDay;i++){ const e=document.createElement('div'); e.className='day'; grid.appendChild(e); }
      for(let d=1; d<=daysInMonth; d++){ const date = new Date(state.year, state.month, d); const key = getDateKey(date); const div = document.createElement('div'); div.className = 'day ' + ((bookings[key] && bookings[key].length) ? 'busy' : 'free'); const todayKey = getDateKey(new Date()); if(todayKey === key) div.classList.add('today'); const cellDate = new Date(date.getFullYear(), date.getMonth(), date.getDate()); const today = new Date(); today.setHours(0,0,0,0); if(cellDate < today){ div.classList.add('past'); div.tabIndex = -1; } const dayArr = (bookings[key] && bookings[key].length) ? bookings[key] : []; if(dayArr.length){ const names = dayArr.map(b=>b.organizer || 'booking').slice(0,3).join(', '); div.title = `${dayArr.length} booking(s): ${names}`; } div.textContent = d; div.dataset.date = key; if(!div.classList.contains('past')){ div.addEventListener('click', ()=>{ const dateInput = document.querySelector('#booking-date'); if(dateInput){ dateInput.value = key; dateInput.dispatchEvent(new Event('change')); } }); div.addEventListener('keydown', (e)=>{ if(e.key==='Enter') div.click(); }); } grid.appendChild(div); }
      container._calState = state;
    }

    function prev(){ state.month--; if(state.month<0){state.month=11;state.year--;} draw(); }
    function next(){ state.month++; if(state.month>11){state.month=0;state.year++} draw(); }

    const prevBtn = container.querySelector('.cal-prev'); const nextBtn = container.querySelector('.cal-next');
    if(!container._calInit){ prevBtn.addEventListener('click', prev); nextBtn.addEventListener('click', next); container._calInit = true; }
    draw();
  }

  function init(){
    const cal = document.querySelector('.calendar-box'); if(cal) renderCalendar(cal);
    const form = document.querySelector('#booking-form'); if(!form) return;
    const timeslotsList = document.querySelector('.timeslots-list'); const timeslotsInfo = document.querySelector('.timeslots-info'); const packageSelect = document.querySelector('#package-select'); const dateInputEl = document.querySelector('#booking-date');
    let timeslotInput = form.querySelector('input[name="timeslot"]'); if(!timeslotInput){ timeslotInput = document.createElement('input'); timeslotInput.type='hidden'; timeslotInput.name='timeslot'; form.appendChild(timeslotInput); }
    function getSlotDuration(pkg){ if(!pkg) pkg = packageSelect && packageSelect.value; if(pkg === 'starter') return 2; return 3; }

    async function generateSlots(){ const selectedDate = dateInputEl && dateInputEl.value; timeslotsList.innerHTML = ''; if(!selectedDate){ timeslotsInfo.textContent = 'Select a date to view available times'; return; } const duration = getSlotDuration(); timeslotsInfo.textContent = `Choose a ${duration}-hour slot for ${selectedDate}`; const startHour = 8; const endHour = 17; const slots = []; for(let h=startHour; h<endHour; h+=duration){ const from = `${String(h).padStart(2,'0')}:00`; const toHour = h + duration; if(toHour> endHour) break; const to = `${String(toHour).padStart(2,'0')}:00`; slots.push({from,to}); }
      const bookings = await loadBookings(); const dayBookings = bookings[selectedDate] || [];
      function timesOverlap(aFrom,aTo,bFrom,bTo){ const toMinutes = t=>{ const [hh,mm]=t.split(':').map(Number); return hh*60+mm }; return Math.max(toMinutes(aFrom), toMinutes(bFrom)) < Math.min(toMinutes(aTo), toMinutes(bTo)); }
      slots.forEach(s=>{ const btn = document.createElement('button'); btn.type='button'; btn.className='timeslot'; btn.textContent = `${s.from} — ${s.to}`; btn.dataset.from = s.from; btn.dataset.to = s.to; let disabled = dayBookings.some(b=> timesOverlap(b.timeslot.from, b.timeslot.to, s.from, s.to)); if(disabled){ btn.classList.add('disabled'); } btn.addEventListener('click', ()=>{ if(btn.classList.contains('disabled')) return; timeslotsList.querySelectorAll('.timeslot').forEach(t=>t.classList.remove('selected')); btn.classList.add('selected'); timeslotInput.value = `${s.from}-${s.to}`; }); timeslotsList.appendChild(btn); });
    }

    if(dateInputEl) dateInputEl.addEventListener('change', ()=>generateSlots()); if(packageSelect) packageSelect.addEventListener('change', ()=>generateSlots());
    probeApi().then(()=>{ generateSlots(); });

    form.addEventListener('submit', async (e)=>{
      e.preventDefault(); const fd = new FormData(form); const date = fd.get('date'); if(!date){ alert('Please select a date from the calendar or enter a date.'); return; }
      const bookings = await loadBookings(); const dayBookings = bookings[date] || []; const timeslot = fd.get('timeslot'); if(!timeslot){ alert('Please select a timeslot for your booking.'); return; } const [from,to] = timeslot.split('-'); const overlap = dayBookings.some(b=>{ const aFrom = b.timeslot.from, aTo = b.timeslot.to; const toMinutes = t=>{ const [hh,mm]=t.split(':').map(Number); return hh*60+mm }; return Math.max(toMinutes(aFrom), toMinutes(from)) < Math.min(toMinutes(aTo), toMinutes(to)); }); if(overlap){ alert('Sorry, that timeslot has just been taken. Please choose another.'); return; }
      const bookingEntry = {date,organizer:fd.get('organizer'), contact:fd.get('contact'), kids:fd.get('kids'), package:fd.get('package'), created:Date.now(), timeslot:{from,to}};
      if(apiAvailable){ const res = await postBookingToServer(bookingEntry); if(res.ok){ /* server accepted */ } else if(res.status === 409){ alert('Sorry, that timeslot was taken on the server. Please choose another.'); return; } }
      const bookingsLocal = await loadBookings(); const dayArr = bookingsLocal[date] || []; dayArr.push({organizer:bookingEntry.organizer, contact:bookingEntry.contact, kids:bookingEntry.kids, package:bookingEntry.package, created:bookingEntry.created, timeslot:{from,to}}); bookingsLocal[date] = dayArr; await saveBookings(bookingsLocal); alert('Thanks! Your booking request for ' + date + ' was recorded. We will contact you.'); const cal = document.querySelector('.calendar-box'); if(cal) renderCalendar(cal); generateSlots();
    });
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();

  /* Enhanced lightbox: uses data-full for hi-res, shows spinner, fade-in, and preloads neighbors */
  (function(){
    const triggers = Array.from(document.querySelectorAll('[data-lightbox-index]'));
    if(!triggers.length) return;

    // build overlay with spinner placeholder
    const overlay = document.createElement('div'); overlay.className = 'lb-overlay'; overlay.innerHTML = `
      <div class="lb-controls">
        <button class="lb-prev" aria-label="Previous">‹</button>
        <button class="lb-next" aria-label="Next">›</button>
        <button class="lb-close" aria-label="Close">✕</button>
      </div>
      <div class="lb-frame">
        <div class="lb-spinner" aria-hidden="true"></div>
        <img class="lb-image" src="" alt="" />
        <div class="lb-caption"></div>
      </div>`;
    document.body.appendChild(overlay);

    const lbImage = overlay.querySelector('.lb-image');
    const lbCaption = overlay.querySelector('.lb-caption');
    const spinner = overlay.querySelector('.lb-spinner');
    const btnClose = overlay.querySelector('.lb-close');
    const btnNext = overlay.querySelector('.lb-next');
    const btnPrev = overlay.querySelector('.lb-prev');

    let current = 0;

    function getFullUrl(trigger){ return trigger.dataset.full || trigger.querySelector('img')?.src; }

    function setLoading(on){ if(on){ spinner.style.display='block'; lbImage.classList.remove('loaded'); } else { spinner.style.display='none'; lbImage.classList.add('loaded'); } }

    function loadImage(url){ return new Promise((res,rej)=>{ const img = new Image(); img.onload = ()=>res(img); img.onerror = rej; img.src = url; }); }

    async function show(idx){
      current = idx;
      const trigger = triggers[current];
      const full = getFullUrl(trigger);
      const caption = trigger.closest('.thumb')?.querySelector('.caption')?.textContent || trigger.querySelector('img')?.alt || '';
      overlay.classList.add('open');
      document.body.style.overflow = 'hidden';
      setLoading(true);
      lbImage.src = ''; lbImage.alt = '';
      try{
        await loadImage(full);
        lbImage.src = full;
        lbImage.alt = caption || '';
        lbCaption.textContent = caption;
        setLoading(false);
        preloadNeighbor((current+1) % triggers.length);
        preloadNeighbor((current-1+triggers.length) % triggers.length);
      }catch(e){
        setLoading(false);
        lbCaption.textContent = 'Image failed to load.';
      }
    }

    function close(){ overlay.classList.remove('open'); document.body.style.overflow = ''; lbImage.classList.remove('loaded'); }
    function next(){ show((current + 1) % triggers.length); }
    function prev(){ show((current - 1 + triggers.length) % triggers.length); }

    function preloadNeighbor(idx){ const t = triggers[idx]; if(!t) return; const url = getFullUrl(t); const img = new Image(); img.src = url; }

    triggers.forEach((t,i)=>{ t.addEventListener('click', (e)=>{ e.preventDefault(); show(i); }); });
    btnClose.addEventListener('click', close);
    btnNext.addEventListener('click', (e)=>{ e.stopPropagation(); next(); });
    btnPrev.addEventListener('click', (e)=>{ e.stopPropagation(); prev(); });
    overlay.addEventListener('click', (e)=>{ if(e.target === overlay) close(); });
    document.addEventListener('keydown', (e)=>{ if(!overlay.classList.contains('open')) return; if(e.key === 'Escape') close(); if(e.key === 'ArrowRight') next(); if(e.key === 'ArrowLeft') prev(); });
  })();

  // script.js
const menuToggle = document.querySelector('.menu-toggle');
const nav = document.querySelector('.main-nav');

menuToggle.addEventListener('click', () => {
  nav.classList.toggle('nav-open');
});
