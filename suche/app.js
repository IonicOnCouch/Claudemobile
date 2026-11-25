(function () {
  'use strict';
  const $ = (sel) => document.querySelector(sel);
  const input = $('#q');
  const out = $('#result');
  const criteria = document.querySelectorAll('#criteria li');

  const EXAMPLES = [
    'Müller', 'Müller, Max', 'Berlin', 'Müller, Anna, 12.03.1964', 'Frau Dr. Schmidt, Erika geb. Meier 3.4.75',
    'Hauptstr. 5, 12345 Berlin', 'von Bergen, Hans, Am Alten Markt 3, 50667 Köln', 'Lindenweg 4, Kleindorf',
    'M-AB 1234', 'B-MW 123E', 'HH-AB 12H', 'S-AB 123 04-10', 'K-06123', 'Y-123 456',
    '+49 30 1234567', '0151 12345678', 'max.mustermann@example.de', '94.122.123.4',
    'Max Müller', 'M AB 1234', '1980-01-01', 'Müller, Max 0171 1234567'
  ];

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function table(params) {
    if (!params.length) return '';
    return '<table class="params"><thead><tr><th>Parameter</th><th>Wert</th><th>Hinweis</th></tr></thead><tbody>' +
      params.map((p) => '<tr><th scope="row">' + esc(p.label) + '<code>' + esc(p.key) + '</code></th><td class="val">' + esc(p.value) +
        '</td><td class="note">' + esc(p.note) + '</td></tr>').join('') + '</tbody></table>';
  }
  const list = (items, cls) => items.length ? '<ul class="msgs ' + cls + '">' + items.map((m) => '<li>' + esc(m) + '</li>').join('') + '</ul>' : '';

  function render(r, raw) {
    const NAMES = { 'Person': 1, 'Kfz-Kennzeichen': 2, 'Telefonnummer': 3, 'E-Mail': 4, 'Versicherungsscheinnummer': 5 };
    const conflictIds = (r.conflict || []).map((n) => NAMES[n]);
    criteria.forEach((li) => {
      const id = +li.dataset.id;
      li.classList.toggle('active', r.typeId === id && !r.errors.length);
      li.classList.toggle('conflict', conflictIds.includes(id));
    });
    if (!raw.trim()) {
      out.innerHTML = '<p class="empty">Bitte einen Suchbegriff eingeben.</p>';
      out.className = 'result';
      return;
    }
    const ok = r.type && !r.errors.length;
    out.className = 'result ' + (ok ? 'ok' : 'bad');
    let html = '<div class="head">';
    html += r.type
      ? '<span class="badge">Kriterium ' + r.typeId + '</span><h2>' + esc(r.label) + '</h2>'
      : '<span class="badge bad">Nicht erkannt</span><h2>Keine gültige Suche</h2>';
    if (r.components && r.components.length) html += '<p class="sub">Erkannt: ' + r.components.map(esc).join(' + ') + '</p>';
    html += '</div>';
    html += list(r.errors, 'error') + table(r.params) + list(r.warnings, 'warn');
    if (r.alternatives.length) {
      html += '<div class="alts"><h3>Weitere mögliche Interpretationen</h3>' +
        r.alternatives.map((a) => '<details><summary>' + esc(a.label) + '</summary>' + table(a.result.params) + '</details>').join('') + '</div>';
    }
    if (ok) {
      const obj = { kriterium: r.typeId, typ: r.type };
      r.params.forEach((p) => { obj[p.key] = p.value; });
      html += '<details class="json"><summary>Suchparameter als JSON</summary><pre>' + esc(JSON.stringify(obj, null, 2)) + '</pre></details>';
    }
    out.innerHTML = html;
  }

  function run() { render(SearchParser.analyze(input.value), input.value); }

  input.addEventListener('input', run);
  $('#searchForm').addEventListener('submit', (e) => { e.preventDefault(); run(); });

  const ex = $('#examples');
  EXAMPLES.forEach((t) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = t;
    b.addEventListener('click', () => { input.value = t; run(); input.focus(); });
    ex.appendChild(b);
  });
  run();
})();
