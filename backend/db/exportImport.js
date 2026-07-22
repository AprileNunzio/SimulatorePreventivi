const fs = require('fs');
const { XMLBuilder, XMLParser } = require('fast-xml-parser');
const core = require('./core');
const { run, get, all, runTransaction, generateCodice, ricalcolaPreventivo, newUuid } = core;

const ARRAY_TAGS = ['voce', 'collaboratore', 'assegnazione', 'prodotto', 'categoria'];

const COLLAB_DIFF_FIELDS = ['nome', 'cognome', 'email', 'telefono', 'ruolo', 'partita_iva', 'codice_fiscale', 'iban', 'percentuale_commissione', 'note'];
const PRODOTTO_DIFF_FIELDS = ['descrizione', 'codice_articolo', 'ean_barcode', 'unita_misura', 'prezzo_acquisto', 'prezzo_vendita', 'spese_accessorie', 'sconto_percentuale', 'brand', 'fornitore', 'giacenza', 'scorta_minima', 'posizione_scaffale', 'peso_kg', 'dimensioni', 'descrizione_lunga'];

function str(v) { return (v === undefined || v === null) ? '' : String(v); }
function num(v, def = 0) {
  if (v === undefined || v === null || v === '') return def;
  const n = parseFloat(v);
  return isNaN(n) ? def : n;
}
function arr(v) {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

function diffFields(local, incoming, fields) {
  const diff = {};
  let hasDiff = false;
  fields.forEach(f => {
    const lv = local[f] === undefined || local[f] === null ? '' : local[f];
    const iv = incoming[f] === undefined || incoming[f] === null ? '' : incoming[f];
    if (String(lv).trim() !== String(iv).trim()) {
      diff[f] = { locale: lv, importato: iv };
      hasDiff = true;
    }
  });
  return hasDiff ? diff : null;
}

function matchCollaboratore(incoming) {
  if (incoming.uuid) {
    const byUuid = get('SELECT * FROM collaboratori WHERE uuid = ?', [incoming.uuid]);
    if (byUuid) return byUuid;
  }
  if (incoming.email && incoming.email.trim() !== '') {
    const byEmail = get('SELECT * FROM collaboratori WHERE LOWER(email) = LOWER(?) AND email != \'\'', [incoming.email.trim()]);
    if (byEmail) return byEmail;
  }
  if (incoming.nome && incoming.cognome) {
    const byNome = get('SELECT * FROM collaboratori WHERE LOWER(nome) = LOWER(?) AND LOWER(cognome) = LOWER(?)', [incoming.nome.trim(), incoming.cognome.trim()]);
    if (byNome) return byNome;
  }
  return null;
}

function matchProdotto(incoming) {
  if (incoming.uuid) {
    const byUuid = get('SELECT * FROM prodotti_magazzino WHERE uuid = ?', [incoming.uuid]);
    if (byUuid) return byUuid;
  }
  if (incoming.ean_barcode && incoming.ean_barcode.trim() !== '') {
    const byEan = get('SELECT * FROM prodotti_magazzino WHERE ean_barcode = ? AND ean_barcode != \'\'', [incoming.ean_barcode.trim()]);
    if (byEan) return byEan;
  }
  if (incoming.codice_articolo && incoming.codice_articolo.trim() !== '') {
    const byCod = get('SELECT * FROM prodotti_magazzino WHERE codice_articolo = ? AND codice_articolo != \'\'', [incoming.codice_articolo.trim()]);
    if (byCod) return byCod;
  }
  if (incoming.descrizione && incoming.descrizione.trim() !== '') {
    const byDesc = get('SELECT * FROM prodotti_magazzino WHERE LOWER(descrizione) = LOWER(?)', [incoming.descrizione.trim()]);
    if (byDesc) return byDesc;
  }
  return null;
}

function matchCategoria(incoming) {
  if (incoming.uuid) {
    const byUuid = get('SELECT * FROM categorie_prodotti WHERE uuid = ?', [incoming.uuid]);
    if (byUuid) return byUuid;
  }
  if (incoming.nome && incoming.nome.trim() !== '') {
    const byNome = get('SELECT * FROM categorie_prodotti WHERE LOWER(nome) = LOWER(?)', [incoming.nome.trim()]);
    if (byNome) return byNome;
  }
  return null;
}

function exportPreventivoToXml(preventivoId) {
  const prev = get('SELECT * FROM preventivi WHERE id = ?', [preventivoId]);
  if (!prev) throw new Error('Preventivo non trovato.');

  const voci = all('SELECT * FROM voci_preventivo WHERE preventivo_id = ? ORDER BY ordine', [preventivoId]);
  const assegnazioni = all('SELECT * FROM assegnazioni_preventivo WHERE preventivo_id = ?', [preventivoId]);

  const magazzinoIds = [...new Set(voci.filter(v => v.magazzino_id).map(v => v.magazzino_id))];
  const prodotti = magazzinoIds.map(id => get('SELECT * FROM prodotti_magazzino WHERE id = ?', [id])).filter(Boolean);

  const categoriaIds = [...new Set(prodotti.filter(p => p.categoria_id).map(p => p.categoria_id))];
  const categorie = categoriaIds.map(id => get('SELECT * FROM categorie_prodotti WHERE id = ?', [id])).filter(Boolean);

  const collaboratoreIds = [...new Set(assegnazioni.map(a => a.collaboratore_id))];
  const collaboratori = collaboratoreIds.map(id => get('SELECT * FROM collaboratori WHERE id = ?', [id])).filter(Boolean);

  const magazzinoUuidById = {};
  prodotti.forEach(p => { magazzinoUuidById[p.id] = p.uuid; });
  const categoriaUuidById = {};
  categorie.forEach(c => { categoriaUuidById[c.id] = c.uuid; });
  const collaboratoreUuidById = {};
  collaboratori.forEach(c => { collaboratoreUuidById[c.id] = c.uuid; });

  const obj = {
    preventivoExport: {
      '@_versione': '1.0',
      '@_app': 'Simulatore Preventivi',
      '@_dataExport': new Date().toISOString(),
      preventivo: {
        '@_uuid': prev.uuid,
        codice: prev.codice, titolo: prev.titolo,
        cliente_nome: prev.cliente_nome, cliente_ragione_sociale: prev.cliente_ragione_sociale,
        cliente_piva: prev.cliente_piva, cliente_cf: prev.cliente_cf,
        cliente_email: prev.cliente_email, cliente_telefono: prev.cliente_telefono,
        cliente_indirizzo: prev.cliente_indirizzo, cliente_citta: prev.cliente_citta, cliente_cap: prev.cliente_cap,
        data_creazione: prev.data_creazione, data_scadenza: prev.data_scadenza, stato: prev.stato,
        note_interne: prev.note_interne, note_cliente: prev.note_cliente,
        condizioni_pagamento: prev.condizioni_pagamento, iva_percentuale: prev.iva_percentuale
      },
      voci: {
        voce: voci.map(v => ({
          '@_uuid': v.uuid,
          '@_magazzinoRef': v.magazzino_id ? (magazzinoUuidById[v.magazzino_id] || '') : '',
          descrizione: v.descrizione, descrizione_estesa: v.descrizione_estesa,
          quantita: v.quantita, unita_misura: v.unita_misura,
          prezzo_acquisto: v.prezzo_acquisto, prezzo_vendita: v.prezzo_vendita,
          spese_accessorie: v.spese_accessorie, sconto_percentuale: v.sconto_percentuale,
          ordine: v.ordine
        }))
      },
      collaboratori: {
        collaboratore: collaboratori.map(c => ({
          '@_uuid': c.uuid,
          nome: c.nome, cognome: c.cognome, email: c.email, telefono: c.telefono, ruolo: c.ruolo,
          partita_iva: c.partita_iva, codice_fiscale: c.codice_fiscale, iban: c.iban,
          percentuale_commissione: c.percentuale_commissione, note: c.note
        }))
      },
      assegnazioni: {
        assegnazione: assegnazioni.map(a => ({
          '@_uuid': a.uuid,
          '@_collaboratoreRef': collaboratoreUuidById[a.collaboratore_id] || '',
          tipo_compenso: a.tipo_compenso, compenso_fisso: a.compenso_fisso,
          percentuale_applicata: a.percentuale_applicata, titolo_voce: a.titolo_voce,
          prezzo_al_cliente: a.prezzo_al_cliente, note: a.note
        }))
      },
      prodottiMagazzino: {
        prodotto: prodotti.map(p => ({
          '@_uuid': p.uuid,
          '@_categoriaRef': p.categoria_id ? (categoriaUuidById[p.categoria_id] || '') : '',
          codice_articolo: p.codice_articolo, descrizione: p.descrizione, descrizione_lunga: p.descrizione_lunga,
          unita_misura: p.unita_misura, prezzo_acquisto: p.prezzo_acquisto, prezzo_vendita: p.prezzo_vendita,
          spese_accessorie: p.spese_accessorie, sconto_percentuale: p.sconto_percentuale,
          giacenza: p.giacenza, scorta_minima: p.scorta_minima, fornitore: p.fornitore, brand: p.brand,
          posizione_scaffale: p.posizione_scaffale, peso_kg: p.peso_kg, dimensioni: p.dimensioni, ean_barcode: p.ean_barcode
        }))
      },
      categorie: {
        categoria: categorie.map(c => ({ '@_uuid': c.uuid, nome: c.nome, colore: c.colore }))
      }
    }
  };

  const builder = new XMLBuilder({ ignoreAttributes: false, attributeNamePrefix: '@_', format: true, suppressEmptyNode: true });
  const xml = '<?xml version="1.0" encoding="UTF-8"?>\n' + builder.build(obj);
  return { xml, codice: prev.codice };
}

function parseImportXml(raw) {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    isArray: (name) => ARRAY_TAGS.includes(name)
  });

  let doc;
  try {
    doc = parser.parse(raw);
  } catch (e) {
    throw new Error('File XML non leggibile o corrotto.');
  }

  const root = doc && doc.preventivoExport;
  if (!root || !root.preventivo || !root.preventivo['@_uuid']) {
    throw new Error('File XML non valido: non è un export di un preventivo di Simulatore Preventivi.');
  }

  const p = root.preventivo;
  const preventivo = {
    uuid: str(p['@_uuid']),
    codice: str(p.codice), titolo: str(p.titolo),
    cliente_nome: str(p.cliente_nome), cliente_ragione_sociale: str(p.cliente_ragione_sociale),
    cliente_piva: str(p.cliente_piva), cliente_cf: str(p.cliente_cf),
    cliente_email: str(p.cliente_email), cliente_telefono: str(p.cliente_telefono),
    cliente_indirizzo: str(p.cliente_indirizzo), cliente_citta: str(p.cliente_citta), cliente_cap: str(p.cliente_cap),
    data_creazione: str(p.data_creazione), data_scadenza: str(p.data_scadenza), stato: str(p.stato) || 'bozza',
    note_interne: str(p.note_interne), note_cliente: str(p.note_cliente),
    condizioni_pagamento: str(p.condizioni_pagamento), iva_percentuale: num(p.iva_percentuale, 22)
  };

  if (!preventivo.titolo || !preventivo.cliente_nome) {
    throw new Error('File XML non valido: dati del preventivo incompleti.');
  }

  const voci = arr(root.voci && root.voci.voce).map(v => ({
    uuid: str(v['@_uuid']), magazzinoRef: str(v['@_magazzinoRef']),
    descrizione: str(v.descrizione), descrizione_estesa: str(v.descrizione_estesa),
    quantita: num(v.quantita, 1), unita_misura: str(v.unita_misura) || 'pz',
    prezzo_acquisto: num(v.prezzo_acquisto), prezzo_vendita: num(v.prezzo_vendita),
    spese_accessorie: num(v.spese_accessorie), sconto_percentuale: num(v.sconto_percentuale),
    ordine: num(v.ordine)
  }));

  const collaboratori = arr(root.collaboratori && root.collaboratori.collaboratore).map(c => ({
    uuid: str(c['@_uuid']),
    nome: str(c.nome), cognome: str(c.cognome), email: str(c.email), telefono: str(c.telefono),
    ruolo: str(c.ruolo), partita_iva: str(c.partita_iva), codice_fiscale: str(c.codice_fiscale),
    iban: str(c.iban), percentuale_commissione: num(c.percentuale_commissione), note: str(c.note)
  }));

  const assegnazioni = arr(root.assegnazioni && root.assegnazioni.assegnazione).map(a => ({
    uuid: str(a['@_uuid']), collaboratoreRef: str(a['@_collaboratoreRef']),
    tipo_compenso: str(a.tipo_compenso) || 'percentuale', compenso_fisso: num(a.compenso_fisso),
    percentuale_applicata: num(a.percentuale_applicata), titolo_voce: str(a.titolo_voce) || 'Installazione',
    prezzo_al_cliente: num(a.prezzo_al_cliente), note: str(a.note)
  }));

  const prodotti = arr(root.prodottiMagazzino && root.prodottiMagazzino.prodotto).map(p2 => ({
    uuid: str(p2['@_uuid']), categoriaRef: str(p2['@_categoriaRef']),
    codice_articolo: str(p2.codice_articolo), descrizione: str(p2.descrizione), descrizione_lunga: str(p2.descrizione_lunga),
    unita_misura: str(p2.unita_misura) || 'pz', prezzo_acquisto: num(p2.prezzo_acquisto), prezzo_vendita: num(p2.prezzo_vendita),
    spese_accessorie: num(p2.spese_accessorie), sconto_percentuale: num(p2.sconto_percentuale),
    giacenza: num(p2.giacenza), scorta_minima: num(p2.scorta_minima), fornitore: str(p2.fornitore), brand: str(p2.brand),
    posizione_scaffale: str(p2.posizione_scaffale), peso_kg: num(p2.peso_kg), dimensioni: str(p2.dimensioni), ean_barcode: str(p2.ean_barcode)
  }));

  const categorie = arr(root.categorie && root.categorie.categoria).map(c => ({
    uuid: str(c['@_uuid']), nome: str(c.nome), colore: str(c.colore) || '#808080'
  }));

  return { preventivo, voci, collaboratori, assegnazioni, prodotti, categorie };
}

