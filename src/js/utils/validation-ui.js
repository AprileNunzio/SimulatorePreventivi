function resolveEl(arg) {
  if (!arg) return null;
  if (typeof arg === 'string') return document.getElementById(arg);
  if (typeof arg === 'object' && arg.nodeType === 1) return arg;
  return null;
}

export function bindPivaCfValidator(arg1, arg2, arg3 = {}) {
  let pivaInputEl = null;
  let cfInputEl = null;
  let options = {};

  if (arg1 && typeof arg1 === 'object' && !arg1.nodeType) {
    pivaInputEl = resolveEl(arg1.pivaInputId || arg1.pivaInput || arg1.piva);
    cfInputEl = resolveEl(arg1.cfInputId || arg1.cfInput || arg1.cf);
    options = arg1;
  } else {
    pivaInputEl = resolveEl(arg1);
    cfInputEl = resolveEl(arg2);
    options = arg3 || {};
  }

  const currentId = options.currentId || null;
  const type = options.type || 'cliente';

  const ensureFeedbackEl = (inputEl) => {
    if (!inputEl) return null;
    let fb = inputEl.parentNode ? inputEl.parentNode.querySelector('.val-feedback') : null;
    if (!fb && inputEl.parentNode) {
      fb = document.createElement('div');
      fb.className = 'val-feedback';
      fb.style.fontSize = '12px';
      fb.style.marginTop = '4px';
      fb.style.fontWeight = '500';
      inputEl.parentNode.appendChild(fb);
    }
    return fb;
  };

  let timer = null;

  const validate = async () => {
    const piva = pivaInputEl?.value || '';
    const cf = cfInputEl?.value || '';

    const fbPiva = ensureFeedbackEl(pivaInputEl);
    const fbCf = ensureFeedbackEl(cfInputEl);

    if (!piva && !cf) {
      if (fbPiva) { fbPiva.textContent = ''; if (pivaInputEl) pivaInputEl.style.borderColor = ''; }
      if (fbCf) { fbCf.textContent = ''; if (cfInputEl) cfInputEl.style.borderColor = ''; }
      return;
    }

    try {
      const res = await window.electronAPI.checkPivaCf({ piva, cf, currentId, type });

      if (pivaInputEl && fbPiva) {
        if (!res.validPiva && piva.length > 0) {
          fbPiva.textContent = '⚠️ Partita IVA non valida';
          fbPiva.style.color = 'var(--danger, #ef4444)';
          pivaInputEl.style.borderColor = 'var(--danger, #ef4444)';
        } else if (res.duplicatePiva) {
          fbPiva.textContent = `⚠️ P.IVA già presente: ${res.duplicatePiva}`;
          fbPiva.style.color = '#f59e0b';
          pivaInputEl.style.borderColor = '#f59e0b';
        } else {
          fbPiva.textContent = piva.length === 11 ? '✓ P.IVA Valida' : '';
          fbPiva.style.color = '#10b981';
          pivaInputEl.style.borderColor = piva.length === 11 ? '#10b981' : '';
        }
      }

      if (cfInputEl && fbCf) {
        if (!res.validCf && cf.length > 0) {
          fbCf.textContent = '⚠️ Codice Fiscale non valido';
          fbCf.style.color = 'var(--danger, #ef4444)';
          cfInputEl.style.borderColor = 'var(--danger, #ef4444)';
        } else if (res.duplicateCf) {
          fbCf.textContent = `⚠️ C.F. già presente: ${res.duplicateCf}`;
          fbCf.style.color = '#f59e0b';
          cfInputEl.style.borderColor = '#f59e0b';
        } else {
          fbCf.textContent = (cf.length === 16 || cf.length === 11) ? '✓ C.F. Valido' : '';
          fbCf.style.color = '#10b981';
          cfInputEl.style.borderColor = (cf.length === 16 || cf.length === 11) ? '#10b981' : '';
        }
      }
    } catch (e) {}
  };

  const handleInput = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(validate, 350);
  };

  if (pivaInputEl && pivaInputEl.addEventListener) pivaInputEl.addEventListener('input', handleInput);
  if (cfInputEl && cfInputEl.addEventListener) cfInputEl.addEventListener('input', handleInput);
}
