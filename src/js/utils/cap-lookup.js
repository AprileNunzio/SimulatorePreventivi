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

function resolveEl(arg) {
  if (!arg) return null;
  if (typeof arg === 'string') return document.getElementById(arg);
  if (typeof arg === 'object' && arg.nodeType === 1) return arg;
  return null;
}

export function bindCapAutoFill(arg1, arg2, arg3, arg4) {
  let capEl = null;
  let cittaEl = null;
  let provEl = null;
  let nazEl = null;

  if (arg1 && typeof arg1 === 'object' && !arg1.nodeType) {
    capEl = resolveEl(arg1.capInputId || arg1.capInput || arg1.cap);
    cittaEl = resolveEl(arg1.cittaInputId || arg1.cittaInput || arg1.citta);
    provEl = resolveEl(arg1.provinciaInputId || arg1.provInputId || arg1.provincia);
    nazEl = resolveEl(arg1.nazioneInputId || arg1.nazInputId || arg1.nazione);
  } else {
    capEl = resolveEl(arg1);
    cittaEl = resolveEl(arg2);
    provEl = resolveEl(arg3);
    nazEl = resolveEl(arg4);
  }

  if (!capEl || !capEl.addEventListener) return;

  capEl.addEventListener('input', async () => {
    const val = capEl.value.trim();
    if (val.length === 5) {
      const info = await lookupCapInfo(val);
      if (info) {
        if (cittaEl) cittaEl.value = info.comune;
        if (provEl) provEl.value = info.provincia;
        if (nazEl) nazEl.value = info.nazione;

        cittaEl?.dispatchEvent(new Event('change'));
        provEl?.dispatchEvent(new Event('change'));
        nazEl?.dispatchEvent(new Event('change'));
      }
    }
  });
}
