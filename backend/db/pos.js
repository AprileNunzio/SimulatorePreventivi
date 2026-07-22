const core = require('./core');
const { run, get, all, runTransaction, persistDb } = core;
const lottiDb = require('./lotti');
const backup = require('./backup');
const triggerBackup = (...args) => backup.triggerBackup(...args);

function getSessioneAttiva() {
  return get(`SELECT * FROM pos_sessioni WHERE stato = 'APERTA' ORDER BY id DESC LIMIT 1`);
}

function apriSessioneCassa(fondoCassa = 0, note = '') {
  const attiva = getSessioneAttiva();
  if (attiva) return { success: true, sessione: attiva };

  run(`
    INSERT INTO pos_sessioni (fondo_cassa_iniziale, note, stato)
    VALUES (?, ?, 'APERTA')
  `, [parseFloat(fondoCassa) || 0, note]);

  const nuova = getSessioneAttiva();
  persistDb();
  triggerBackup();
  return { success: true, sessione: nuova };
}

function registraScontrino(data) {
  let sessione = getSessioneAttiva();
  if (!sessione) {
    const res = apriSessioneCassa(0, 'Apertura Automatica');
    sessione = res.sessione;
  }

  const numScontrino = `SC-${sessione.id}-${(sessione.totale_scontrini || 0) + 1}`;
  const totaleLordo = parseFloat(data.totale_lordo) || 0;
  const scontoTotale = parseFloat(data.sconto_totale) || 0;
  const totaleNetto = parseFloat(data.totale_netto) || (totaleLordo - scontoTotale);
  const importoPagato = parseFloat(data.importo_pagato) || totaleNetto;
  const resto = parseFloat(data.resto) || (importoPagato - totaleNetto);
  const metodoPagamento = data.pagamento_metodo || 'CONTANTI';

  let scontrinoId = null;

  runTransaction(() => {
    run(`
      INSERT INTO pos_scontrini (
        sessione_id, numero_scontrino, totale_lordo, sconto_totale, totale_netto,
        pagamento_metodo, importo_pagato, resto, cliente_id, operatore
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      sessione.id, numScontrino, totaleLordo, scontoTotale, totaleNetto,
      metodoPagamento, importoPagato, resto, data.cliente_id || null, data.operatore || 'system'
    ]);

    const sc = get('SELECT id FROM pos_scontrini ORDER BY id DESC LIMIT 1');
    scontrinoId = sc.id;

    if (Array.isArray(data.righe)) {
      for (const riga of data.righe) {
        let lottoId = riga.lotto_id || null;

        // Se il prodotto è gestito a lotti ma non è stato specificato un lotto, usa FEFO
        if (!lottoId && riga.prodotto_id) {
          const prodotto = get('SELECT gestione_lotti FROM prodotti_magazzino WHERE id = ?', [riga.prodotto_id]);
          if (prodotto && prodotto.gestione_lotti) {
            const fefo = lottiDb.getFefoLotto(riga.prodotto_id);
            if (fefo) lottoId = fefo.id;
          }
        }

        run(`
          INSERT INTO pos_scontrino_righe (
            scontrino_id, prodotto_id, lotto_id, descrizione, quantita, unita_misura,
            prezzo_unitario, sconto_percentuale, totale_riga
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          scontrinoId, riga.prodotto_id, lottoId, riga.descrizione,
          parseFloat(riga.quantita) || 1, riga.unita_misura || 'pz',
          parseFloat(riga.prezzo_unitario) || 0, parseFloat(riga.sconto_percentuale) || 0,
          parseFloat(riga.totale_riga) || 0
        ]);

        // Scarico giacenza lotto o giacenza generale
        if (lottoId) {
          lottiDb.scalaGiacenzaLotto(lottoId, parseFloat(riga.quantita) || 1, 'VENDITA_CASSA', numScontrino, data.operatore);
        } else if (riga.prodotto_id) {
          run(`UPDATE prodotti_magazzino SET giacenza = MAX(0, giacenza - ?), frequenza_utilizzo = frequenza_utilizzo + 1 WHERE id = ?`,
            [parseFloat(riga.quantita) || 1, riga.prodotto_id]);
          run(`
            INSERT INTO movimenti_magazzino (prodotto_id, tipo_movimento, quantita, causale, riferimento_documento, prezzo_unitario, operatore)
            VALUES (?, 'SCARICO', ?, 'VENDITA_CASSA', ?, ?, ?)
          `, [riga.prodotto_id, parseFloat(riga.quantita) || 1, numScontrino, parseFloat(riga.prezzo_unitario) || 0, data.operatore || 'system']);
        }
      }
    }

    // Aggiorna totale sessione cassa
    if (metodoPagamento === 'CONTANTI') {
      run(`UPDATE pos_sessioni SET totale_incassato_contanti = totale_incassato_contanti + ?, totale_scontrini = totale_scontrini + 1 WHERE id = ?`, [totaleNetto, sessione.id]);
    } else if (metodoPagamento === 'CARTA') {
      run(`UPDATE pos_sessioni SET totale_incassato_pos = totale_incassato_pos + ?, totale_scontrini = totale_scontrini + 1 WHERE id = ?`, [totaleNetto, sessione.id]);
    } else {
      run(`UPDATE pos_sessioni SET totale_incassato_altri = totale_incassato_altri + ?, totale_scontrini = totale_scontrini + 1 WHERE id = ?`, [totaleNetto, sessione.id]);
    }
  });

  return { success: true, scontrinoId, numero_scontrino: numScontrino };
}

