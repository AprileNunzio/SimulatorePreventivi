const CAP_LOCAL_MAP = {
  '20100': { comune: 'Milano', provincia: 'MI' },
  '20121': { comune: 'Milano', provincia: 'MI' },
  '20122': { comune: 'Milano', provincia: 'MI' },
  '00100': { comune: 'Roma', provincia: 'RM' },
  '00187': { comune: 'Roma', provincia: 'RM' },
  '80100': { comune: 'Napoli', provincia: 'NA' },
  '10100': { comune: 'Torino', provincia: 'TO' },
  '90100': { comune: 'Palermo', provincia: 'PA' },
  '16100': { comune: 'Genova', provincia: 'GE' },
  '40100': { comune: 'Bologna', provincia: 'BO' },
  '50100': { comune: 'Firenze', provincia: 'FI' },
  '70100': { comune: 'Bari', provincia: 'BA' },
  '95100': { comune: 'Catania', provincia: 'CT' },
  '30100': { comune: 'Venezia', provincia: 'VE' },
  '37100': { comune: 'Verona', provincia: 'VR' },
  '98100': { comune: 'Messina', provincia: 'ME' },
  '35100': { comune: 'Padova', provincia: 'PD' },
  '34100': { comune: 'Trieste', provincia: 'TS' },
  '25100': { comune: 'Brescia', provincia: 'BS' },
  '47900': { comune: 'Rimini', provincia: 'RN' },
  '09100': { comune: 'Cagliari', provincia: 'CA' },
  '41100': { comune: 'Modena', provincia: 'MO' },
  '43100': { comune: 'Parma', provincia: 'PR' },
  '06100': { comune: 'Perugia', provincia: 'PG' },
  '57100': { comune: 'Livorno', provincia: 'LI' },
  '48100': { comune: 'Ravenna', provincia: 'RA' },
  '60100': { comune: 'Ancona', provincia: 'AN' },
  '38100': { comune: 'Trento', provincia: 'TN' },
  '39100': { comune: 'Bolzano', provincia: 'BZ' }
};

export async function lookupCapInfo(capRaw) {
  const cap = String(capRaw || '').trim();
  if (!/^\d{5}$/.test(cap)) return null;

  if (CAP_LOCAL_MAP[cap]) {
    return { ...CAP_LOCAL_MAP[cap], nazione: 'IT' };
  }

  try {
    const res = await fetch(`https://api.zippopotam.us/it/${cap}`);
    if (res.ok) {
      const data = await res.json();
      if (data.places && data.places.length > 0) {
        const place = data.places[0];
        const comune = place['place name'];
        const provincia = place['state abbreviation'] || '';
        return { comune, provincia, nazione: 'IT' };
      }
    }
  } catch (e) {}

  return null;
}

export function bindCapAutoFill(capInputEl, cittaInputEl, provInputEl, nazInputEl) {
  if (!capInputEl) return;

  capInputEl.addEventListener('input', async () => {
    const val = capInputEl.value.trim();
    if (val.length === 5) {
      const info = await lookupCapInfo(val);
      if (info) {
        if (cittaInputEl) cittaInputEl.value = info.comune;
        if (provInputEl) provInputEl.value = info.provincia;
        if (nazInputEl) nazInputEl.value = info.nazione;

        cittaInputEl?.dispatchEvent(new Event('change'));
        provInputEl?.dispatchEvent(new Event('change'));
        nazInputEl?.dispatchEvent(new Event('change'));
      }
    }
  });
}
