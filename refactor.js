const fs = require('fs');
const path = require('path');

const srcFile = 'src/js/pages/preventivo-detail.js.bak';
const code = fs.readFileSync(srcFile, 'utf8');

const getMethod = (m) => {
  const r = new RegExp('  (?:async )?' + m + '\\([\\s\\S]*?\\) {[\\s\\S]*?\\n  },?');
  const match = code.match(r);
  return match ? match[0].replace(/,$/, '') : '';
};

fs.writeFileSync('src/js/pages/preventivo/PreventivoForm.js',
  'import { toast, Router } from "../../utils.js";\n\nexport default {\n' + getMethod('renderForm') + ',\n' + getMethod('saveForm') + '\n};'
);

fs.writeFileSync('src/js/pages/preventivo/PreventivoView.js',
  'import { fmt, statoBadge, Router } from "../../utils.js";\nimport VociManager from "./VociManager.js";\nimport RiepilogoWidget from "./RiepilogoWidget.js";\nimport CollaboratoriManager from "./CollaboratoriManager.js";\nimport ActionModals from "./ActionModals.js";\n\nexport default {\n' + getMethod('renderView') + '\n};'
);

fs.writeFileSync('src/js/pages/preventivo/VociManager.js',
  'import { fmt, toast, Modal } from "../../utils.js";\nimport RiepilogoWidget from "./RiepilogoWidget.js";\n\nexport default {\n' + getMethod('renderVoci') + ',\n' + getMethod('addVoce') + ',\n' + getMethod('updateVoce') + ',\n' + getMethod('deleteVoce') + '\n};'
);

fs.writeFileSync('src/js/pages/preventivo/RiepilogoWidget.js',
  'import { fmt, marginePill } from "../../utils.js";\n\nexport default {\n' + getMethod('renderRiepilogo') + '\n};'
);

fs.writeFileSync('src/js/pages/preventivo/CollaboratoriManager.js',
  'import { fmt, toast, Modal } from "../../utils.js";\nimport RiepilogoWidget from "./RiepilogoWidget.js";\n\nexport default {\n' + getMethod('renderCollaboratori') + ',\n' + getMethod('addCollab') + ',\n' + getMethod('removeCollab') + '\n};'
);

fs.writeFileSync('src/js/pages/preventivo/ActionModals.js',
  'import { toast, Modal } from "../../utils.js";\n\nexport default {\n' + getMethod('openDocModal') + ',\n' + getMethod('exportPdf') + ',\n' + getMethod('exportExcel') + ',\n' + getMethod('sendEmailModal') + '\n};'
);

const indexJs = `import PreventivoForm from './PreventivoForm.js';
import PreventivoView from './PreventivoView.js';
import VociManager from './VociManager.js';
import RiepilogoWidget from './RiepilogoWidget.js';
import CollaboratoriManager from './CollaboratoriManager.js';
import ActionModals from './ActionModals.js';

export default {
  data: null,
  mode: 'view',

  async render(el, params = {}) {
    if (params.mode === 'create') {
      this.mode = 'create';
      this.data = null;
      PreventivoForm.renderForm.call(this, el, null);
      return;
    }
    if (params.id) {
      const prev = await window.electronAPI.getPreventivoById(params.id);
      this.data = prev;
      if (params.mode === 'edit') {
        this.mode = 'edit';
        PreventivoForm.renderForm.call(this, el, prev);
      } else {
        this.mode = 'view';
        PreventivoView.renderView.call(this, el, prev);
      }
    }
  },

  async saveForm(el, id) {
    return PreventivoForm.saveForm.call(this, el, id);
  },

  renderVoci(el, voci, prevId) {
    return VociManager.renderVoci.call(this, el, voci, prevId);
  },
  addVoce(prevId, el) {
    return VociManager.addVoce.call(this, prevId, el);
  },
  updateVoce(voceId, field, value, prevId) {
    return VociManager.updateVoce.call(this, voceId, field, value, prevId);
  },
  deleteVoce(voceId, prevId, el) {
    return VociManager.deleteVoce.call(this, voceId, prevId, el);
  },

  renderRiepilogo(el, prev) {
    return RiepilogoWidget.renderRiepilogo.call(this, el, prev);
  },

  renderCollaboratori(el, assegnazioni, prevId) {
    return CollaboratoriManager.renderCollaboratori.call(this, el, assegnazioni, prevId);
  },
  addCollab(prevId, el) {
    return CollaboratoriManager.addCollab.call(this, prevId, el);
  },
  removeCollab(prevId, collabId, el) {
    return CollaboratoriManager.removeCollab.call(this, prevId, collabId, el);
  },

  openDocModal(prevId) {
    return ActionModals.openDocModal.call(this, prevId);
  },
  exportPdf(prevId) {
    return ActionModals.exportPdf.call(this, prevId);
  },
  exportExcel(prevId) {
    return ActionModals.exportExcel.call(this, prevId);
  },
  sendEmailModal(prevId) {
    return ActionModals.sendEmailModal.call(this, prevId);
  }
};`;

fs.writeFileSync('src/js/pages/preventivo/index.js', indexJs);
console.log('done');
