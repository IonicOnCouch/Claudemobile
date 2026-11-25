/*
 * Such-Parser: interpretiert eine freie Eingabe und zerlegt sie in Suchparameter.
 * Kriterien (nicht kombinierbar):
 *   1. Person: Name/Vorname und/oder Geburtsdatum und/oder Adresse (DE)
 *   2. Kfz-Kennzeichen (DE, inkl. Sonderformen)
 *   3. Telefonnummer
 *   4. E-Mail
 *   5. Versicherungsscheinnummer (Schema 94.122.123.4)
 */
(function (root) {
  'use strict';

  // ---------------------------------------------------------------- Hilfen
  const TYPES = {
    person: { id: 1, label: 'Person (Name / Geburtsdatum / Adresse)' },
    kfz:    { id: 2, label: 'Kfz-Kennzeichen' },
    phone:  { id: 3, label: 'Telefonnummer' },
    email:  { id: 4, label: 'E-Mail-Adresse' },
    vsnr:   { id: 5, label: 'Versicherungsscheinnummer' }
  };

  function result(type) {
    return {
      type: type,
      typeId: type ? TYPES[type].id : null,
      label: type ? TYPES[type].label : null,
      params: [],
      warnings: [],
      errors: [],
      alternatives: []
    };
  }
  function errorResult(msg) {
    const r = result(null);
    r.errors.push(msg);
    return r;
  }
  function add(r, key, label, value, note) {
    r.params.push({ key: key, label: label, value: value, note: note || '' });
  }
  const pad = (n) => String(n).padStart(2, '0');

  // ---------------------------------------------------------------- 4. E-Mail
  const EMAIL_RE = /^([A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+)@((?:[A-Za-z0-9äöüÄÖÜ](?:[A-Za-z0-9äöüÄÖÜ-]{0,61}[A-Za-z0-9äöüÄÖÜ])?\.)+([A-Za-z]{2,24}))$/;

  function analyzeEmail(s) {
    const t = s.replace(/^mailto:/i, '').trim();
    const m = t.match(EMAIL_RE);
    if (!m) return null;
    const local = m[1];
    if (local.startsWith('.') || local.endsWith('.') || local.includes('..') || local.length > 64) return null;
    const r = result('email');
    const domain = m[2].toLowerCase();
    add(r, 'email', 'E-Mail', local + '@' + domain, 'Domain normalisiert (Kleinschreibung)');
    add(r, 'localPart', 'Lokaler Teil', local);
    add(r, 'domain', 'Domain', domain);
    add(r, 'tld', 'Top-Level-Domain', '.' + m[3].toLowerCase());
    return r;
  }

  // ---------------------------------------------------------------- 5. VSNR
  function analyzeVsnr(s) {
    const t = s.trim();
    let m = t.match(/^(\d{2})\.(\d{3})\.(\d{3})\.(\d)$/);
    let note = '';
    if (!m) {
      // tolerant: Leerzeichen/Bindestriche oder ohne Trennzeichen
      m = t.match(/^(\d{2})[\s.-]?(\d{3})[\s.-]?(\d{3})[\s.-]?(\d)$/);
      if (!m) return null;
      const compact = !/[\s.-]/.test(t);
      if (compact && t.startsWith('0')) return null; // eher Telefonnummer
      note = 'Schreibweise normalisiert';
    }
    const r = result('vsnr');
    add(r, 'vsnr', 'Versicherungsscheinnummer', m.slice(1, 5).join('.'), note);
    add(r, 'teil1', 'Block 1', m[1]);
    add(r, 'teil2', 'Block 2', m[2]);
    add(r, 'teil3', 'Block 3', m[3]);
    add(r, 'pruef', 'Block 4 (Endziffer)', m[4]);
    add(r, 'vsnrCompact', 'Ohne Trennzeichen', m.slice(1, 5).join(''));
    return r;
  }
  function looksLikeBrokenVsnr(s) {
    const t = s.trim();
    return /^\d[\d.]*\d$/.test(t) && (t.match(/\./g) || []).length >= 2 && !/^\d{1,2}\.\d{1,2}\.\d{2,4}$/.test(t);
  }

  // ---------------------------------------------------------------- 3. Telefon
  const COUNTRY_CODES = {
    '1': 'USA/Kanada', '7': 'Russland/Kasachstan', '20': 'Ägypten', '30': 'Griechenland', '31': 'Niederlande',
    '32': 'Belgien', '33': 'Frankreich', '34': 'Spanien', '36': 'Ungarn', '39': 'Italien', '40': 'Rumänien',
    '41': 'Schweiz', '43': 'Österreich', '44': 'Vereinigtes Königreich', '45': 'Dänemark', '46': 'Schweden',
    '47': 'Norwegen', '48': 'Polen', '49': 'Deutschland', '90': 'Türkei', '351': 'Portugal', '352': 'Luxemburg',
    '353': 'Irland', '358': 'Finnland', '359': 'Bulgarien', '380': 'Ukraine', '385': 'Kroatien', '386': 'Slowenien',
    '387': 'Bosnien und Herzegowina', '381': 'Serbien', '420': 'Tschechien', '421': 'Slowakei', '423': 'Liechtenstein'
  };
  const AREA_CODES = {
    '030': 'Berlin', '040': 'Hamburg', '069': 'Frankfurt am Main', '089': 'München', '0201': 'Essen',
    '0211': 'Düsseldorf', '0221': 'Köln', '0228': 'Bonn', '0231': 'Dortmund', '0234': 'Bochum',
    '0241': 'Aachen', '0251': 'Münster', '0341': 'Leipzig', '0351': 'Dresden', '0361': 'Erfurt',
    '0371': 'Chemnitz', '0391': 'Magdeburg', '0421': 'Bremen', '0431': 'Kiel', '0511': 'Hannover',
    '0521': 'Bielefeld', '0531': 'Braunschweig', '0611': 'Wiesbaden', '0621': 'Mannheim', '0631': 'Kaiserslautern',
    '0681': 'Saarbrücken', '0711': 'Stuttgart', '0721': 'Karlsruhe', '0731': 'Ulm', '0761': 'Freiburg im Breisgau',
    '0821': 'Augsburg', '0911': 'Nürnberg', '0941': 'Regensburg', '0331': 'Potsdam', '0381': 'Rostock',
    '0385': 'Schwerin', '0345': 'Halle (Saale)', '0441': 'Oldenburg', '0451': 'Lübeck', '0561': 'Kassel',
    '0571': 'Minden', '0641': 'Gießen', '0651': 'Trier', '0661': 'Fulda', '0751': 'Ravensburg', '0921': 'Bayreuth', '0931': 'Würzburg'
  };

  function analyzePhone(s) {
    let t = s.trim();
    if (!/^[+\d\s/()\-]+$/.test(t)) return null;
    if (!/^(\+|0)/.test(t)) return null;
    if ((t.match(/\+/g) || []).length > 1 || t.indexOf('+') > 0) return null;
    t = t.replace(/\(0\)/g, ' '); // +49 (0) 30 ...
    const groups = t.replace(/[()]/g, ' ').split(/[\s/\-]+/).filter(Boolean);
    let digits = t.replace(/[^\d]/g, '');
    let intl = null;
    if (t.startsWith('+')) intl = digits;
    else if (digits.startsWith('00')) intl = digits.slice(2);

    const r = result('phone');
    let cc = '49', national;
    if (intl !== null) {
      cc = null;
      for (const len of [3, 2, 1]) {
        if (COUNTRY_CODES[intl.slice(0, len)]) { cc = intl.slice(0, len); break; }
      }
      if (!cc) {
        cc = intl.slice(0, 2);
        r.warnings.push('Ländervorwahl +' + cc + ' nicht in der Referenzliste.');
      }
      national = '0' + intl.slice(cc.length);
    } else {
      national = digits;
    }
    const subscriber = national.slice(1);
    if (subscriber.length < 5 || subscriber.length > 13 || (cc + subscriber).length > 15) {
      return null;
    }
    const e164 = '+' + cc + subscriber;
    add(r, 'phoneE164', 'Telefonnummer (E.164)', e164, 'normalisiert');
    add(r, 'countryCode', 'Ländervorwahl', '+' + cc, COUNTRY_CODES[cc] || '');

    if (cc === '49') {
      add(r, 'phoneNational', 'Nationale Schreibweise', national);
      let area = null, kind = 'Festnetz', place = '';
      if (/^01(5\d|6[0-9]|7\d)/.test(national)) { kind = 'Mobilfunk'; area = national.slice(0, 4); }
      else if (/^0800/.test(national)) { kind = 'Service (kostenfrei)'; area = '0800'; }
      else if (/^0180/.test(national)) { kind = 'Service (Shared Cost)'; area = national.slice(0, 5); }
      else if (/^0900/.test(national)) { kind = 'Premium-Dienst'; area = '0900'; }
      else if (/^0700/.test(national)) { kind = 'Persönliche Rufnummer'; area = '0700'; }
      else if (/^0137/.test(national)) { kind = 'Massenverkehrsdienst'; area = '0137'; }
      else {
        // Vorwahl: aus Trennzeichen ableiten, sonst bekannte Ortsnetze
        const first = intl !== null ? '0' + (groups.length > 1 ? groups[1] : '') : groups[0];
        if (groups.length > (intl !== null ? 2 : 1) && /^0[1-9]\d{1,4}$/.test(first) && national.startsWith(first)) {
          area = first;
        } else {
          for (const len of [5, 4, 3]) {
            if (AREA_CODES[national.slice(0, len)]) { area = national.slice(0, len); break; }
          }
        }
        if (area) place = AREA_CODES[area] || '';
      }
      add(r, 'lineType', 'Anschlussart', kind);
      if (area) {
        add(r, 'areaCode', kind === 'Mobilfunk' ? 'Netzvorwahl' : (kind === 'Festnetz' ? 'Ortsvorwahl' : 'Vorwahl'), area, place);
        add(r, 'subscriber', 'Rufnummer', national.slice(area.length));
      } else {
        r.warnings.push('Ortsvorwahl ohne Trennzeichen nicht eindeutig bestimmbar.');
      }
    } else {
      add(r, 'subscriber', 'Nationale Rufnummer', subscriber);
      r.warnings.push('Ausländische Rufnummer.');
    }
    return r;
  }

  // ---------------------------------------------------------------- 2. Kfz
  const FORBIDDEN_LETTERS = ['HJ', 'KZ', 'NS', 'SA', 'SS'];

  function analyzeKfz(raw) {
    let s = raw.trim().replace(/\s+/g, ' ');
    if (!/^[A-Za-zÄÖÜäöü0-9 \-:()/]+$/.test(s) || !/\d/.test(s)) return null;
    const typedUpper = s === s.toUpperCase();
    const U = s.toUpperCase();
    let m;

    const make = (art) => { const r = result('kfz'); add(r, 'art', 'Kennzeichenart', art); return r; };

    // --- Sonderformen ohne Unterscheidungszeichen eines Zulassungsbezirks
    if ((m = U.match(/^0[\s-](\d{1,3})-(\d{1,3})$/))) {
      const r = make('Diplomatenkennzeichen');
      add(r, 'kennzeichen', 'Kennzeichen', '0 ' + m[1] + '-' + m[2]);
      add(r, 'laenderkennzahl', 'Kennzahl der Vertretung', m[1]);
      add(r, 'erkennungsnummer', 'Fahrzeugnummer', m[2]);
      return r;
    }
    if (!/[A-ZÄÖÜ]/.test(U)) return null;
    if ((m = U.match(/^Y[\s-]?(\d{1,3})[\s-]?(\d{3})$/))) {
      const r = make('Bundeswehr');
      add(r, 'kennzeichen', 'Kennzeichen', 'Y-' + m[1] + ' ' + m[2]);
      add(r, 'erkennungsnummer', 'Nummer', m[1] + m[2]);
      return r;
    }
    if ((m = U.match(/^X[\s-]?(\d{4})$/))) {
      const r = make('NATO-Hauptquartier');
      add(r, 'kennzeichen', 'Kennzeichen', 'X-' + m[1]);
      add(r, 'erkennungsnummer', 'Nummer', m[1]);
      return r;
    }
    if ((m = U.match(/^THW[\s-]?(\d{1,5})$/))) {
      const r = make('Bundesanstalt Technisches Hilfswerk');
      add(r, 'kennzeichen', 'Kennzeichen', 'THW-' + m[1]);
      add(r, 'unterscheidungszeichen', 'Unterscheidungszeichen', 'THW');
      add(r, 'erkennungsnummer', 'Nummer', m[1]);
      return r;
    }
    const federal = { BP: 'Bundespolizei', BD: 'Bundesorgane (Bundestag, Bundesrat, Bundesregierung)', BW: 'Bundeswasserstraßen- und Schifffahrtsverwaltung' };
    if ((m = U.match(/^(BP|BD|BW)[\s-]?(\d{1,2})[\s-]?(\d{1,4})$/)) && (typedUpper || /-/.test(s))) {
      const r = make('Bundesbehörde – ' + federal[m[1]]);
      add(r, 'kennzeichen', 'Kennzeichen', m[1] + ' ' + m[2] + '-' + m[3]);
      add(r, 'unterscheidungszeichen', 'Unterscheidungszeichen', m[1]);
      add(r, 'erkennungsnummer', 'Nummer', m[2] + m[3]);
      return r;
    }

    // --- Saisonkennzeichen (Monate am Ende, z. B. "04-10" oder "(04/10)")
    let season = null;
    if ((m = U.match(/^(.*?[A-ZÄÖÜ0-9])(?:\s+|\s*\()(\d{1,2})\s*[/-]\s*(\d{1,2})\s*\)?$/)) && /[A-ZÄÖÜ]/.test(m[1]) && /\d/.test(m[1])) {
      const a = +m[2], b = +m[3];
      if (a >= 1 && a <= 12 && b >= 1 && b <= 12 && a !== b) {
        season = [a, b];
        s = m[1];
      }
    }
    let core = s.toUpperCase().trim();

    // --- Rote Kennzeichen / Kurzzeitkennzeichen (Nummer beginnt mit 0x)
    if ((m = core.match(/^([A-ZÄÖÜ]{1,3})[\s:-]*(0[3-7])[\s-]?([1-9]\d{0,3}|\d{1,4})$/))) {
      const kinds = { '03': 'Kurzzeitkennzeichen', '04': 'Kurzzeitkennzeichen', '05': 'Rotes Kennzeichen (Prüfungs-/Probe-/Überführungsfahrten)', '06': 'Rotes Kennzeichen (Kfz-Handel/-Handwerk)', '07': 'Rotes Kennzeichen für Oldtimer (07er)' };
      const r = make(kinds[m[2]]);
      add(r, 'kennzeichen', 'Kennzeichen', m[1] + '-' + m[2] + m[3]);
      add(r, 'unterscheidungszeichen', 'Unterscheidungszeichen', m[1], 'Zulassungsbezirk');
      add(r, 'erkennungsnummer', 'Erkennungsnummer', m[2] + m[3]);
      if (season) r.warnings.push('Saisonangabe bei dieser Kennzeichenart unüblich – ignoriert.');
      return r;
    }

    // --- Ausfuhrkennzeichen: Bezirk + Ziffern + Buchstabe
    if ((m = core.match(/^([A-ZÄÖÜ]{1,3})[\s:-]+([1-9]\d{0,3})\s?([A-DF-GI-Z])$/))) {
      const r = make('Ausfuhrkennzeichen');
      add(r, 'kennzeichen', 'Kennzeichen', m[1] + '-' + m[2] + m[3]);
      add(r, 'unterscheidungszeichen', 'Unterscheidungszeichen', m[1], 'Zulassungsbezirk');
      add(r, 'erkennungsnummer', 'Erkennungsnummer', m[2] + m[3]);
      return r;
    }

    // --- Suffix E (Elektro) / H (historisch)
    let suffix = null;
    if ((m = core.match(/^(.*\d)\s?([EH])$/))) { suffix = m[2]; core = m[1].trim(); }

    // --- Behördenkennzeichen: Bezirk + nur Ziffern
    if ((m = core.match(/^([A-ZÄÖÜ]{1,3})[\s:-]+([1-9]\d{0,5})$/)) && (typedUpper || /-/.test(s))) {
      if (m[1].length + m[2].length <= 8) {
        const r = make('Behördenkennzeichen (Landes-/Kommunalbehörde)');
        add(r, 'kennzeichen', 'Kennzeichen', m[1] + '-' + m[2] + (suffix || ''));
        add(r, 'unterscheidungszeichen', 'Unterscheidungszeichen', m[1], 'Zulassungsbezirk');
        add(r, 'erkennungsnummer', 'Erkennungsnummer', m[2]);
        if (suffix) addSuffix(r, suffix);
        return r;
      }
    }

    // --- Standardkennzeichen
    const candidates = [];
    if ((m = core.match(/^([A-ZÄÖÜ]{1,3})[\s:-]+([A-Z]{1,2})[\s-]*(\d{1,4})$/))) {
      candidates.push([m[1], m[2], m[3]]);
    } else if ((m = s.trim().match(/^([A-Za-zÄÖÜäöü]{2,5})[\s-]*(\d{1,4})\s?[EHeh]?$/))) {
      const letters = m[1];
      // gemischte Schreibweise ("Ring 3") ist eher ein Wort als ein Kennzeichen
      if (letters !== letters.toUpperCase() && letters !== letters.toLowerCase()) return null;
      const L = letters.toUpperCase();
      const num = m[2];
      for (let d = Math.min(3, L.length - 1); d >= 1; d--) {
        const mid = L.slice(d);
        if (mid.length >= 1 && mid.length <= 2 && !/[ÄÖÜ]/.test(mid)) candidates.push([L.slice(0, d), mid, num]);
      }
    }
    const valid = candidates.filter(([d, l, n]) => !n.startsWith('0') && (d.length + l.length + n.length) <= 8);
    if (!valid.length) {
      if (candidates.length) {
        const [d, l, n] = candidates[0];
        if (n.startsWith('0')) return errorResultKfz('Erkennungsnummer darf nicht mit 0 beginnen.');
        if (d.length + l.length + n.length > 8) return errorResultKfz('Kennzeichen zu lang (max. 8 Zeichen ohne E/H).');
      }
      return null;
    }
    const build = ([d, l, n]) => {
      const r = make(suffix === 'E' ? 'Elektrokennzeichen' : suffix === 'H' ? 'Historisches Kennzeichen (Oldtimer)' : season ? 'Saisonkennzeichen' : 'Standardkennzeichen');
      add(r, 'kennzeichen', 'Kennzeichen', d + '-' + l + ' ' + n + (suffix || ''), 'normalisiert');
      add(r, 'unterscheidungszeichen', 'Unterscheidungszeichen', d, 'Zulassungsbezirk');
      add(r, 'erkennungsbuchstaben', 'Erkennungsbuchstaben', l);
      add(r, 'erkennungsnummer', 'Erkennungsnummer', n);
      if (suffix) addSuffix(r, suffix);
      if (season) add(r, 'saison', 'Saisonzeitraum', pad(season[0]) + ' bis ' + pad(season[1]), monthName(season[0]) + ' – ' + monthName(season[1]));
      if (FORBIDDEN_LETTERS.includes(l)) r.warnings.push('Buchstabenkombination „' + l + '“ wird in Deutschland nicht vergeben.');
      return r;
    };
    const primary = build(valid[0]);
    if (valid.length > 1) {
      primary.warnings.push('Trennung zwischen Unterscheidungszeichen und Erkennungsbuchstaben nicht eindeutig (Bindestrich/Leerzeichen fehlt).');
      for (const c of valid.slice(1)) primary.alternatives.push({ label: 'Alternative Lesart: ' + c[0] + '-' + c[1] + ' ' + c[2] + (suffix || ''), result: build(c) });
    }
    return primary;
  }
  function errorResultKfz(msg) { const r = result('kfz'); r.errors.push(msg); return r; }
  function addSuffix(r, sfx) {
    add(r, 'zusatz', 'Zusatz', sfx, sfx === 'E' ? 'Elektrofahrzeug' : 'Historisches Fahrzeug');
  }
  const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  const monthName = (i) => MONTHS[i - 1];

  // ---------------------------------------------------------------- 1. Person
  const MONTH_WORDS = {
    jan: 1, januar: 1, jänner: 1, feb: 2, februar: 2, mär: 3, mrz: 3, märz: 3, maerz: 3, apr: 4, april: 4, mai: 5,
    jun: 6, juni: 6, jul: 7, juli: 7, aug: 8, august: 8, sep: 9, sept: 9, september: 9, okt: 10, oktober: 10,
    nov: 11, november: 11, dez: 12, dezember: 12
  };
  const MONTH_ALT = Object.keys(MONTH_WORDS).sort((a, b) => b.length - a.length).join('|');
  const PREFIX = '(?:(?:geb(?:oren)?\\.?\\s*(?:am\\s*)?|\\*\\s*))?';
  const DATE_PATTERNS = [
    { re: new RegExp(PREFIX + '(?<!\\d)(\\d{1,2})\\s*[./]\\s*(\\d{1,2})\\s*[./]\\s*(\\d{4}|\\d{2})(?!\\d)', 'giu'), order: 'dmy' },
    { re: new RegExp(PREFIX + '(?<!\\d)(\\d{4})-(\\d{1,2})-(\\d{1,2})(?!\\d)', 'giu'), order: 'ymd' },
    { re: new RegExp(PREFIX + '(?<!\\d)(\\d{1,2})\\.?\\s*(' + MONTH_ALT + ')\\.?\\s+(\\d{4})(?!\\d)', 'giu'), order: 'dMy' },
    { re: new RegExp(PREFIX + '(?<![\\d.])(\\d{2})(\\d{2})(\\d{4})(?![\\d.])', 'giu'), order: 'dmy', compact: true }
  ];

  function buildDate(d, mo, y, today) {
    let note = '';
    if (String(y).length === 2) {
      const yy = +y, cur = today.getFullYear() % 100;
      y = (yy <= cur ? 2000 : 1900) + yy;
      note = 'Jahrhundert ergänzt';
    }
    y = +y; mo = +mo; d = +d;
    const dt = new Date(y, mo - 1, d);
    if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return { invalid: 'Ungültiges Datum: ' + pad(d) + '.' + pad(mo) + '.' + y };
    if (dt > today) return { invalid: 'Geburtsdatum liegt in der Zukunft: ' + pad(d) + '.' + pad(mo) + '.' + y };
    if (y < 1890) return { invalid: 'Geburtsjahr unplausibel: ' + y };
    let age = today.getFullYear() - y;
    if (today.getMonth() < mo - 1 || (today.getMonth() === mo - 1 && today.getDate() < d)) age--;
    return { value: pad(d) + '.' + pad(mo) + '.' + y, iso: y + '-' + pad(mo) + '-' + pad(d), age: age, note: note };
  }

  function extractDates(str, today) {
    const found = [];
    for (const p of DATE_PATTERNS) {
      p.re.lastIndex = 0;
      let m;
      while ((m = p.re.exec(str))) {
        const start = m.index, end = m.index + m[0].length;
        if (found.some((f) => start < f.end && end > f.start)) continue;
        let d, mo, y;
        if (p.order === 'dmy') { d = m[1]; mo = m[2]; y = m[3]; }
        else if (p.order === 'ymd') { y = m[1]; mo = m[2]; d = m[3]; }
        else { d = m[1]; mo = MONTH_WORDS[m[2].toLowerCase()]; y = m[3]; }
        const res = buildDate(d, mo, y, today);
        if (p.compact && res.invalid) continue; // 8 Ziffern ohne gültiges Datum -> kein Datum
        found.push({ start, end, res, raw: m[0] });
      }
    }
    found.sort((a, b) => a.start - b.start);
    let rest = '';
    let pos = 0;
    for (const f of found) { rest += str.slice(pos, f.start) + ' '; pos = f.end; }
    rest += str.slice(pos);
    return { dates: found, rest };
  }

  const STREET_SUFFIX_STRONG = /(straße|strasse|str\.?|weg|allee|platz|pl\.|gasse|chaussee|promenade)$/i;
  const STREET_SUFFIX_WEAK = /(ring|damm|ufer|pfad|steig|stieg|markt|hof|berg|graben|kamp|wall|zeile|brücke|garten|park|feld|tor|bogen|winkel|anger|höhe|siedlung|kai|wiese|grund|tal|bach|heide|holz|busch|rain|steg|hain)$/i;
  const STREET_STANDALONE = /^(straße|strasse|str\.?|weg|allee|platz|gasse|ring|damm|ufer|chaussee|markt|pfad|steig|promenade|landstraße|chaussee)$/i;
  const STREET_PREFIX = /^(am|an|auf|aufm|im|in|zum|zur|zu|unter|unterm|hinter|hinterm|vor|vorm|bei|beim|über|alte|alter|alten|altes|alt|neue|neuer|neuen|große|großer|großen|kleine|kleiner|kleinen|lange|langer|langen|hohe|hoher|hohen|obere|oberer|untere|unterer|der|die|das|den|dem|des|st\.|sankt|sankt-)$/i;
  const HOUSE_NO = /^\d{1,4}[a-zA-Z]?(?:[-/]\d{1,4}[a-zA-Z]?)?$/;
  const CITY_CONNECT = /^(am|an|der|die|den|im|in|ob|bei|vor|a\.|a\.d\.|i\.|v\.d\.|d\.|o\.)$/i;
  const CITY_PREFIX = /^(bad|st\.|sankt|neu|groß|klein|alt|hohen|ostseebad|nordseebad|markt|stadt)$/i;
  const SALUTATIONS = { herr: 'Herr', hr: 'Herr', 'hr.': 'Herr', frau: 'Frau', fr: 'Frau', 'fr.': 'Frau' };
  const TITLES = /^(dr\.?|prof\.?|dipl\.?-?\w*\.?|ing\.?|med\.?|rer\.?|nat\.?|mag\.?|ma|mba|b\.?sc\.?|m\.?sc\.?)$/i;
  const PARTICLES = /^(von|vom|van|de|del|della|der|den|di|da|du|dos|zu|zum|zur|ten|ter|la|le|y|op|bin|al|el)$/;
  const NAME_TOKEN = /^\p{L}[\p{L}'’.-]*$/u;
  const BIRTHNAME = /^(geb\.?|geborene|geborener|geb\.?-?name)$/i;

  const FIRST_NAMES = new Set(('max maximilian alexander paul leon lukas lucas luca felix jonas elias noah ben finn fynn tim tom jan niklas nico julian moritz david daniel michael thomas andreas stefan stephan christian markus marcus martin peter frank klaus jürgen juergen wolfgang hans heinz werner günter günther gerhard helmut dieter horst uwe bernd ralf ralph rainer jörg dirk sven torsten thorsten holger matthias tobias sebastian florian philipp johannes simon fabian kevin dennis patrick marco mario oliver karl carl friedrich fritz georg josef joseph johann kurt walter wilhelm otto erich ernst rolf manfred norbert volker lars kai jens nils erik eric robert richard anton emil oskar oscar henry jakob jacob mohammed mohamed ali mehmet ahmet mustafa ibrahim jonathan benjamin samuel vincent valentin leonard theo emil henri louis luis linus mats milan adrian dominik marcel benedikt konstantin raphael rafael hendrik heiko björn timo jannik janik marvin pascal rene rené sascha sandro andré andre igor ivan sergej alexej dmitri piotr tomasz '
    + 'anna maria marie sophie sofia sophia emma mia hannah hanna lena lea leonie laura julia lisa sarah sara katharina christina kristina sabine petra monika andrea claudia susanne birgit stefanie stephanie nicole sandra anja tanja katja martina ursula renate helga gisela ingrid karin elke heike silke ute gabriele barbara brigitte christine elisabeth angelika jutta doris inge erika jessica jennifer melanie nadine simone daniela manuela carina franziska johanna charlotte clara klara emilia amelie ida greta frieda paula luisa louisa nina vanessa jana anke kerstin bettina diana eva ines iris vera rita ruth marion beate dagmar lara michelle selina alina elena fatma ayse ayşe zeynep emine hatice olga natalia natalie irina svetlana tatjana agnieszka magdalena viktoria victoria jasmin yasmin annika anika carolin caroline kathrin katrin marina miriam nora pia sina tina yvonne regina rosemarie hildegard waltraud irmgard gertrud edith hannelore annette antje ulrike cornelia sonja silvia sylvia astrid lina mila ella marlene helena isabel isabell isabella alexandra'
  ).split(/\s+/));

  function cap(w) {
    return w.split('-').map((p) => p ? p.charAt(0).toLocaleUpperCase('de-DE') + p.slice(1) : p).join('-');
  }
  function normName(w) {
    // GROSS oder klein geschriebene Namen in Normalform bringen, gemischte belassen
    if (w === w.toLowerCase() || w === w.toUpperCase()) return PARTICLES.test(w.toLowerCase()) ? w.toLowerCase() : cap(w.toLowerCase());
    return w;
  }

  function embeddedCriteria(str) {
    const found = [];
    if (/\S+@\S+/.test(str)) found.push('E-Mail');
    if (/(?<![\d.])\d{2}\.\d{3}\.\d{3}\.\d(?![\d.])/.test(str)) found.push('Versicherungsscheinnummer');
    if (/(?:\+|(?<!\d)00)\d[\d\s/()-]{5,}\d/.test(str) || /(?<![\d.])0\d{2,5}[\s/-]?\d{4,}(?![\d.])/.test(str)) found.push('Telefonnummer');
    if (/(?:^|[\s,;])[A-ZÄÖÜ]{1,3}[-:][A-Z]{1,2}[\s-]?[1-9]\d{0,3}[EH]?(?=$|[\s,;])/.test(str) ||
        /(?:^|[\s,;])[A-ZÄÖÜ]{1,3}\s[A-Z]{1,2}\s[1-9]\d{0,3}[EH]?(?=$|[\s,;])/.test(str)) found.push('Kfz-Kennzeichen');
    return found;
  }

  function analyzePerson(input, today) {
    const r = result('person');

    // 1) Geburtsdaten herauslösen
    const { dates, rest } = extractDates(input, today);
    if (dates.length > 1) r.errors.push('Mehrere Datumsangaben gefunden – bitte nur ein Geburtsdatum angeben.');

    // 2) Unzulässige Kombinationen mit anderen Kriterien
    const other = embeddedCriteria(rest);
    if (other.length) {
      const e = errorResult('Kombination von Suchkriterien ist nicht zulässig: Personendaten + ' + other.join(' + ') + '. Bitte nur ein Kriterium verwenden.');
      e.conflict = ['Person'].concat(other);
      return e;
    }

    // 3) Tokenisieren (Segmente durch Komma/Semikolon/Zeilenumbruch)
    const prepared = rest.replace(/([\p{L}.])(\d)/gu, '$1 $2').replace(/(\d{5})(\p{L})/gu, '$1 $2');
    const tokens = [];
    prepared.split(/[,;\n]+/).forEach((seg, si) => {
      seg.trim().split(/\s+/).filter(Boolean).forEach((t) => tokens.push({ t: t, seg: si, used: false }));
    });
    const segCount = new Set(tokens.map((x) => x.seg)).size;
    const isWord = (x) => x && !x.used && /^\p{L}/u.test(x.t);
    const inSeg = (i, seg) => tokens[i] && tokens[i].seg === seg;

    let street = null, houseNo = null, plz = null, city = null, birthName = null;
    const salutation = [], titles = [];

    // 4) PLZ + Ort
    for (let i = 0; i < tokens.length; i++) {
      const m = tokens[i].t.match(/^(?:D-?)?(\d{5})$/i);
      if (!m) {
        if (/^\d{4}$/.test(tokens[i].t) && tokens[i + 1] && isWord(tokens[i + 1]) && !inSeg(i - 1, tokens[i].seg)) {
          r.warnings.push('„' + tokens[i].t + '“ ist keine deutsche (5-stellige) Postleitzahl – nur Adressen in Deutschland werden unterstützt.');
        }
        continue;
      }
      if (plz) { r.errors.push('Mehrere Postleitzahlen gefunden.'); break; }
      plz = m[1];
      tokens[i].used = true;
      if (/^00/.test(plz)) r.warnings.push('Postleitzahlen beginnen in Deutschland nicht mit 00.');
      const seg = tokens[i].seg;
      const cityTok = [];
      let j = i + 1;
      const restOfSegIsCity = segCount > 1 && tokens.slice(i + 1).filter((x) => x.seg === seg).every((x) => /^[\p{L}(]/u.test(x.t)) && tokens.slice(0, i).every((x) => x.seg !== seg);
      if (restOfSegIsCity) {
        while (inSeg(j, seg)) { cityTok.push(tokens[j]); j++; }
      } else if (isWord(tokens[j]) && inSeg(j, seg)) {
        cityTok.push(tokens[j]); j++;
        if (CITY_PREFIX.test(cityTok[0].t) && isWord(tokens[j]) && inSeg(j, seg)) { cityTok.push(tokens[j]); j++; }
        while (inSeg(j, seg)) {
          if (/^\(.*\)?$/.test(tokens[j].t)) { cityTok.push(tokens[j]); j++; if (!cityTok[cityTok.length - 1].t.endsWith(')')) { while (inSeg(j, seg) && !tokens[j - 1].t.endsWith(')')) { cityTok.push(tokens[j]); j++; } } continue; }
          if (CITY_CONNECT.test(tokens[j].t) && isWord(tokens[j + 1]) && inSeg(j + 1, seg)) {
            cityTok.push(tokens[j]); j++;
            if (/^(der|die|den)$/i.test(tokens[j].t) && isWord(tokens[j + 1])) { cityTok.push(tokens[j]); j++; }
            cityTok.push(tokens[j]); j++;
            continue;
          }
          if (/^\//.test(tokens[j].t) || /^(i\.|i\.?\s?Br\.?)$/i.test(tokens[j].t)) { cityTok.push(tokens[j]); j++; continue; }
          break;
        }
      }
      if (cityTok.length) { cityTok.forEach((x) => (x.used = true)); city = cityTok.map((x) => x.t).join(' '); }
    }

    // 5) Straße + Hausnummer
    for (let i = 0; i < tokens.length && !houseNo; i++) {
      const tk = tokens[i];
      if (tk.used || !HOUSE_NO.test(tk.t)) continue;
      const seg = tk.seg;
      if (!isWord(tokens[i - 1]) || !inSeg(i - 1, seg)) continue;
      let start = -1, assumed = false;
      // a) Straßen-Suffix in den vorigen Tokens
      for (let k = i - 1; k >= Math.max(0, i - 4) && inSeg(k, seg) && isWord(tokens[k]); k--) {
        if (STREET_SUFFIX_STRONG.test(tokens[k].t) || STREET_SUFFIX_WEAK.test(tokens[k].t)) { start = k; break; }
      }
      if (start >= 0) {
        if (STREET_STANDALONE.test(tokens[start].t) && isWord(tokens[start - 1]) && inSeg(start - 1, seg)) start--;
        while (isWord(tokens[start - 1]) && inSeg(start - 1, seg) && STREET_PREFIX.test(tokens[start - 1].t)) start--;
      } else {
        // b) Präposition/Artikel als Straßenanfang ("Am Markt 3", "An der Alster 5")
        for (let k = i - 1; k >= Math.max(0, i - 4) && inSeg(k, seg) && isWord(tokens[k]); k--) {
          if (STREET_PREFIX.test(tokens[k].t)) start = k;
        }
        if (start >= 0) {
          while (isWord(tokens[start - 1]) && inSeg(start - 1, seg) && STREET_PREFIX.test(tokens[start - 1].t)) start--;
        }
      }
      if (start < 0) {
        // c) eigenes Segment (durch Komma getrennt) -> komplettes Segment ist Straße
        const segToks = tokens.filter((x) => x.seg === seg);
        if (segCount > 1 && segToks[segToks.length - 1] === tokens[i + (tokens[i + 1] && /^[a-zA-Z]$/.test(tokens[i + 1].t) && inSeg(i + 1, seg) ? 1 : 0)] && segToks.every((x) => x === tk || isWord(x) || /^[a-zA-Z]$/.test(x.t))) {
          start = tokens.indexOf(segToks[0]);
        } else {
          if (/^\d{4}$/.test(tk.t) && isWord(tokens[i + 1]) && inSeg(i + 1, seg)) {
            r.errors.push('„' + tk.t + ' ' + tokens[i + 1].t + '“ sieht nach einer ausländischen Postleitzahl aus – nur Adressen in Deutschland werden unterstützt.');
            tk.used = true; tokens[i + 1].used = true;
            continue;
          }
          start = i - 1;
          assumed = true;
        }
      }
      const st = tokens.slice(start, i);
      st.forEach((x) => (x.used = true));
      street = st.map((x) => x.t).join(' ');
      houseNo = tk.t;
      tk.used = true;
      if (tokens[i + 1] && inSeg(i + 1, seg) && /^[a-zA-Z]$/.test(tokens[i + 1].t) && !tokens[i + 1].used) {
        houseNo += tokens[i + 1].t.toLowerCase();
        tokens[i + 1].used = true;
      }
      if (assumed) r.warnings.push('„' + street + '“ wurde als Straße angenommen (kein typischer Straßenname erkannt).');
    }
    // Straße ohne Hausnummer
    if (!street) {
      for (let i = 0; i < tokens.length; i++) {
        if (isWord(tokens[i]) && STREET_SUFFIX_STRONG.test(tokens[i].t) && tokens[i].t.length > 4) {
          let start = i;
          if (STREET_STANDALONE.test(tokens[i].t) && isWord(tokens[i - 1]) && inSeg(i - 1, tokens[i].seg)) start--;
          while (isWord(tokens[start - 1]) && inSeg(start - 1, tokens[i].seg) && STREET_PREFIX.test(tokens[start - 1].t)) start--;
          const st = tokens.slice(start, i + 1);
          st.forEach((x) => (x.used = true));
          street = st.map((x) => x.t).join(' ');
          break;
        }
      }
    }
    // Ort ohne PLZ: eigenes Segment nach der Straße
    if (!city && street && segCount > 1) {
      const streetSeg = tokens.find((x) => x.used && street.startsWith(x.t)).seg;
      const nextSeg = tokens.filter((x) => x.seg === streetSeg + 1);
      if (nextSeg.length && nextSeg.every((x) => isWord(x) || /^\(/.test(x.t))) {
        nextSeg.forEach((x) => (x.used = true));
        city = nextSeg.map((x) => x.t).join(' ');
      }
    }

    // 6) Anrede, Titel, Geburtsname
    for (let i = 0; i < tokens.length; i++) {
      const x = tokens[i];
      if (x.used) continue;
      const low = x.t.toLowerCase();
      if (SALUTATIONS[low]) { salutation.push(SALUTATIONS[low]); x.used = true; continue; }
      if (TITLES.test(x.t) && /[.]|^(dr|prof)$/i.test(x.t)) { titles.push(x.t); x.used = true; continue; }
      if (BIRTHNAME.test(x.t)) {
        x.used = true;
        if (isWord(tokens[i + 1]) && inSeg(i + 1, x.seg)) { birthName = normName(tokens[i + 1].t); tokens[i + 1].used = true; }
      }
    }

    // 7) Rest = Name
    const leftovers = tokens.filter((x) => !x.used);
    const nameToks = leftovers.filter((x) => NAME_TOKEN.test(x.t));
    const junk = leftovers.filter((x) => !NAME_TOKEN.test(x.t));
    let firstName = null, lastName = null, nameNote = '';
    if (nameToks.length) {
      const segs = [...new Set(nameToks.map((x) => x.seg))];
      if (segs.length >= 2) {
        // "Müller, Max" -> Nachname, Vorname
        lastName = nameToks.filter((x) => x.seg === segs[0]).map((x) => normName(x.t)).join(' ');
        firstName = nameToks.filter((x) => x.seg === segs[1]).map((x) => normName(x.t)).join(' ');
        nameNote = 'Schreibweise „Nachname, Vorname“ erkannt';
        if (segs.length > 2) r.warnings.push('Mehr Namensbestandteile als erwartet: ' + nameToks.filter((x) => x.seg > segs[1]).map((x) => x.t).join(' '));
      } else if (nameToks.length === 1) {
        const w = nameToks[0].t;
        if (FIRST_NAMES.has(w.toLowerCase())) { firstName = normName(w); r.warnings.push('Nur ein Vorname angegeben – Nachname fehlt.'); }
        else { lastName = normName(w); nameNote = 'Einzelner Name als Nachname interpretiert'; }
      } else {
        const words = nameToks.map((x) => x.t);
        const isFirst = (w) => FIRST_NAMES.has(w.toLowerCase().split('-')[0]);
        // Nachnamen-Beginn: erste Namenspartikel (von, van, de ...) nach dem ersten Wort
        let p = words.findIndex((w, idx) => idx > 0 && PARTICLES.test(w));
        if (p > 0) {
          firstName = words.slice(0, p).map(normName).join(' ');
          lastName = words.slice(p).map(normName).join(' ');
          nameNote = 'Namenszusatz erkannt';
        } else if (!isFirst(words[0]) && isFirst(words[words.length - 1])) {
          lastName = words.slice(0, -1).map(normName).join(' ');
          firstName = normName(words[words.length - 1]);
          nameNote = 'Reihenfolge „Nachname Vorname“ anhand bekannter Vornamen erkannt';
        } else {
          firstName = words.slice(0, -1).map(normName).join(' ');
          lastName = normName(words[words.length - 1]);
          nameNote = isFirst(words[0]) ? 'Vorname anhand bekannter Vornamen erkannt' : 'Reihenfolge „Vorname Nachname“ angenommen';
          if (!isFirst(words[0])) r.warnings.push('Reihenfolge von Vor- und Nachname nicht sicher – „Vorname Nachname“ angenommen. Eindeutig: „Nachname, Vorname“.');
        }
      }
    }
    if (junk.length) r.warnings.push('Nicht zuordenbar: ' + junk.map((x) => '„' + x.t + '“').join(', '));

    // 8) Ausgabe
    if (salutation.length) add(r, 'anrede', 'Anrede', salutation[0]);
    if (titles.length) add(r, 'titel', 'Titel', titles.join(' '));
    if (firstName) add(r, 'vorname', 'Vorname', firstName, nameNote);
    if (lastName) add(r, 'nachname', 'Nachname', lastName, firstName ? '' : nameNote);
    if (birthName) add(r, 'geburtsname', 'Geburtsname', birthName);
    if (dates.length) {
      const d = dates[0].res;
      if (d.invalid) r.errors.push(d.invalid);
      else add(r, 'geburtsdatum', 'Geburtsdatum', d.value, 'ISO ' + d.iso + ' · Alter ' + d.age + (d.note ? ' · ' + d.note : ''));
    }
    if (street) {
      const full = street.replace(/^Str\.?$|(\s)Str\.?$/, '$1Straße').replace(/(\p{L})str\.?$/u, '$1straße');
      add(r, 'strasse', 'Straße', full, full !== street ? 'Abkürzung „' + street + '“ ausgeschrieben' : '');
    }
    if (houseNo) add(r, 'hausnummer', 'Hausnummer', houseNo);
    if (plz) add(r, 'plz', 'PLZ', plz);
    if (city) add(r, 'ort', 'Ort', city);
    if (plz || street || city) add(r, 'land', 'Land', 'DE', 'nur Adressen in Deutschland');

    if (!r.params.length && !r.errors.length) {
      return errorResult('Eingabe konnte keinem Suchkriterium zugeordnet werden.');
    }
    const parts = [];
    if (firstName || lastName || birthName) parts.push('Name');
    if (dates.length && !dates[0].res.invalid) parts.push('Geburtsdatum');
    if (street || plz || city) parts.push('Adresse');
    r.components = parts;
    if ((houseNo && !street) || (street && !houseNo && !plz && !city && !lastName && !firstName)) r.warnings.push('Adresse unvollständig.');
    return r;
  }

  // ---------------------------------------------------------------- Einstieg
  function analyze(input, opts) {
    const today = (opts && opts.today) || new Date();
    const s = String(input || '').trim();
    if (!s) return result(null);

    // 4. E-Mail
    if (s.includes('@')) {
      const e = analyzeEmail(s);
      if (e) return e;
      if (!/\s/.test(s)) return errorResult('Ungültige E-Mail-Adresse.');
    }
    // 5. Versicherungsscheinnummer
    const v = analyzeVsnr(s);
    if (v) return v;
    if (looksLikeBrokenVsnr(s)) return errorResult('Versicherungsscheinnummer unvollständig oder falsch gegliedert – erwartet: 94.122.123.4');

    // Mehrdeutig: 8 Ziffern = Datum (TTMMJJJJ) oder Telefonnummer
    if (/^\d{8}$/.test(s)) {
      const d = buildDate(s.slice(0, 2), s.slice(2, 4), s.slice(4), today);
      if (!d.invalid) {
        const p = analyzePerson(s, today);
        const ph = s.startsWith('0') ? analyzePhone(s) : null;
        if (ph) {
          p.warnings.push('Mehrdeutig: könnte auch eine Telefonnummer sein.');
          p.alternatives.push({ label: 'Alternative: Telefonnummer', result: ph });
        }
        return p;
      }
    }
    // 2. Kfz-Kennzeichen
    const k = analyzeKfz(s);
    if (k) return k;
    // 3. Telefonnummer
    const ph = analyzePhone(s);
    if (ph) return ph;
    if (/^[+\d\s/()-]+$/.test(s) && !/^\d{5}$/.test(s) && !/^\d{1,2}[./]/.test(s)) {
      if (/^\d+$/.test(s) && !s.startsWith('0')) {
        return errorResult('Reine Ziffernfolge nicht eindeutig. Telefonnummern bitte mit Vorwahl (0…/+49…), Versicherungsscheinnummern im Format 94.122.123.4 eingeben.');
      }
      return errorResult('Ungültige Telefonnummer (zu kurz/zu lang oder unzulässige Zeichen).');
    }
    // 1. Person
    return analyzePerson(s, today);
  }

  const api = { analyze: analyze, TYPES: TYPES };
  root.SearchParser = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
