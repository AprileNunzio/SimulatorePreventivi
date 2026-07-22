const { XMLBuilder } = require('fast-xml-parser');

function money(v) { return (parseFloat(v) || 0).toFixed(2); }
function qty(v) { return (parseFloat(v) || 0).toFixed(2); }

function soloCifre(v) {
  return String(v || '').replace(/[^0-9]/g, '');
}

function generateFatturaPaXml(fattura, voci = [], impostazioni = {}) {
  const pivaAzienda = soloCifre(impostazioni.azienda_piva);
  const cfAzienda = (impostazioni.azienda_cf || '').trim();
  const progressivoInvio = String(fattura.progressivo || fattura.id).padStart(5, '0');

  const codiceDestinatario = (fattura.cliente_codice_destinatario || '').trim() || '0000000';
  const pecDestinatario = (fattura.cliente_pec || '').trim();

  const isPA = parseInt(fattura.cliente_pa) === 1;
  const formatoTrasmissione = isPA ? 'FPA12' : 'FPR12';
  const splitPayment = parseInt(fattura.split_payment) === 1;
  const haRitenuta = parseInt(fattura.ritenuta_acconto) === 1 && parseFloat(fattura.importo_ritenuta) > 0;
  const haCassa = parseInt(fattura.cassa_previdenziale_attiva) === 1 && parseFloat(fattura.importo_cassa) > 0;

  const datiTrasmissione = {
    IdTrasmittente: { IdPaese: 'IT', IdCodice: pivaAzienda },
    ProgressivoInvio: progressivoInvio,
    FormatoTrasmissione: formatoTrasmissione,
    CodiceDestinatario: codiceDestinatario
  };
  if (codiceDestinatario === '0000000' && pecDestinatario) {
    datiTrasmissione.PECDestinatario = pecDestinatario;
  }

  const cedenteAnagrafici = {
    ...(pivaAzienda ? { IdFiscaleIVA: { IdPaese: 'IT', IdCodice: pivaAzienda } } : {}),
    ...(cfAzienda ? { CodiceFiscale: cfAzienda } : {}),
    Anagrafica: { Denominazione: impostazioni.azienda_ragione_sociale || impostazioni.azienda_nome || '' },
    RegimeFiscale: fattura.regime_fiscale || 'RF01'
  };

  const cessionarioAnagrafici = {
    ...(fattura.cliente_piva ? { IdFiscaleIVA: { IdPaese: fattura.cliente_nazione || 'IT', IdCodice: soloCifre(fattura.cliente_piva) } } : {}),
    ...(fattura.cliente_cf ? { CodiceFiscale: fattura.cliente_cf } : {}),
    Anagrafica: { Denominazione: fattura.cliente_ragione_sociale || fattura.cliente_nome || '' }
  };

  const riepilogoMap = new Map();

  const dettaglioLinee = voci.map((v, idx) => {
    const aliquotaRiga = parseFloat(v.aliquota_iva !== undefined ? v.aliquota_iva : fattura.iva_percentuale) || 0;
    const naturaRiga = aliquotaRiga === 0 ? (v.natura_iva || fattura.natura_iva || 'N2.2') : '';
    const prezzoTotale = parseFloat(v.totale_riga) || 0;

    const linea = {
      NumeroLinea: idx + 1,
      Descrizione: v.descrizione,
      Quantita: qty(v.quantita),
      UnitaMisura: v.unita_misura || 'pz',
      PrezzoUnitario: money(v.prezzo_unitario),
      PrezzoTotale: money(prezzoTotale),
      AliquotaIVA: money(aliquotaRiga)
    };
    if (naturaRiga) linea.Natura = naturaRiga;

    const key = `${aliquotaRiga}_${naturaRiga}`;
    const curr = riepilogoMap.get(key) || { aliquota: aliquotaRiga, natura: naturaRiga, imponibile: 0, imposta: 0 };
    curr.imponibile += prezzoTotale;
    curr.imposta += Math.round(prezzoTotale * (aliquotaRiga / 100) * 100) / 100;
    riepilogoMap.set(key, curr);

    return linea;
  });

  const datiRiepilogo = Array.from(riepilogoMap.values()).map(r => {
    const res = {
      AliquotaIVA: money(r.aliquota),
      ImponibileImporto: money(r.imponibile),
      Imposta: money(r.imposta)
    };
    if (r.natura) res.Natura = r.natura;
    if (r.aliquota > 0) res.EsigibilitaIVA = splitPayment ? 'S' : 'I';
    return res;
  });

  const datiGeneraliDocumento = {
    TipoDocumento: fattura.tipo_documento || 'TD01',
    Divisa: 'EUR',
    Data: fattura.data_fattura,
    Numero: fattura.numero,
    ImportoTotaleDocumento: money(fattura.totale_fattura)
  };

  if (fattura.note) datiGeneraliDocumento.Causale = fattura.note;

  if (parseInt(fattura.bollo_virtuale) === 1) {
    datiGeneraliDocumento.DatiBollo = { BolloVirtuale: 'SI', ImportoBollo: money(fattura.importo_bollo || 2.00) };
  }

  if (haRitenuta) {
    datiGeneraliDocumento.DatiRitenuta = {
      TipoRitenuta: fattura.ritenuta_acconto_tipo || 'RT02',
      ImportoRitenuta: money(fattura.importo_ritenuta),
      AliquotaRitenuta: money(fattura.ritenuta_acconto_percentuale),
      CausalePagamento: fattura.ritenuta_acconto_causale || 'A'
    };
  }

  if (haCassa) {
    datiGeneraliDocumento.DatiCassaPrevidenziale = {
      TipoCassa: fattura.cassa_previdenziale_tipo || 'TC03',
      AlCassa: money(fattura.cassa_previdenziale_percentuale),
      ImportoContributoCassa: money(fattura.importo_cassa),
      ImponibileCassa: money(fattura.totale_imponibile),
      AliquotaIVA: money(voci[0]?.aliquota_iva || fattura.iva_percentuale || 22)
    };
  }

  const importoPagamentoNetto = Math.max(0, (parseFloat(fattura.totale_fattura) || 0) - (haRitenuta ? parseFloat(fattura.importo_ritenuta) : 0));

  const obj = {
    'p:FatturaElettronica': {
      '@_xmlns:p': 'http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2',
      '@_xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
      '@_versione': formatoTrasmissione,
      FatturaElettronicaHeader: {
        DatiTrasmissione: datiTrasmissione,
        CedentePrestatore: {
          DatiAnagrafici: cedenteAnagrafici,
          Sede: {
            Indirizzo: impostazioni.azienda_indirizzo || '',
            CAP: impostazioni.azienda_cap || '',
            Comune: impostazioni.azienda_citta || '',
            Provincia: impostazioni.azienda_provincia || '',
            Nazione: 'IT'
          }
        },
        CessionarioCommittente: {
          DatiAnagrafici: cessionarioAnagrafici,
          Sede: {
            Indirizzo: fattura.cliente_indirizzo || '',
            CAP: fattura.cliente_cap || '',
            Comune: fattura.cliente_citta || '',
            Provincia: fattura.cliente_provincia || '',
            Nazione: fattura.cliente_nazione || 'IT'
          }
        }
      },
      FatturaElettronicaBody: {
        DatiGenerali: {
          DatiGeneraliDocumento: datiGeneraliDocumento
        },
        DatiBeniServizi: {
          DettaglioLinee: dettaglioLinee,
          DatiRiepilogo: datiRiepilogo
        },
        DatiPagamento: {
          CondizioniPagamento: 'TP02',
          DettaglioPagamento: {
            ModalitaPagamento: fattura.modalita_pagamento || 'MP05',
            ImportoPagamento: money(importoPagamentoNetto),
            ...(fattura.iban ? { IBAN: fattura.iban } : {})
          }
        }
      }
    }
  };

  const builder = new XMLBuilder({ ignoreAttributes: false, attributeNamePrefix: '@_', format: true, suppressEmptyNode: true });
  const xml = '<?xml version="1.0" encoding="UTF-8"?>\n' + builder.build(obj);

  const filename = `IT${pivaAzienda}_${progressivoInvio}.xml`;
  return { xml, filename };
}

module.exports = { generateFatturaPaXml };
