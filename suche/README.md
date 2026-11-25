# Intelligente Suche

Reine HTML/CSS/JavaScript-Seite (keine Abhängigkeiten). `index.html` im Browser öffnen.

Ein Eingabefeld, die Eingabe wird automatisch einem von fünf (nicht kombinierbaren) Kriterien zugeordnet
und in einzelne Suchparameter zerlegt:

1. **Person** – Vorname/Nachname (auch „Nachname, Vorname“, Namenszusätze, Anrede, Titel, Geburtsname)
   und/oder Geburtsdatum (`01.01.1980`, `1.1.80`, `1980-01-01`, `12. März 1964`, `*3.4.75`)
   und/oder deutsche Adresse (Straße, Hausnummer, PLZ, Ort)
2. **Kfz-Kennzeichen** – Standard, E, H, Saison, Kurzzeit (03/04), rote (05/06/07), Ausfuhr,
   Behörden, Bundeswehr (Y), THW, BP/BD/BW, Diplomaten (0), NATO (X)
3. **Telefonnummer** – national/international, E.164-Normalisierung, Mobil/Festnetz/Service
4. **E-Mail**
5. **Versicherungsscheinnummer** – Schema `94.122.123.4`

Werden Kriterien gemischt (z. B. Name + Telefonnummer), wird die Suche mit Hinweis abgelehnt.

- `parser.js` – Erkennungslogik (`SearchParser.analyze(text)`), auch in Node nutzbar
- `app.js` – Oberfläche
- `test-cli.js` – `node test-cli.js "Müller, Max 1.1.80"` gibt die Interpretation aus
