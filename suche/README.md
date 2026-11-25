# Intelligente Suche

Reine HTML/CSS/JavaScript-Seite (keine Abhängigkeiten). `index.html` im Browser öffnen.

Ein Eingabefeld, die Eingabe wird automatisch einem von fünf (nicht kombinierbaren) Kriterien zugeordnet
und in einzelne Suchparameter zerlegt:

1. **Person** – Nachname, optional `, Vorname` (Vorname nur mit Komma hinter dem Nachnamen),
   und/oder Geburtsdatum (nur `TT.MM.JJJJ` bzw. `T.M.JJ`)
   und/oder deutsche Adresse – auch unvollständig (nur Ort, nur PLZ, nur Straße)
2. **Kfz-Kennzeichen** (nur mit Bindestrich, z. B. `M-AB 1234`) – Standard, E, H, Saison, Kurzzeit (03/04), rote (05/06/07), Ausfuhr,
   Behörden, Bundeswehr (Y), THW, BP/BD/BW, Diplomaten (0), NATO (X)
3. **Telefonnummer** – national/international, E.164-Normalisierung, Mobil/Festnetz/Service
4. **E-Mail**
5. **Versicherungsscheinnummer** – Schema `94.122.123.4`

Werden Kriterien gemischt (z. B. Name + Telefonnummer), wird die Suche mit Hinweis abgelehnt.

- `cities.js` – Liste bekannter Städte (Ort ohne PLZ erkennen)
- `parser.js` – Erkennungslogik (`SearchParser.analyze(text)`), auch in Node nutzbar
- `app.js` – Oberfläche
- `test-cli.js` – `node test-cli.js "Müller, Max 1.1.80"` gibt die Interpretation aus

## Wie Name, Straße und Ort unterschieden werden

| Begriff | Erkennungsmerkmal |
|---|---|
| Straße | Endung (-straße, -str., -weg, -allee, -platz, -ring …), folgende Hausnummer oder Anfang „Am/An der/Zur …“ |
| Ort | nach 5-stelliger PLZ, nach der Straße oder in der Städteliste |
| Nachname | erster verbleibender Begriff |
| Vorname | Begriff direkt nach Komma hinter dem Nachnamen |

Einzelbegriffe (`Essen`, `Berlin`, `Müller`) sind grundsätzlich mehrdeutig: Die Seite zeigt die
wahrscheinlichere Lesart und die Alternative an.
