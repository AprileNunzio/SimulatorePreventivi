import PreventivoForm from './PreventivoForm.js';
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
};