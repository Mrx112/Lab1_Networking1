/* HomeCloud Link — mesin simulasi + UI. Tanpa dependensi. */
(() => {
  const { zones, nodes, links, configs, explain, tests } = window.NET;
  const $ = (s, r = document) => r.querySelector(s);
  const byId = Object.fromEntries(nodes.map(n => [n.id, n]));
  const L2 = new Set(['switch', 'ap', 'cloud']);
  const state = { antennaDown: false, speed: 1, selected: null, busy: false, attack: null };

  // ---------------- IP utils ----------------
  const ip2int = ip => ip.split('.').reduce((a, o) => (a << 8) + (+o), 0) >>> 0;
  const maskInt = bits => bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
  const inNet = (ip, net, bits) => ((ip2int(ip) & maskInt(bits)) >>> 0) === ((ip2int(net) & maskInt(bits)) >>> 0);
  const bits2mask = b => [24, 16, 8, 0].map(s => (maskInt(b) >>> s) & 255).join('.');
  const nodeByIp = ip => nodes.find(n => n.ip === ip) || nodes.find(n => n.ifaces && Object.values(n.ifaces).some(i => i.ip === ip));
  const ifaceFor = (r, ip) => Object.entries(r.ifaces || {}).find(([, i]) => inNet(ip, i.ip, i.mask));
  const phys = name => name.split('.')[0];

  // adjacency
  const adj = {};
  nodes.forEach(n => (adj[n.id] = []));
  links.forEach(l => {
    adj[l.a].push({ link: l, other: l.b, my: l.ai, their: l.bi });
    adj[l.b].push({ link: l, other: l.a, my: l.bi, their: l.ai });
  });
  const linkUp = l => !(l.kind === 'antenna' && state.antennaDown);

  // ---------------- routing engine ----------------
  function l2path(from, pred, viaIface) {
    const prev = { [from]: null }, ifaceIn = {};
    const q = [from];
    while (q.length) {
      const cur = q.shift();
      for (const e of adj[cur]) {
        if (!linkUp(e.link)) continue;
        if (cur === from && viaIface && phys(e.my) !== phys(viaIface)) continue;
        if (e.other in prev) continue;
        prev[e.other] = cur; ifaceIn[e.other] = e.their;
        if (pred(byId[e.other])) {
          const path = [e.other];
          let p = cur; while (p !== null) { path.unshift(p); p = prev[p]; }
          return { path, ingress: e.their };
        }
        if (L2.has(byId[e.other].type)) q.push(e.other);
      }
    }
    return null;
  }

  const l2hops = (path, hops, vlan) => {
    path.slice(1, -1).forEach(id => {
      const n = byId[id];
      hops.push({ id, type: 'info', title: n.name, text: n.type === 'switch' ? `Switch meneruskan frame ${vlan ? 'di VLAN ' + vlan : '(tabel MAC)'}` : n.type === 'ap' ? 'Access point meneruskan lewat WiFi' : 'Transit jaringan publik' });
    });
  };

  function aclCheck(router, iface, srcIp, hops) {
    const i = router.ifaces?.[iface];
    if (!i?.aclIn) return true;
    const acl = router.acls[i.aclIn];
    for (let k = 0; k < acl.length; k++) {
      const e = acl[k];
      if (inNet(srcIp, e.src, e.wild)) {
        const ok = e.action === 'permit';
        hops.push({ id: router.id, type: ok ? 'ok' : 'bad', title: `${router.name} — ACL ${i.aclIn} (${iface} in)`, text: `Baris ${(k + 1) * 10}: ${e.action} ${e.src === '0.0.0.0' ? 'any' : e.src + (e.wild === 32 ? '' : '/' + e.wild)} → ${ok ? 'diizinkan' : 'PAKET DIBUANG'} · ${e.note}` });
        return ok;
      }
    }
    hops.push({ id: router.id, type: 'bad', title: `${router.name} — ACL ${i.aclIn}`, text: 'Implicit deny → paket dibuang' });
    return false;
  }

  function computePath(srcId, dstIp, opt = {}) {
    const src = byId[srcId];
    const hops = [], path = [srcId];
    let srcIp = opt.srcIp || src.ip;
    let cur, ingress = null;

    if (src.type === 'router') {
      cur = src; srcIp = srcIp || Object.values(src.ifaces)[0].ip;
    } else {
      if (inNet(dstIp, src.ip, src.mask)) {
        const r = l2path(srcId, n => n.ip === dstIp || (n.ifaces && Object.values(n.ifaces).some(i => i.ip === dstIp)));
        if (!r) return { ok: false, hops: [...hops, { id: srcId, type: 'bad', title: src.name, text: 'Tujuan satu subnet tapi tidak ada jalur L2' }], path };
        hops.push({ id: srcId, type: 'info', title: src.name, text: `${dstIp} satu subnet → ARP lalu kirim langsung` });
        l2hops(r.path, hops, src.vlan);
        path.push(...r.path.slice(1));
        hops.push({ id: r.path.at(-1), type: 'ok', title: byId[r.path.at(-1)].name, text: 'Paket diterima' });
        return { ok: true, hops, path };
      }
      const gwId = nodes.find(n => n.ifaces && Object.values(n.ifaces).some(i => i.ip === src.gw))?.id;
      const r = gwId && l2path(srcId, n => n.id === gwId);
      if (!r) return { ok: false, hops: [{ id: srcId, type: 'bad', title: src.name, text: `Gateway ${src.gw} tidak terjangkau` }], path };
      hops.push({ id: srcId, type: 'info', title: src.name, text: `${dstIp} beda subnet → kirim ke gateway ${src.gw}` });
      l2hops(r.path, hops, src.vlan);
      path.push(...r.path.slice(1));
      cur = byId[gwId]; ingress = r.ingress;
    }

    for (let guard = 0; guard < 8; guard++) {
      if (ingress) {
        const key = Object.keys(cur.ifaces).find(k => k === ingress) || Object.keys(cur.ifaces).find(k => phys(k) === phys(ingress));
        if (!aclCheck(cur, key, srcIp, hops)) return { ok: false, hops, path, dropAt: cur.id };
      }
      const conn = ifaceFor(cur, dstIp);
      if (conn) {
        const [ifName, i] = conn;
        if (i.ip === dstIp) { hops.push({ id: cur.id, type: 'ok', title: cur.name, text: `Tujuan adalah interface ${ifName} router ini → dijawab` }); return { ok: true, hops, path }; }
        const r = l2path(cur.id, n => n.ip === dstIp || (n.ifaces && Object.values(n.ifaces).some(i => i.ip === dstIp)), ifName);
        if (!r) { hops.push({ id: cur.id, type: 'bad', title: cur.name, text: `Directly connected ${ifName}, tapi ${dstIp} tidak menjawab ARP` }); return { ok: false, hops, path, dropAt: cur.id }; }
        hops.push({ id: cur.id, type: 'ok', title: cur.name, text: `Directly connected via ${ifName} (${i.ip}/${i.mask}) → ARP ke ${dstIp}` });
        l2hops(r.path, hops, byId[r.path.at(-1)].vlan);
        path.push(...r.path.slice(1));
        hops.push({ id: r.path.at(-1), type: 'ok', title: byId[r.path.at(-1)].name, text: 'Paket diterima' });
        return { ok: true, hops, path };
      }
      const cands = (cur.routes || []).filter(rt => inNet(dstIp, rt.net, rt.mask)).sort((a, b) => b.mask - a.mask || a.ad - b.ad);
      let chosen = null, skipped = null;
      for (const rt of cands) {
        if (chosen && rt.mask < chosen.mask) break;
        const f = ifaceFor(cur, rt.via); if (!f) continue;
        const e = adj[cur.id].find(x => phys(x.my) === phys(f[0]) && byId[x.other].type === 'router' && Object.values(byId[x.other].ifaces).some(i => i.ip === rt.via));
        if (e && linkUp(e.link)) { chosen = { rt, e, ifName: f[0] }; break; }
        skipped = rt;
      }
      if (!chosen) { hops.push({ id: cur.id, type: 'bad', title: cur.name, text: `Tidak ada route ke ${dstIp} → paket dibuang` }); return { ok: false, hops, path, dropAt: cur.id }; }
      if (skipped) hops.push({ id: cur.id, type: 'warn', title: cur.name, text: `Jalur utama via ${skipped.via} (AD ${skipped.ad}) DOWN → pakai floating static` });
      const { rt, e, ifName } = chosen;
      hops.push({ id: cur.id, type: 'info', title: cur.name, text: `Route ${rt.net}/${rt.mask} via ${rt.via} [AD ${rt.ad}] keluar ${ifName}` });
      path.push(e.other); cur = byId[e.other]; ingress = e.their;
    }
    return { ok: false, hops: [...hops, { id: cur.id, type: 'bad', title: cur.name, text: 'TTL habis (loop routing)' }], path };
  }

  // ---------------- SVG render ----------------
  const svg = $('#topo');
  const NS = 'http://www.w3.org/2000/svg';
  const el = (tag, attrs = {}, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; };
  const GLYPH = {
    router: 'M0,0 m-12,0 a12,12 0 1 0 24,0 a12,12 0 1 0 -24,0 M-6,-3 H6 M2,-7 L6,-3 L2,1 M6,3 H-6 M-2,-1 L-6,3 L-2,7',
    switch: 'M-12,-7 h24 v14 h-24 z M-8,-2 h7 M-4,-5 l3,3 -3,3 M8,2 h-7 M4,-1 l-3,3 3,3',
    ap: 'M0,8 v-7 M-9,6 h18 M-8,-2 a8,8 0 0 1 16,0 M-4,-2 a4,4 0 0 1 8,0',
    cloud: 'M-10,5 a5,5 0 0 1 0,-10 a7,7 0 0 1 13,-3 a5,5 0 0 1 7,8 a4,4 0 0 1 -2,5 z',
    server: 'M-8,-11 h16 v22 h-16 z M-8,-4 h16 M-8,3 h16 M-5,-8 h2 M-5,0 h2 M-5,7 h2',
    pc: 'M-11,-9 h22 v13 h-22 z M-5,9 h10 M0,4 v5',
    laptop: 'M-9,-8 h18 v11 h-18 z M-13,7 h26',
    printer: 'M-6,-10 h12 v5 h-12 z M-11,-5 h22 v10 h-22 z M-6,5 h12 v5 h-12 z',
    solar: 'M-12,-8 h24 v16 h-24 z M-12,0 h24 M-4,-8 v16 M4,-8 v16',
    attacker: 'M-7,-4 a7,7 0 0 1 14,0 v6 h-14 z M-3.5,-3 a1.5,1.5 0 1 0 .1,0 M3.5,-3 a1.5,1.5 0 1 0 .1,0 M-4,6 v3 M0,6 v3 M4,6 v3',
  };
  const gZones = el('g', { class: 'zones' }, svg), gLinks = el('g', {}, svg), gLabels = el('g', {}, svg), gNodes = el('g', {}, svg), gPk = el('g', { id: 'packets' }, svg);
  zones.forEach(z => {
    const g = el('g', { class: 'zone', style: `--zone-fill: var(--zone-${z.id === 'wh' ? 'wh' : z.id})` }, gZones);
    el('rect', { x: z.x, y: z.y, width: z.w, height: z.h }, g);
    el('text', { x: z.x + 12, y: z.y + 18 }, g).textContent = z.label;
  });
  const linkEls = new Map();
  links.forEach(l => {
    const a = byId[l.a], b = byId[l.b];
    const p = el('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y, class: `link ${l.kind}` }, gLinks);
    linkEls.set(l, p);
    if (l.label) {
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      el('text', { x: mx, y: my - 6, class: 'link-label', 'text-anchor': 'middle' }, gLabels).textContent = l.label;
    }
  });
  const nodeEls = {};
  nodes.forEach(n => {
    const g = el('g', { class: `node ${n.type}`, transform: `translate(${n.x},${n.y})`, tabindex: 0, role: 'button', 'aria-label': n.name }, gNodes);
    el('rect', { x: -28, y: -20, width: 56, height: 40, class: 'body' }, g);
    el('path', { d: GLYPH[n.type], class: 'glyph' }, g);
    // nama panjang dipecah dua baris supaya label host yang berdekatan tidak saling tumpang
    const words = n.name.split(' ');
    const lines = n.name.length > 12 && words.length > 1 ? [words.slice(0, Math.ceil(words.length / 2)).join(' '), words.slice(Math.ceil(words.length / 2)).join(' ')] : [n.name];
    const nameEl = el('text', { y: 33, class: 'name' }, g);
    lines.forEach((t, i) => { const ts = el('tspan', { x: 0, dy: i ? 11 : 0 }, nameEl); ts.textContent = t; });
    const ipTxt = n.ip || (n.type === 'router' ? Object.values(n.ifaces)[0].ip + ' …' : n.mgmt || '');
    if (ipTxt) el('text', { y: 33 + lines.length * 11, class: 'ip' }, g).textContent = ipTxt;
    g.addEventListener('click', () => selectNode(n.id));
    g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectNode(n.id); } });
    nodeEls[n.id] = g;
  });

  function selectNode(id) {
    state.selected = id;
    Object.values(nodeEls).forEach(g => g.classList.remove('selected'));
    nodeEls[id].classList.add('selected');
    const n = byId[id];
    if (configs[id]) { $('#cfg-dev').value = id; showTab('cfg'); showConfig(id); }
    else { $('#src').value = id; showTab('sim'); }
    addLog('info', `${n.name} dipilih${n.ip ? ' · ' + n.ip : ''}`);
  }

  function refreshLinks() {
    links.forEach(l => linkEls.get(l).classList.toggle('down', !linkUp(l)));
    $('#chip-antenna').classList.toggle('down', state.antennaDown);
  }

  // ---------------- animation ----------------
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function findLink(a, b) { return links.find(l => (l.a === a && l.b === b) || (l.a === b && l.b === a)); }

  async function animatePacket(path, cls = '') {
    if (path.length < 2) return;
    const c = el('circle', { r: 5, class: `packet ${cls}` }, gPk);
    for (let i = 0; i < path.length - 1; i++) {
      const A = byId[path[i]], B = byId[path[i + 1]], lk = findLink(path[i], path[i + 1]);
      const le = lk && linkEls.get(lk); le && le.classList.add('active');
      const dur = reduced ? 0 : (lk && (lk.kind === 'antenna' || lk.kind === 'public') ? 650 : 380) / state.speed;
      await new Promise(res => {
        const t0 = performance.now();
        const step = t => {
          const k = dur ? Math.min(1, (t - t0) / dur) : 1, e = k < .5 ? 2 * k * k : -1 + (4 - 2 * k) * k;
          c.setAttribute('cx', A.x + (B.x - A.x) * e); c.setAttribute('cy', A.y + (B.y - A.y) * e);
          k < 1 ? requestAnimationFrame(step) : res();
        };
        requestAnimationFrame(step);
      });
      le && le.classList.remove('active');
      flash(path[i + 1], cls === 'dropped' && i === path.length - 2 ? 'dropped' : 'hit');
    }
    c.remove();
  }
  function flash(id, cl) { const g = nodeEls[id]; g.classList.add(cl); setTimeout(() => g.classList.remove(cl), 500); }
  function xmark(id) {
    const n = byId[id]; const g = el('g', { class: 'xmark', transform: `translate(${n.x + 22},${n.y - 22})` }, gPk);
    el('line', { x1: -5, y1: -5, x2: 5, y2: 5 }, g); el('line', { x1: 5, y1: -5, x2: -5, y2: 5 }, g);
    setTimeout(() => g.remove(), 900);
  }

  // ---------------- log ----------------
  const logEl = $('#log');
  const ts = () => new Date().toLocaleTimeString('id-ID', { hour12: false });
  function addLog(type, text) {
    const r = document.createElement('div'); r.className = 'row';
    r.innerHTML = `<span class="t">${ts()}</span><span class="${type}">${text}</span>`;
    logEl.prepend(r); while (logEl.children.length > 80) logEl.lastChild.remove();
  }
  $('#log-clear').onclick = () => (logEl.innerHTML = '');

  // ---------------- tabs ----------------
  const TABS = ['sim', 'cfg', 'test', 'guard'];
  function showTab(t) {
    TABS.forEach(k => { $(`#tab-${k}`).setAttribute('aria-selected', String(k === t)); $(`#p-${k}`).hidden = k !== t; });
  }
  TABS.forEach(k => ($(`#tab-${k}`).onclick = () => showTab(k)));

  // ---------------- Simulasi ----------------
  const hosts = nodes.filter(n => n.ip);
  const srcSel = $('#src'), dstSel = $('#dst');
  const opt = (v, t) => { const o = document.createElement('option'); o.value = v; o.textContent = t; return o; };
  hosts.forEach(n => srcSel.appendChild(opt(n.id, `${n.name} · ${n.ip}`)));
  nodes.filter(n => n.type === 'router').forEach(n => srcSel.appendChild(opt(n.id, `${n.name} (router)`)));
  const dstTargets = [...hosts.filter(n => n.type !== 'attacker').map(n => [n.ip, `${n.name} · ${n.ip}`]),
    ...nodes.filter(n => n.type === 'router').flatMap(n => Object.entries(n.ifaces).map(([k, i]) => [i.ip, `${n.name} ${k} · ${i.ip}`]))];
  dstTargets.forEach(([v, t]) => dstSel.appendChild(opt(v, t)));
  srcSel.value = 'adm'; dstSel.value = '192.168.120.11';
  $('#antenna-down').onchange = e => { state.antennaDown = e.target.checked; refreshLinks(); addLog(state.antennaDown ? 'warn' : 'ok', state.antennaDown ? 'Antena PtP DOWN — R-HomeCloud & R-Warehouse beralih ke floating static via ISP' : 'Antena PtP UP — jalur utama kembali aktif'); };
  $('#speed').oninput = e => (state.speed = +e.target.value);

  function renderHops(hops) {
    $('#hops').innerHTML = hops.map((h, i) => `<div class="hop ${h.type}"><span class="n">${String(i + 1).padStart(2, '0')}</span><div><b>${h.title}</b>${h.text}</div></div>`).join('');
  }
  function setResult(ok, text) { const r = $('#sim-result'); r.className = `result ${ok ? 'ok' : 'bad'}`; r.textContent = text; }

  async function ping(srcId, dstIp, { animate = true, silent = false } = {}) {
    const src = byId[srcId];
    const fwd = computePath(srcId, dstIp);
    if (!silent) { renderHops(fwd.hops); addLog('info', `${src.name} → ping ${dstIp}${state.antennaDown ? ' (antena down)' : ''}`); }
    if (animate) await animatePacket(fwd.path, fwd.ok ? '' : 'dropped');
    if (!fwd.ok) {
      if (animate && fwd.dropAt) xmark(fwd.dropAt);
      if (!silent) { setResult(false, `Request timed out — dibuang di ${byId[fwd.dropAt || fwd.path.at(-1)].name}`); addLog('bad', `✖ ${src.name} → ${dstIp}: dibuang di ${byId[fwd.dropAt || fwd.path.at(-1)].name}`); }
      return { ok: false, fwd };
    }
    const dstNode = byId[fwd.path.at(-1)];
    const back = computePath(dstNode.id, src.ip || Object.values(src.ifaces)[0].ip, { srcIp: dstIp });
    const hops = [...fwd.hops, { id: dstNode.id, type: 'info', title: `${dstNode.name} — echo reply`, text: `Balasan ICMP ke ${src.ip || 'router'}` }, ...back.hops.slice(1)];
    if (!silent) renderHops(hops);
    if (animate) await animatePacket(back.path, back.ok ? 'reply' : 'dropped');
    const ok = back.ok;
    if (!silent) {
      setResult(ok, ok ? `Reply from ${dstIp}: ${fwd.path.length - 1} hop · TTL ${255 - fwd.hops.filter(h => byId[h.id].type === 'router').length}` : 'Balasan dibuang di tengah jalan');
      addLog(ok ? 'ok' : 'bad', `${ok ? '✔' : '✖'} ${src.name} → ${dstIp}: ${ok ? 'reply OK' : 'balasan dibuang'} (${fwd.path.length - 1} hop)`);
    }
    return { ok, fwd, back };
  }
  async function runSim(animate) {
    if (state.busy) return; state.busy = true; $('#btn-ping').disabled = true;
    try { await ping(srcSel.value, dstSel.value, { animate }); } finally { state.busy = false; $('#btn-ping').disabled = false; }
  }
  $('#btn-ping').onclick = () => runSim(true);
  $('#btn-trace').onclick = () => runSim(false);

  // ---------------- Konfigurasi ----------------
  const cfgSel = $('#cfg-dev'), term = $('#term'), expl = $('#cfg-explain');
  Object.keys(configs).forEach(id => cfgSel.appendChild(opt(id, byId[id].name)));
  nodes.filter(n => n.ip && n.type !== 'attacker').forEach(n => cfgSel.appendChild(opt(n.id, `${n.name} (host)`)));
  const hostOf = id => byId[id].name.replace(/\s.*/, '').replace('(host)', '') ;
  const promptFor = id => { const n = byId[id]; return n.type === 'router' || n.type === 'switch' ? `${n.name}#` : `${n.name.replace(/\s+/g, '-')}>`; };
  const tw = (html) => { term.insertAdjacentHTML('beforeend', html); term.scrollTop = term.scrollHeight; };
  let cfgRun = 0;
  function explainFor(line) {
    const t = line.trim();
    if (t.startsWith('ip route 0.0.0.0')) return ['ip route 0.0.0.0', explain['ip route 0.0.0.0']];
    for (const k of Object.keys(explain)) if (t.startsWith(k) || (k === 'ip address' && t.startsWith('ip address'))) return [k, explain[k]];
    return null;
  }
  async function runConfig(id) {
    const my = ++cfgRun; const cfg = configs[id]; if (!cfg) return;
    term.innerHTML = ''; expl.innerHTML = '';
    const n = byId[id]; const seen = new Set();
    let prompt = `${n.name}(config)#`;
    tw(`<span class="p">${n.name}#</span> <span class="c">configure terminal</span>\n<span class="e">Enter configuration commands, one per line. End with CNTL/Z.</span>\n`);
    for (const line of cfg.split('\n')) {
      if (my !== cfgRun) return;
      const t = line.trim();
      if (t === '!' || !t) { tw('!\n'); continue; }
      if (t.startsWith('interface')) prompt = `${n.name}(config-if)#`;
      else if (t.startsWith('ip access-list')) prompt = `${n.name}(config-ext-nacl)#`;
      else if (t.startsWith('ip dhcp pool')) prompt = `${n.name}(config-dhcp)#`;
      else if (t.startsWith('vlan ')) prompt = `${n.name}(config-vlan)#`;
      else if (!line.startsWith(' ')) prompt = `${n.name}(config)#`;
      if (t === 'end') prompt = `${n.name}(config)#`;
      tw(`<span class="p">${prompt}</span> `);
      for (const ch of t) { tw(`<span class="c">${ch}</span>`); if (!reduced) await sleep(12 / state.speed); }
      tw('\n');
      if (t === 'end') { prompt = `${n.name}#`; }
      if (t === 'write memory') tw(`<span class="e">Building configuration...\n[OK]</span>\n`);
      const ex = explainFor(t);
      if (ex && !seen.has(ex[0])) { seen.add(ex[0]); expl.insertAdjacentHTML('beforeend', `<div class="item"><code>${t}</code><span>${ex[1]}</span></div>`); expl.scrollTop = expl.scrollHeight; }
      if (!reduced) await sleep(60 / state.speed);
    }
    addLog('ok', `Config ${n.name} diterapkan (demo)`);
  }
  function showConfig(id) {
    cfgRun++; term.innerHTML = ''; expl.innerHTML = '';
    const n = byId[id];
    if (configs[id]) { tw(`<span class="p">${n.name}#</span> <span class="c">show running-config</span>\n<span class="x">${configs[id]}</span>\n`); }
    else tw(`<span class="p">${promptFor(id)}</span> <span class="c">ipconfig</span>\n<span class="x">IPv4 Address....: ${n.ip}\nSubnet Mask.....: ${bits2mask(n.mask)}\nDefault Gateway.: ${n.gw}\nDNS Server......: 192.168.111.1${n.dhcp ? '\n(DHCP dari router)' : ''}</span>\n`);
  }
  $('#cfg-run').onclick = () => runConfig(cfgSel.value);
  $('#cfg-show').onclick = () => showConfig(cfgSel.value);
  cfgSel.onchange = () => showConfig(cfgSel.value);

  function showIpRoute(r) {
    const lines = ['Codes: C - connected, S - static, * - candidate default', 'Gateway of last resort is ' + ((r.routes || []).find(x => x.mask === 0)?.via || 'not set'), ''];
    Object.entries(r.ifaces).forEach(([k, i]) => { const down = (state.antennaDown && (i.ip.startsWith('10.0.0.'))); if (!down) lines.push(`C    ${i.ip.replace(/\.\d+$/, '.0')}/${i.mask} is directly connected, ${k}`); });
    const seen = new Set();
    (r.routes || []).slice().sort((a, b) => a.ad - b.ad).forEach(rt => {
      const key = rt.net + '/' + rt.mask; if (seen.has(key)) return;
      const f = ifaceFor(r, rt.via); const up = f && !(state.antennaDown && rt.via.startsWith('10.0.0.'));
      if (!up) return; seen.add(key);
      lines.push(`S${rt.mask === 0 ? '*' : ' '}   ${rt.net}/${rt.mask} [${rt.ad}/0] via ${rt.via}`);
    });
    return lines.join('\n');
  }
  function showIpIntBrief(r) {
    const rows = Object.entries(r.ifaces).map(([k, i]) => { const down = state.antennaDown && i.ip.startsWith('10.0.0.'); return `${k.padEnd(22)} ${i.ip.padEnd(16)} YES manual ${down ? 'down' : 'up  '}   ${down ? 'down' : 'up'}`; });
    return `Interface              IP-Address       OK? Method Status Protocol\n${rows.join('\n')}`;
  }
  $('#term-form').onsubmit = async e => {
    e.preventDefault(); const input = $('#term-cmd'); const cmd = input.value.trim(); input.value = ''; if (!cmd) return;
    const id = cfgSel.value, n = byId[id];
    cfgRun++;
    tw(`<span class="p">${promptFor(id)}</span> <span class="c">${cmd}</span>\n`);
    const c = cmd.toLowerCase();
    if (c === 'clear' || c === 'cls') { term.innerHTML = ''; return; }
    if (c.startsWith('show run')) tw(`<span class="x">${configs[id] || 'Host tidak punya running-config'}</span>\n`);
    else if (c.startsWith('show ip route')) tw(`<span class="x">${n.type === 'router' ? showIpRoute(n) : '% Bukan router'}</span>\n`);
    else if (c.startsWith('show ip int')) tw(`<span class="x">${n.type === 'router' ? showIpIntBrief(n) : (n.ip ? `FastEthernet0  ${n.ip}/${n.mask}  up` : '% Switch: lihat show vlan brief')}</span>\n`);
    else if (c.startsWith('show vlan')) tw(`<span class="x">${id === 'swh' ? 'VLAN Name          Status  Ports\n1    default       active  Fa6/1, Fa7/1\n110  PC_VLAN       active  Fa3/1, Fa4/1, Fa5/1\n111  NODE1_VLAN    active  Fa0/1\n112  NODE2_VLAN    active  Fa1/1\n113  NODE3_VLAN    active  Fa2/1' : n.type === 'switch' ? 'VLAN Name     Status  Ports\n1    default  active  Fa0/1-24, Gi0/1-2' : '% Bukan switch'}</span>\n`);
    else if (c.startsWith('show access')) tw(`<span class="x">${n.acls ? Object.entries(n.acls).map(([k, a]) => `Extended IP access list ${k}\n` + a.map((e, i) => `    ${(i + 1) * 10} ${e.action} ${e.proto || 'ip'} ${e.src === '0.0.0.0' ? 'any' : e.wild === 32 ? 'host ' + e.src : e.src + ' ' + bits2mask(e.wild).split('.').map(o => 255 - o).join('.')} any`).join('\n')).join('\n') : '% Tidak ada ACL di perangkat ini'}</span>\n`);
    else if (c.startsWith('ping')) {
      const ip = cmd.split(/\s+/)[1];
      if (!ip || !/^\d+\.\d+\.\d+\.\d+$/.test(ip)) { tw(`<span class="err">% Format: ping A.B.C.D</span>\n`); return; }
      if (n.type === 'switch') { tw(`<span class="err">% Ping dari switch belum didukung di demo</span>\n`); return; }
      tw(`<span class="e">Sending 4 ICMP Echos to ${ip}, timeout is 2 seconds:</span>\n`);
      const res = await ping(id, ip, { animate: true, silent: true });
      tw(`<span class="${res.ok ? 'x' : 'err'}">${res.ok ? '!!!!' : '....'}\nSuccess rate is ${res.ok ? 100 : 0} percent (${res.ok ? 4 : 0}/4)</span>\n`);
    }
    else tw(`<span class="err">% Perintah tidak dikenal di demo ini</span>\n`);
  };

  // ---------------- Pengujian ----------------
  const tbody = $('#tests tbody');
  function resetTests() {
    tbody.innerHTML = tests.map((t, i) => `<tr id="t-${i}"><td class="mono">${i + 1}</td><td>${t.label}<br><small class="mono" style="color:var(--muted)">${byId[t.from].ip || byId[t.from].name} → ${t.to}${t.antennaDown ? ' · antena OFF' : ''}</small></td><td><span class="pill ${t.expect === 'ok' ? 'ok' : 'bad'}">${t.expect === 'ok' ? 'REPLY' : 'DROP'}</span></td><td><span class="pill wait">—</span></td></tr>`).join('');
    $('#test-summary').textContent = `0 / ${tests.length}`; $('#test-bar').style.width = '0';
  }
  resetTests();
  $('#test-reset').onclick = resetTests;
  $('#test-run').onclick = async () => {
    if (state.busy) return; state.busy = true; $('#test-run').disabled = true;
    resetTests(); const saved = state.antennaDown; let pass = 0;
    showTab('test');
    for (let i = 0; i < tests.length; i++) {
      const t = tests[i], tr = $(`#t-${i}`); tr.classList.add('running'); tr.querySelector('td:last-child').innerHTML = '<span class="pill run">RUN</span>';
      state.antennaDown = !!t.antennaDown; $('#antenna-down').checked = state.antennaDown; refreshLinks();
      const res = await ping(t.from, t.to, { animate: true, silent: true });
      const got = res.ok ? 'ok' : 'drop'; const good = got === t.expect; if (good) pass++;
      tr.classList.remove('running');
      tr.querySelector('td:last-child').innerHTML = `<span class="pill ${good ? 'ok' : 'bad'}">${good ? 'PASS' : 'FAIL'}</span> <small class="mono">${res.ok ? (res.fwd.path.length - 1) + ' hop' : 'drop @ ' + byId[res.fwd.dropAt || res.fwd.path.at(-1)].name}</small>`;
      addLog(good ? 'ok' : 'bad', `Uji ${i + 1} ${good ? 'PASS' : 'FAIL'}: ${t.label}`);
      $('#test-summary').textContent = `${pass} / ${i + 1}`; $('#test-bar').style.width = `${(pass / tests.length) * 100}%`;
    }
    state.antennaDown = saved; $('#antenna-down').checked = saved; refreshLinks();
    $('#test-summary').textContent = `${pass} / ${tests.length} lulus`;
    state.busy = false; $('#test-run').disabled = false;
  };

  // ---------------- Serangan & server_guard ----------------
  const aSrc = $('#atk-src'), aDst = $('#atk-dst'), glog = $('#guard-log');
  nodes.filter(n => ['laptop', 'pc', 'attacker'].includes(n.type)).forEach(n => aSrc.appendChild(opt(n.id, `${n.name} · ${n.ip}`)));
  nodes.filter(n => n.type === 'server').forEach(n => aDst.appendChild(opt(n.id, `${n.name} · ${n.ip}`)));
  aSrc.value = 'l3'; aDst.value = 'ai1';
  const G = { req: 0, blocked: 0, state: 'aman', fails: 0, ports: new Set(), timer: null, mode: null, blacklist: new Set() };
  const gline = (cls, text) => { glog.insertAdjacentHTML('beforeend', `<div class="${cls}">${text}</div>`); while (glog.children.length > 120) glog.firstChild.remove(); glog.scrollTop = glog.scrollHeight; };
  const gstamp = () => new Date().toISOString().replace('T', ' ').slice(0, 19);
  function gRender() { $('#g-req').textContent = G.req; $('#g-blocked').textContent = G.blocked; const s = $('#g-state'); s.textContent = G.state; s.style.color = G.state === 'aman' ? 'var(--ok)' : G.state === 'waspada' ? 'var(--warn)' : 'var(--bad)'; $('#g-meter').style.width = `${Math.min(100, (G.req / 100) * 100)}%`; }
  function toast(text) { const t = $('#toast'); t.querySelector('span').textContent = text; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 4500); }
  function gReset() { clearInterval(G.timer); Object.assign(G, { req: 0, blocked: 0, state: 'aman', fails: 0, ports: new Set(), timer: null, mode: null }); G.blacklist.clear(); gRender(); }

  function block(ip, reason, evidence) {
    G.blacklist.add(ip); G.state = 'DIBLOKIR';
    gline('l-bad', `${gstamp()} WARNING EVENT blocked ip=${ip} {"reason": "${reason}", ${evidence}, "os_firewall": true}`);
    gline('l-warn', `${gstamp()} INFO iptables -I INPUT -s ${ip} -j DROP  (auto-unblock 3600s)`);
    gline('l-warn', `${gstamp()} INFO alert → Telegram: 🚨 BLOKIR ${ip} (${reason})`);
    toast(`server_guard memblokir ${ip} — ${reason}. Firewall OS + alert Telegram terkirim.`);
    addLog('bad', `server_guard @ ${byId[aDst.value].name}: BLOKIR ${ip} (${reason})`);
  }

  async function attackTick() {
    const src = byId[aSrc.value], dst = byId[aDst.value];
    const fwd = computePath(src.id, dst.ip);
    if (!fwd.ok) { // dibuang di router (ACL) — server tidak pernah melihatnya
      animatePacket(fwd.path, 'dropped').then(() => fwd.dropAt && xmark(fwd.dropAt));
      gline('l-dim', `${gstamp()} (router) ${byId[fwd.dropAt].name}: ACL PUBLIC-IN deny ip host ${src.ip} → paket tidak sampai ke server`);
      G.state = 'aman (ACL router)'; gRender();
      if (++G.req > 12) { stopAttack(); gline('l-ok', `# Serangan dari Internet tertahan di gerbang. server_guard tidak perlu turun tangan.`); }
      return;
    }
    const blocked = G.blacklist.has(src.ip);
    animatePacket(fwd.path, blocked ? 'dropped' : 'flood').then(() => { if (blocked) xmark(dst.id); });
    if (blocked) {
      G.blocked++; gRender();
      gline('l-dim', `${gstamp()} ${src.ip} name="${src.name}" ${G.mode === 'scan' ? 'SYN :' + [21, 23, 3389][G.blocked % 3] : 'GET /'} status=403 verdict=block (tarpit 20s)`);
      if (G.blocked >= 8) { stopAttack(); gline('l-ok', `# Penyerang ditahan. Blokir lepas otomatis setelah block.duration_seconds.`); }
      return;
    }
    G.req++;
    if (G.mode === 'flood') {
      gline(G.req > 40 ? 'l-warn' : '', `${gstamp()} ${src.ip} name="${src.name}" host=- mac=00:0c:29:${(G.req % 255).toString(16).padStart(2, '0')}:a1:7f net=${src.gw.replace(/\.\d+$/, '.0/24')} GET / status=200 ua="python-requests/2.31" verdict=${G.req > 40 ? 'suspicious' : 'allow'}`);
      if (G.req > 40) G.state = 'waspada';
      if (G.req > 60) block(src.ip, 'flood/DoS', `"requests_in_window": ${G.req}, "limit": 60`);
    } else if (G.mode === 'brute') {
      G.fails++;
      gline('l-warn', `${gstamp()} ${src.ip} name="${src.name}" POST /admin status=401 verdict=allow`);
      gline('l-warn', `${gstamp()} WARNING EVENT failed_login ip=${src.ip} {"username": "admin", "count_in_window": ${G.fails}}`);
      G.state = 'waspada';
      if (G.fails >= 5) block(src.ip, 'brute force login', `"failed_attempts": ${G.fails}, "username": "admin"`);
    } else if (G.mode === 'scan') {
      const port = [21, 23, 3389, 5900, 6379][G.ports.size % 5]; G.ports.add(port);
      gline('l-warn', `${gstamp()} WARNING EVENT decoy_port_touched ip=${src.ip} {"port": ${port}, "distinct_ports": ${G.ports.size}}`);
      G.state = 'waspada';
      if (G.ports.size >= 3) block(src.ip, 'port scan', `"ports": [${[...G.ports].join(', ')}]`);
    }
    gRender();
  }
  function startAttack(mode) {
    stopAttack(); gReset(); G.mode = mode; showTab('guard');
    const src = byId[aSrc.value], dst = byId[aDst.value];
    glog.innerHTML = ''; gline('l-ok', `${gstamp()} INFO ${dst.name} aktif di http://${dst.ip}:80 — decoy 21,23,3389,5900,6379 — log di logs/`);
    addLog('warn', `${src.name} mulai ${mode === 'flood' ? 'flood' : mode === 'brute' ? 'brute force' : 'port scan'} ke ${dst.name}`);
    const iv = { flood: 140, brute: 600, scan: 700 }[mode] / state.speed;
    attackTick(); G.timer = setInterval(attackTick, reduced ? iv / 3 : iv);
  }
  function stopAttack() { clearInterval(G.timer); G.timer = null; }
  $('#atk-flood').onclick = () => startAttack('flood');
  $('#atk-brute').onclick = () => startAttack('brute');
  $('#atk-scan').onclick = () => startAttack('scan');
  $('#atk-stop').onclick = () => { stopAttack(); addLog('info', 'Serangan dihentikan'); };

  // ---------------- tema ----------------
  const root = document.documentElement;
  try { const t = localStorage.getItem('hc-theme'); if (t) root.dataset.theme = t; } catch (e) { /* abaikan */ }
  $('#theme-btn').onclick = () => {
    const cur = root.dataset.theme || (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
    root.dataset.theme = cur === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem('hc-theme', root.dataset.theme); } catch (e) { /* abaikan */ }
  };

  window.HC = { computePath, ping, state };

  // ---------------- boot ----------------
  refreshLinks(); showConfig('rh'); gRender();
  addLog('ok', '18 perangkat asli + R-Warehouse, ISP-Public, 3 AI Server, PC Warehouse — semua link UP');
  setTimeout(() => { if (!state.busy) runSim(true); }, 900);
})();
