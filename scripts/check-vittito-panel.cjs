const fs = require('fs');
const src = fs.readFileSync('panel-admin/app.js', 'utf8');
const start = src.indexOf('const VIT_UMBRALES');
const end = src.indexOf('Quiet-Hours editor (preferencia_notificacion)');
if (start < 0 || end < 0 || end < start) { console.error('BLOQUE-NO-ENCONTRADO'); process.exit(1); }
const block = src.slice(start, end);
// stub mínimo de document para vittitoRender
let captured = '';
global.document = {
  getElementById: (id) => {
    if (id === 'vittitoList') {
      return { set innerHTML(v) { captured = v; }, get innerHTML() { return captured; } };
    }
    return { value: '', addEventListener: () => {} };
  }
};
eval(block);
// Caso crítico: FC 112 + SpO2 93 + pasos 1200 + sueño 300
const crit = vittitoSimular({ fc: '112', spo2: '93', sis: '', dia: '', temp: '', pasos: '1200', sueno: '300' });
console.log('CRIT-IDS:', crit.map(s => s.id).join(','));
const expectCrit = ['fc-alta', 'spo2-baja', 'sueno-corto', 'pasos-bajos'];
console.log('CRIT-OK:', JSON.stringify(crit.map(s => s.id)) === JSON.stringify(expectCrit));
// Caso normal
const norm = vittitoSimular({ fc: '72', spo2: '98', sis: '118', dia: '76', temp: '36.6', pasos: '8000', sueno: '480' });
console.log('NORM-EMPTY:', norm.length === 0);
// Bordes (igual al umbral => no dispara)
const edge = vittitoSimular({ fc: '100', spo2: '95', sis: '129', dia: '84', temp: '37.5', pasos: '5000', sueno: '360' });
console.log('EDGE-EMPTY:', edge.length === 0);
// Render
vittitoRender(crit);
console.log('RENDER-HAS-FC:', captured.includes('fc-alta'));
console.log('RENDER-HAS-ALTA-BADGE:', captured.includes('alert-badge Alta'));
vittitoRender([]);
console.log('RENDER-EMPTY-MSG:', captured.includes('Todo en orden'));