function analyzeImportXml(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const data = parseImportXml(raw);

  const preventivoEsistente = data.preventivo.uuid
    ? get('SELECT id, codice, titolo, stato, updated_at FROM preventivi WHERE uuid = ?', [data.preventivo.uuid])
    : null;

  const collaboratori = data.collaboratori.map(c => {
    const match = matchCollaboratore(c);
    if (!match) return { uuid: c.uuid, nome: c.nome, cognome: c.cognome, stato: 'nuovo' };
    const diff = diffFields(match, c, COLLAB_DIFF_FIELDS);
    return { uuid: c.uuid, nome: c.nome, cognome: c.cognome, stato: diff ? 'conflitto' : 'identico', diff };
  });

  const prodotti = data.prodotti.map(p => {
    const match = matchProdotto(p);
    if (!match) return { uuid: p.uuid, descrizione: p.descrizione, stato: 'nuovo' };
    const diff = diffFields(match, p, PRODOTTO_DIFF_FIELDS);
    return { uuid: p.uuid, descrizione: p.descrizione, stato: diff ? 'conflitto' : 'identico', diff };
  });

  return {
    preventivo: {
      codice: data.preventivo.codice, titolo: data.preventivo.titolo,
      cliente_nome: data.preventivo.cliente_nome, stato: data.preventivo.stato,
      nVoci: data.voci.length, nCollaboratori: data.collaboratori.length, nProdotti: data.prodotti.length
    },
    preventivoEsistente: preventivoEsistente
      ? { id: preventivoEsistente.id, codice: preventivoEsistente.codice, titolo: preventivoEsistente.titolo, stato: preventivoEsistente.stato }
      : null,
    collaboratori,
    prodotti
  };
}

