import { toast } from "../../utils.js";

export default {
  async exportXml(prevId) {
    const id = prevId || this.data?.id;
    if (!id) { toast('Preventivo non trovato', 'error'); return; }

    const res = await window.electronAPI.exportPreventivoXml(id);
    if (res.success) {
      toast('Preventivo esportato in XML con successo!', 'success');
      window.electronAPI.showItemInFolder(res.filePath);
    } else if (res.error !== 'canceled') {
      toast('Errore: ' + res.error, 'error');
    }
  }
};