function chiudiSessioneCassaZ(note = '') {
  const sessione = getSessioneAttiva();
  if (!sessione) return { success: false, error: 'Nessuna sessione cassa aperta' };

  run(`
    UPDATE pos_sessioni SET
      data_chiusura = datetime('now'),
      stato = 'CHIUSA',
      note = ?
    WHERE id = ?
  `, [note, sessione.id]);

  const reportZ = get('SELECT * FROM pos_sessioni WHERE id = ?', [sessione.id]);
  persistDb();
  triggerBackup();
  return { success: true, reportZ };
}

function parseBarcodeAlimentare(barcode) {
  if (!barcode || typeof barcode !== 'string') return null;
  const trimmed = barcode.trim();

  // Decodifica EAN-13 Bilancia Banco (es. 20xxxxx o 21xxxxx o 29xxxxx)
  // Formato standard EAN-13 Bilancia: PP CCCCC VVVVV K
  // PP: Prefisso (20, 21, 22, 29)
  // CCCCC: Codice articolo a 5 cifre
  // VVVVV: Peso in grammi (es. 01500 = 1.500 kg) o Prezzo in centesimi
  const prefissiBilancia = ['20', '21', '22', '29'];
  const prefisso = trimmed.substring(0, 2);

  if (trimmed.length === 13 && prefissiBilancia.includes(prefisso)) {
    const codiceArticoloInterno = trimmed.substring(2, 7);
    const valoreVariabile = parseInt(trimmed.substring(7, 12), 10);
    const pesoKg = valoreVariabile / 1000.0; // Converte grammi in Kg

    // Cerca prodotto per codice articolo interno o ean_barcode
    const prod = get(`
      SELECT p.*, c.nome as categoria_nome 
      FROM prodotti_magazzino p
      LEFT JOIN categorie_prodotti c ON p.categoria_id = c.id
      WHERE p.codice_articolo = ? OR p.ean_barcode = ? OR p.codice_articolo = ?
    `, [codiceArticoloInterno, trimmed, `ART-${codiceArticoloInterno}`]);

    if (prod) {
      return {
        tipo: 'PESO_BILANCIA',
        prodotto: prod,
        peso_calcolato_kg: pesoKg,
        prezzo_totale_calcolato: (prod.prezzo_vendita * pesoKg).toFixed(2),
        raw_barcode: trimmed
      };
    }
  }

  // Cerca per EAN/Barcode standard o Codice Articolo esatto
  const prodStandard = get(`
    SELECT p.*, c.nome as categoria_nome 
    FROM prodotti_magazzino p
    LEFT JOIN categorie_prodotti c ON p.categoria_id = c.id
    WHERE p.ean_barcode = ? OR p.codice_articolo = ?
  `, [trimmed, trimmed]);

  if (prodStandard) {
    return {
      tipo: 'STANDARD',
      prodotto: prodStandard,
      peso_calcolato_kg: 1,
      prezzo_totale_calcolato: prodStandard.prezzo_vendita,
      raw_barcode: trimmed
    };
  }

  return { tipo: 'NON_TROVATO', raw_barcode: trimmed };
}

module.exports = {
  getSessioneAttiva,
  apriSessioneCassa,
  registraScontrino,
  chiudiSessioneCassaZ,
  parseBarcodeAlimentare
};
