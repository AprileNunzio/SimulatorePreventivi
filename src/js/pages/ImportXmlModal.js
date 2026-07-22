import { toast, Modal, Router } from '../utils.js';

const OPZIONI_CONFLITTO = [
  { value: 'mantieni_locale', label: 'Mantieni dati locali' },
  { value: 'sovrascrivi', label: 'Sovrascrivi con importati' },
  { value: 'duplica', label: 'Crea come nuovo (duplica)' }
];

function escapeHtml(v) {
  return String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function renderDiff(diff) {
  if (!diff) return '';
  return `<div style="font-size:11px;color:var(--text-muted);margin:4px 0 8px">
    ${Object.entries(diff).map(([field, v]) =>
      `<div><strong>${escapeHtml(field)}:</strong> locale "<em>${escapeHtml(v.locale)}</em>" &rarr; importato "<em>${escapeHtml(v.importato)}</em>"</div>`
    ).join('')}
  </div>`;
}

function renderConflictBlock(item, kind, label) {
  const opts = OPZIONI_CONFLITTO.map((o, i) =>
    `<label style="display:flex;align-items:center;gap:6px;margin-right:16px;font-size:12px;cursor:pointer">
      <input type="radio" name="res-${kind}-${item.uuid}" value="${o.value}" ${i === 0 ? 'checked' : ''}> ${o.label}
    </label>`
  ).join('');
  return `
    <div class="card" style="padding:10px 12px;margin-bottom:8px;background:var(--bg-surface)">
      <div style="font-weight:600;font-size:13px">${escapeHtml(label)}</div>
      ${renderDiff(item.diff)}
      <div style="display:flex;flex-wrap:wrap;margin-top:4px">${opts}</div>
    </div>`;
}

export default {
  async importXmlModal() {
    const res = await window.electronAPI.analyzeImportXml();
    if (!res.success) {
      if (res.error !== 'canceled') toast('Errore: ' + res.error, 'error');
      return;
    }

    const { filePath, preview } = res;
    const conflittiCollab = preview.collaboratori.filter(c => c.stato === 'conflitto');
    const conflittiProd = preview.prodotti.filter(p => p.stato === 'conflitto');
    const nuoviCollab = preview.collaboratori.filter(c => c.stato === 'nuovo').length;
    const nuoviProd = preview.prodotti.filter(p => p.stato === 'nuovo').length;

    let bodyHtml = `
      <div style="background:var(--bg-surface);border:1px solid var(--border);border-radius:8px;padding:12px;margin-bottom:16px">
        <div style="font-weight:700;font-size:14px">${escapeHtml(preview.preventivo.codice)} — ${escapeHtml(preview.preventivo.titolo)}</div>
        <div style="font-size:12px;color:var(--text-muted);margin-top:2px">Cliente: ${escapeHtml(preview.preventivo.cliente_nome)}</div>
        <div style="font-size:12px;color:var(--text-muted);margin-top:6px">
          ${preview.preventivo.nVoci} voci · ${preview.preventivo.nCollaboratori} collaboratori (${nuoviCollab} nuovi) · ${preview.preventivo.nProdotti} prodotti magazzino (${nuoviProd} nuovi)
        </div>
      </div>`;

    if (preview.preventivoEsistente) {
      bodyHtml += `
        <div style="background:var(--bg-surface);border:1px solid var(--warning);border-radius:8px;padding:12px;margin-bottom:16px">
          <div style="font-weight:600;font-size:13px;color:var(--warning)">⚠️ Preventivo già presente</div>
          <div style="font-size:12px;color:var(--text-secondary);margin:6px 0">
            È già presente localmente il preventivo <strong>${escapeHtml(preview.preventivoEsistente.codice)}</strong>
            (${escapeHtml(preview.preventivoEsistente.titolo)}), importato in precedenza.
          </div>
          <label style="display:flex;align-items:center;gap:6px;font-size:12px;margin-top:4px;cursor:pointer">
            <input type="radio" name="res-preventivo" value="nuovo" checked> Importa come nuovo preventivo separato
          </label>
          <label style="display:flex;align-items:center;gap:6px;font-size:12px;margin-top:4px;cursor:pointer">
            <input type="radio" name="res-preventivo" value="aggiorna"> Aggiorna il preventivo esistente (sovrascrive voci e collaboratori assegnati)
          </label>
        </div>`;
    }

    if (conflittiCollab.length || conflittiProd.length) {
      bodyHtml += `<div style="font-weight:700;font-size:13px;margin:12px 0 8px">Conflitti da risolvere</div>`;
      conflittiCollab.forEach(c => {
        bodyHtml += renderConflictBlock(c, 'collab', `👤 ${c.nome} ${c.cognome}`);
      });
      conflittiProd.forEach(p => {
        bodyHtml += renderConflictBlock(p, 'prod', `📦 ${p.descrizione}`);
      });
    }

    Modal.show('Importa Preventivo da XML', bodyHtml, `
      <button class="btn btn-ghost" onclick="Modal.close()">Annulla</button>
      <button class="btn btn-primary" id="m-confirm-import">Importa</button>
    `, { size: 'lg' });

    document.getElementById('m-confirm-import')?.addEventListener('click', async () => {
      const btn = document.getElementById('m-confirm-import');
      btn.textContent = 'Importazione in corso...';
      btn.disabled = true;

      const resolutions = { collaboratori: {}, prodotti: {} };
      resolutions.preventivo = document.querySelector('input[name="res-preventivo"]:checked')?.value || 'nuovo';
      conflittiCollab.forEach(c => {
        resolutions.collaboratori[c.uuid] = document.querySelector(`input[name="res-collab-${c.uuid}"]:checked`)?.value || 'mantieni_locale';
      });
      conflittiProd.forEach(p => {
        resolutions.prodotti[p.uuid] = document.querySelector(`input[name="res-prod-${p.uuid}"]:checked`)?.value || 'mantieni_locale';
      });

      const confirmRes = await window.electronAPI.confirmImportXml(filePath, resolutions);
      if (confirmRes.success) {
        toast('Preventivo importato con successo!', 'success');
        Modal.close();
        Router.navigate('preventivo-detail', { id: confirmRes.preventivoId, mode: 'view' });
      } else {
        toast('Errore importazione: ' + confirmRes.error, 'error');
        btn.textContent = 'Importa';
        btn.disabled = false;
      }
    });
  }
};