function confirmImportXml(filePath, resolutions = {}) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const data = parseImportXml(raw);
  const collabRes = resolutions.collaboratori || {};
  const prodRes = resolutions.prodotti || {};
  const prevRes = resolutions.preventivo || 'nuovo';

  let newPreventivoId = null;

  runTransaction(() => {
    // Categorie
    const categoriaMap = {};
    data.categorie.forEach(cat => {
      const match = matchCategoria(cat);
      if (match) {
        categoriaMap[cat.uuid] = match.id;
      } else {
        run('INSERT INTO categorie_prodotti (nome, colore, uuid) VALUES (?, ?, ?)', [cat.nome || 'Senza nome', cat.colore || '#808080', cat.uuid || newUuid()]);
        categoriaMap[cat.uuid] = get('SELECT id FROM categorie_prodotti ORDER BY id DESC LIMIT 1').id;
      }
    });

    // Prodotti magazzino
    const prodottoMap = {};
    data.prodotti.forEach(p => {
      const match = matchProdotto(p);
      const scelta = match ? (prodRes[p.uuid] || 'mantieni_locale') : 'nuovo';
      const categoriaId = p.categoriaRef ? (categoriaMap[p.categoriaRef] || null) : null;

      if (!match || scelta === 'nuovo' || scelta === 'duplica') {
        const descrizione = scelta === 'duplica' ? `${p.descrizione} (importato)` : p.descrizione;
        run(`
          INSERT INTO prodotti_magazzino (
            codice_articolo, descrizione, descrizione_lunga, categoria_id, unita_misura,
            prezzo_acquisto, prezzo_vendita, spese_accessorie, sconto_percentuale,
            giacenza, scorta_minima, fornitore, brand, posizione_scaffale, peso_kg, dimensioni, ean_barcode, uuid
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          p.codice_articolo, descrizione, p.descrizione_lunga, categoriaId, p.unita_misura,
          p.prezzo_acquisto, p.prezzo_vendita, p.spese_accessorie, p.sconto_percentuale,
          p.giacenza, p.scorta_minima, p.fornitore, p.brand, p.posizione_scaffale, p.peso_kg, p.dimensioni, p.ean_barcode,
          scelta === 'duplica' ? newUuid() : (p.uuid || newUuid())
        ]);
        prodottoMap[p.uuid] = get('SELECT id FROM prodotti_magazzino ORDER BY id DESC LIMIT 1').id;
      } else if (scelta === 'sovrascrivi') {
        run(`
          UPDATE prodotti_magazzino SET
            codice_articolo=?, descrizione=?, descrizione_lunga=?, categoria_id=?, unita_misura=?,
            prezzo_acquisto=?, prezzo_vendita=?, spese_accessorie=?, sconto_percentuale=?,
            giacenza=?, scorta_minima=?, fornitore=?, brand=?, posizione_scaffale=?, peso_kg=?, dimensioni=?, ean_barcode=?,
            updated_at=datetime('now')
          WHERE id=?
        `, [
          p.codice_articolo, p.descrizione, p.descrizione_lunga, categoriaId, p.unita_misura,
          p.prezzo_acquisto, p.prezzo_vendita, p.spese_accessorie, p.sconto_percentuale,
          p.giacenza, p.scorta_minima, p.fornitore, p.brand, p.posizione_scaffale, p.peso_kg, p.dimensioni, p.ean_barcode,
          match.id
        ]);
        prodottoMap[p.uuid] = match.id;
      } else {
        // mantieni_locale / identico
        prodottoMap[p.uuid] = match.id;
      }
    });

    // Collaboratori
    const collaboratoreMap = {};
    data.collaboratori.forEach(c => {
      const match = matchCollaboratore(c);
      const scelta = match ? (collabRes[c.uuid] || 'mantieni_locale') : 'nuovo';

      if (!match || scelta === 'nuovo' || scelta === 'duplica') {
        const nome = scelta === 'duplica' ? `${c.nome} (importato)` : c.nome;
        run(`
          INSERT INTO collaboratori (nome, cognome, email, telefono, ruolo, partita_iva, codice_fiscale, iban, percentuale_commissione, note, attivo, uuid)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
        `, [nome, c.cognome, c.email, c.telefono, c.ruolo, c.partita_iva, c.codice_fiscale, c.iban, c.percentuale_commissione, c.note,
          scelta === 'duplica' ? newUuid() : (c.uuid || newUuid())]);
        collaboratoreMap[c.uuid] = get('SELECT id FROM collaboratori ORDER BY id DESC LIMIT 1').id;
      } else if (scelta === 'sovrascrivi') {
        run(`
          UPDATE collaboratori SET nome=?, cognome=?, email=?, telefono=?, ruolo=?, partita_iva=?, codice_fiscale=?, iban=?, percentuale_commissione=?, note=?, updated_at=datetime('now')
          WHERE id=?
        `, [c.nome, c.cognome, c.email, c.telefono, c.ruolo, c.partita_iva, c.codice_fiscale, c.iban, c.percentuale_commissione, c.note, match.id]);
        collaboratoreMap[c.uuid] = match.id;
      } else {
        collaboratoreMap[c.uuid] = match.id;
      }
    });

    // Preventivo
    const existing = data.preventivo.uuid ? get('SELECT id FROM preventivi WHERE uuid = ?', [data.preventivo.uuid]) : null;
    let preventivoId;
    if (existing && prevRes === 'aggiorna') {
      preventivoId = existing.id;
      run(`
        UPDATE preventivi SET
          titolo=?, cliente_nome=?, cliente_ragione_sociale=?, cliente_piva=?, cliente_cf=?,
          cliente_email=?, cliente_telefono=?, cliente_indirizzo=?, cliente_citta=?, cliente_cap=?,
          data_scadenza=?, note_interne=?, note_cliente=?, condizioni_pagamento=?, iva_percentuale=?,
          updated_at=datetime('now')
        WHERE id=?
      `, [
        data.preventivo.titolo, data.preventivo.cliente_nome, data.preventivo.cliente_ragione_sociale,
        data.preventivo.cliente_piva, data.preventivo.cliente_cf, data.preventivo.cliente_email,
        data.preventivo.cliente_telefono, data.preventivo.cliente_indirizzo, data.preventivo.cliente_citta,
        data.preventivo.cliente_cap, data.preventivo.data_scadenza, data.preventivo.note_interne,
        data.preventivo.note_cliente, data.preventivo.condizioni_pagamento, data.preventivo.iva_percentuale,
        preventivoId
      ]);
      run('DELETE FROM voci_preventivo WHERE preventivo_id = ?', [preventivoId]);
      run('DELETE FROM assegnazioni_preventivo WHERE preventivo_id = ?', [preventivoId]);
    } else {
      const codice = generateCodice();
      run(`
        INSERT INTO preventivi (
          codice, titolo, cliente_nome, cliente_ragione_sociale, cliente_piva, cliente_cf,
          cliente_email, cliente_telefono, cliente_indirizzo, cliente_citta, cliente_cap,
          data_creazione, data_scadenza, stato, note_interne, note_cliente, condizioni_pagamento, iva_percentuale,
          uuid, uuid_origine
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'bozza', ?, ?, ?, ?, ?, ?)
      `, [
        codice, data.preventivo.titolo, data.preventivo.cliente_nome, data.preventivo.cliente_ragione_sociale,
        data.preventivo.cliente_piva, data.preventivo.cliente_cf, data.preventivo.cliente_email,
        data.preventivo.cliente_telefono, data.preventivo.cliente_indirizzo, data.preventivo.cliente_citta,
        data.preventivo.cliente_cap, new Date().toISOString().split('T')[0], data.preventivo.data_scadenza,
        data.preventivo.note_interne, data.preventivo.note_cliente, data.preventivo.condizioni_pagamento,
        data.preventivo.iva_percentuale, newUuid(), data.preventivo.uuid
      ]);
      preventivoId = get('SELECT id FROM preventivi ORDER BY id DESC LIMIT 1').id;
    }

    // Voci
    data.voci.forEach((v, idx) => {
      const magazzinoId = v.magazzinoRef ? (prodottoMap[v.magazzinoRef] || null) : null;
      run(`
        INSERT INTO voci_preventivo (
          preventivo_id, descrizione, descrizione_estesa, quantita, unita_misura,
          prezzo_acquisto, prezzo_vendita, spese_accessorie, sconto_percentuale, ordine, magazzino_id, uuid
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        preventivoId, v.descrizione, v.descrizione_estesa, v.quantita, v.unita_misura,
        v.prezzo_acquisto, v.prezzo_vendita, v.spese_accessorie, v.sconto_percentuale, idx, magazzinoId, v.uuid || newUuid()
      ]);
    });

    // Assegnazioni
    data.assegnazioni.forEach(a => {
      const collaboratoreId = a.collaboratoreRef ? collaboratoreMap[a.collaboratoreRef] : null;
      if (!collaboratoreId) return;
      run(`
        INSERT OR REPLACE INTO assegnazioni_preventivo (
          preventivo_id, collaboratore_id, tipo_compenso, compenso_fisso, percentuale_applicata,
          compenso_calcolato, titolo_voce, prezzo_al_cliente, note, uuid
        ) VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?)
      `, [
        preventivoId, collaboratoreId, a.tipo_compenso, a.compenso_fisso, a.percentuale_applicata,
        a.titolo_voce, a.prezzo_al_cliente, a.note, a.uuid || newUuid()
      ]);
    });

    newPreventivoId = preventivoId;
    ricalcolaPreventivo(preventivoId);
  });

  return { success: true, preventivoId: newPreventivoId };
}

module.exports = {
  exportPreventivoToXml,
  analyzeImportXml,
  confirmImportXml
};
