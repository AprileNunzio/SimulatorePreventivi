const fs = require('fs');
const path = require('path');

const UNITA_LABELS = { pz: 'pezzi', kg: 'kg', mt: 'metri', lt: 'litri', h: 'ore', cf: 'confezioni' };

function formatData(dateStr) {
  const d = dateStr ? new Date(dateStr) : new Date();
  if (isNaN(d.getTime())) return String(dateStr);
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatQuantitaUnita(quantita, unitaMisura) {
  const unit = String(unitaMisura || 'pz').toLowerCase();
  const label = UNITA_LABELS[unit] || unit;
  return `${quantita} ${label}`;
}

function formatRigaTxt(riga) {
  const quantitaUnita = formatQuantitaUnita(riga.quantita, riga.unitaMisura);
  if (riga.codice) {
    return `${quantitaUnita} di ${riga.codice} - ${riga.descrizione}`;
  }
  return `${quantitaUnita} di ${riga.descrizione}`;
}

function buildSupplierOrderTxt(preventivo, gruppi) {
  const lines = [];
  lines.push(`ORDINE DI ACQUISTO - Preventivo ${preventivo.codice || ''}`.trim());
  if (preventivo.titolo) lines.push(preventivo.titolo);
  lines.push(`Cliente: ${preventivo.cliente_ragione_sociale || preventivo.cliente_nome || '-'}`);
  lines.push(`Generato il ${formatData()}`);
  lines.push('='.repeat(50));

  gruppi.forEach(g => {
    lines.push('');
    lines.push(g.fornitore.toUpperCase());
    lines.push('-'.repeat(50));
    g.righe.forEach(r => lines.push(formatRigaTxt(r)));
  });

  return lines.join('\n') + '\n';
}

async function generateSupplierOrderTxtFile({ preventivo, gruppi }) {
  const contenuto = buildSupplierOrderTxt(preventivo, gruppi);

  const dateObj = new Date();
  const dateStr = `${dateObj.getFullYear()}${String(dateObj.getMonth() + 1).padStart(2, '0')}${String(dateObj.getDate()).padStart(2, '0')}`;
  const cleanCodice = (preventivo.codice || 'PREV').replace(/[\\/]/g, '-');
  const filename = `${dateStr}_ORDINE-FORNITORI_${cleanCodice}.txt`;
  const outputPath = path.join(global.EXPORTS_TXT_PATH, filename);

  await fs.promises.writeFile(outputPath, contenuto, 'utf8');

  return { success: true, filePath: outputPath };
}

module.exports = { formatRigaTxt, formatQuantitaUnita, buildSupplierOrderTxt, generateSupplierOrderTxtFile };
