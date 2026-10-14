'use strict';
// The public site must never read private CRM localStorage or display unapproved listings.
// Replace this empty feed with a server endpoint that returns only published listings.
const publishedListings=[];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const grid=document.getElementById('properties');const empty=document.getElementById('empty');
function render(){const q=document.getElementById('search').value.trim().toLowerCase();const budget=Number(document.getElementById('budget').value)||Infinity;const rooms=Number(document.getElementById('rooms').value)||0;const rows=publishedListings.filter(p=>`${p.title} ${p.city} ${p.address}`.toLowerCase().includes(q)&&Number(p.price)<=budget&&Number(p.rooms)>=rooms);document.getElementById('count').textContent=`${rows.length} объектов`;empty.hidden=rows.length>0;grid.innerHTML=rows.map(p=>`<article class="property"><div class="property-photo">${p.image?`<img loading="lazy" src="${esc(p.image)}" alt="${esc(p.title)}">`:''}</div><div class="property-info"><span>${esc(p.city)} · ${esc(p.rooms)} комн.</span><h3>${esc(p.title)}</h3><div class="property-bottom"><strong>₪${Number(p.price).toLocaleString('en-US')}</strong><span>Подробнее ↗</span></div></div></article>`).join('')}
for(const id of ['search','budget','rooms'])document.getElementById(id).addEventListener(id==='search'?'input':'change',render);document.getElementById('year').textContent=new Date().getFullYear();render();
