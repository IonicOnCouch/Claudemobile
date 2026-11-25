const P = require('./parser.js');
const today = new Date(2026,10,25);
for (const s of process.argv.slice(2).length ? process.argv.slice(2) : [
 'Max Müller', 'Müller, Max', 'Müller Max', 'Hans Peter von Bergen', 'Max Mustermann 01.01.1980',
 'Max Mustermann, Hauptstr. 5, 12345 Berlin', 'Musterstraße 12a 80331 München', 'Am Alten Markt 3, 50667 Köln',
 'Frau Dr. Anna Schmidt geb. Meier *3.4.75', 'Erika Mustermann 12. März 1964 Heidestraße 17 51147 Köln',
 '01.01.1980', '01011980', 'Schmidt, Anna, An der Alster 5, Hamburg', '60311 Frankfurt am Main',
 'M-AB 1234', 'm ab 123', 'MAB123', 'B MW 123E', 'HH-AB 12H', 'S AB 123 04-10', 'M 04123', 'M-06123', 'K 07 12',
 'M 1234', 'Y-123 456', '0 166-1', 'THW 12345', 'BP 12-345', 'Ring 3', 'Weg 5',
 '+49 30 1234567', '0151 12345678', '030/1234567', '0049 (0) 89 123456', '+43 1 5123456', '08912345678',
 'max.mustermann@Example.DE', 'foo@bar', 'mailto:a.b@c.de',
 '94.122.123.4', '941221234', '94 122 123 4', '94.122.123',
 'Max Müller max@test.de', 'Max Müller 0171 1234567', 'Max Müller M-AB 123', 'Max Müller 94.122.123.4',
 '31.02.1980', '12345678', 'Hauptstraße 5', 'Max Müller, Alte Landstraße 12, 21614 Buxtehude', 'Mülheim an der Ruhr', '45468 Mülheim an der Ruhr', 'Schmidt-Müller, Anna-Lena'
]) {
  const r = P.analyze(s, {today});
  console.log('\n> '+s+'  =>  '+(r.label||'—'));
  r.params.forEach(p=>console.log('   '+p.label+': '+p.value+(p.note?'  ('+p.note+')':'')));
  r.warnings.forEach(w=>console.log('   ! '+w));
  r.errors.forEach(w=>console.log('   X '+w));
  r.alternatives.forEach(a=>console.log('   ~ '+a.label));
}
