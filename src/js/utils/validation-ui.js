export function bindPivaCfValidator(pivaInputEl, cfInputEl, options = {}) {
  const { currentId, type = 'cliente' } = options;

  const ensureFeedbackEl = (inputEl) => {
    if (!inputEl) return null;
    let fb = inputEl.parentNode.querySelector('.val-feedback');
    if (!fb) {
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
      if (fbPiva) { fbPiva.textContent = ''; pivaInputEl.style.borderColor = ''; }
      if (fbCf) { fbCf.textContent = ''; cfInputEl.style.borderColor = ''; }
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

  pivaInputEl?.addEventListener('input', handleInput);
  cfInputEl?.addEventListener('input', handleInput);
}
