/* Renderer condiviso della mappa FootPaint a partire dai dati OpenStreetMap in osm-isola.js.
   Stile "chiaro e desaturato": strade bianche con bordo grigio-lilla, parchi verde pallido, acqua azzurra.
   Attribuzione obbligatoria (ODbL): "© OpenStreetMap contributors". */
(function(){
  const O = window.OSM; if (!O) return;
  const W = O.ways;
  const D = pts => 'M' + pts.map(p => p[0] + ' ' + p[1]).join('L');
  const len = pts => { let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i-1][0], pts[i][1] - pts[i-1][1]); return L; };
  O.D = D; O.len = len;
  O.VW = 360; O.VH = 744;                       // finestra base in metri (larghezza × altezza) per uno schermo 300×620
  O.vb = (cx, cy, z = 1) => `${(cx - O.VW/2/z).toFixed(1)} ${(cy - O.VH/2/z).toFixed(1)} ${(O.VW/z).toFixed(1)} ${(O.VH/z).toFixed(1)}`;
  O.d = idxs => idxs.map(i => D(W[i].p)).join('');
  O.pts = idxs => idxs.map(i => W[i].p);
  O.routePts = r => r.map(e => e[0]);
  O.wayLen = idxs => idxs.reduce((a, i) => a + len(W[i].p), 0);
  O.bbox = pts => { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; pts.forEach(p => { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); }); return { x0, y0, x1, y1, cx: (x0+x1)/2, cy: (y0+y1)/2, w: x1-x0, h: y1-y0 }; };
  O.attribution = '© OpenStreetMap contributors';

  const CLS = [
    { k: ['primary','secondary','primary_link','secondary_link'], c: 11, f: 8 },
    { k: ['tertiary','tertiary_link'], c: 9, f: 6.5 },
    { k: ['residential','unclassified','living_street','service'], c: 7.5, f: 5 },
    { k: ['pedestrian'], c: 6.5, f: 4.5, fill: '#F7F5FA' },
    { k: ['footway','path'], c: 4, f: 2.5, fill: '#FBFAFD' },
  ];
  O.baseSvg = function(){
    const ns = 'vector-effect:non-scaling-stroke';
    let s = '<rect x="-5000" y="-5000" width="10000" height="10000" fill="#F1EEF4"/>';
    s += O.parks.map(p => `<path d="${D(p)}Z" fill="#E3F1E6"/>`).join('');
    s += O.water.map(p => `<path d="${D(p)}Z" fill="#DCE8F6"/>`).join('');
    s += `<g fill="none" stroke="#DCE8F6" stroke-width="7" stroke-linecap="round" style="${ns}">${O.waterways.map(p => `<path d="${D(p)}"/>`).join('')}</g>`;
    s += `<g fill="none" stroke="#D9D5E2" stroke-width="2.5" stroke-dasharray="7 5" style="${ns}">${O.rails.map(p => `<path d="${D(p)}"/>`).join('')}</g>`;
    const by = CLS.map(() => []), cyc = [], steps = [];
    W.forEach(w => { if (w.h === 'cycleway') { cyc.push(w); return; } if (w.h === 'steps') { steps.push(w); return; } const i = CLS.findIndex(c => c.k.includes(w.h)); by[i < 0 ? 2 : i].push(w); });
    for (let i = CLS.length - 1; i >= 0; i--) s += `<path d="${by[i].map(w => D(w.p)).join('')}" fill="none" stroke="#E4DFEC" stroke-width="${CLS[i].c}" stroke-linecap="round" stroke-linejoin="round" style="${ns}"/>`;
    for (let i = CLS.length - 1; i >= 0; i--) s += `<path d="${by[i].map(w => D(w.p)).join('')}" fill="none" stroke="${CLS[i].fill || '#fff'}" stroke-width="${CLS[i].f}" stroke-linecap="round" stroke-linejoin="round" style="${ns}"/>`;
    s += `<path d="${cyc.map(w => D(w.p)).join('')}" fill="none" stroke="#BFE3D2" stroke-width="3" stroke-dasharray="6 5" stroke-linecap="round" style="${ns}"/>`;
    s += `<path d="${steps.map(w => D(w.p)).join('')}" fill="none" stroke="#C9C3D6" stroke-width="4" stroke-dasharray="2 3" style="${ns}"/>`;
    s += O.labels.map((l, i) => `<path id="lb${i}" d="${D(l.p)}" fill="none"/><text font-size="8" fill="#9A95AB" font-family="Outfit,sans-serif" font-weight="500"><textPath href="#lb${i}" startOffset="50%" text-anchor="middle">${l.n}</textPath></text>`).join('');
    return s;
  };
  /* Riempie <g id="base"> (dentro un <defs>) se esiste, altrimenti lo crea. */
  O.mount = function(){
    let g = document.getElementById('base');
    if (!g) { const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('width', '0'); svg.setAttribute('height', '0'); svg.style.position = 'absolute'; svg.setAttribute('aria-hidden', 'true'); svg.innerHTML = '<defs><g id="base"></g></defs>'; document.body.appendChild(svg); g = svg.querySelector('#base'); }
    g.innerHTML = O.baseSvg();
  };
  /* Conversione metri → pixel sui tile raster OSM (zoom 16) usati nel mockup di confronto. */
  O.tile = { z: 16, x0: 34436, y0: 23449, size: 256 };
  O.toTilePx = p => { const [lat0, lon0] = O.center; const lon = lon0 + p[0] / (Math.cos(lat0 * Math.PI/180) * 111320); const lat = lat0 - p[1] / 110574; const n = 2 ** O.tile.z; const x = (lon + 180) / 360 * n; const lr = lat * Math.PI/180; const y = (1 - Math.log(Math.tan(lr) + 1/Math.cos(lr)) / Math.PI) / 2 * n; return [(x - O.tile.x0) * O.tile.size, (y - O.tile.y0) * O.tile.size]; };
})();
