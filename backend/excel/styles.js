// backend/excel/styles.js

const S = {
  // --- FONTS ---
  fontTitle: { name: 'Segoe UI', size: 18, bold: true, color: { argb: 'FF0F172A' } }, // Slate 900
  fontSubtitle: { name: 'Segoe UI', size: 12, bold: false, color: { argb: 'FF475569' } }, // Slate 600
  fontBold: { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FF0F172A' } },
  fontNormal: { name: 'Segoe UI', size: 11, color: { argb: 'FF334155' } },
  fontHeaderTable: { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FFFFFFFF' } }, // White
  fontTotalHighlight: { name: 'Segoe UI', size: 14, bold: true, color: { argb: 'FF0F172A' } },
  
  // --- FILLS / BACKGROUNDS ---
  fillHeaderTable: {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1D4ED8' } // Blue 700 (Primary)
  },
  fillTotalRow: {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF1F5F9' } // Slate 100
  },
  fillZebra: {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF8FAFC' } // Slate 50
  },

  // --- BORDERS ---
  borderThinAll: {
    top: { style: 'thin', color: { argb: 'FFE2E8F0' } }, // Slate 200
    left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
  },
  borderBottomThick: {
    bottom: { style: 'medium', color: { argb: 'FF94A3B8' } } // Slate 400
  },
  borderTopThick: {
    top: { style: 'medium', color: { argb: 'FF94A3B8' } }
  },

  // --- ALIGNMENTS ---
  alignCenter: { vertical: 'middle', horizontal: 'center', wrapText: true },
  alignLeft: { vertical: 'middle', horizontal: 'left', wrapText: true },
  alignRight: { vertical: 'middle', horizontal: 'right', wrapText: true },

  // --- FORMATS ---
  formatCurrency: '€ #,##0.00',
  formatPercent: '0.00%'
};

// Configura la stampa per il foglio per assicurare che stia tutto in 1 pagina di larghezza
function setupPageForPrinting(sheet) {
  sheet.pageSetup.paperSize = 9; // A4
  sheet.pageSetup.orientation = 'portrait';
  sheet.pageSetup.fitToPage = true;
  sheet.pageSetup.fitToWidth = 1;
  sheet.pageSetup.fitToHeight = 0; // 0 = illimitato in altezza
  sheet.pageSetup.margins = {
    left: 0.5, right: 0.5,
    top: 0.75, bottom: 0.75,
    header: 0.3, footer: 0.3
  };
}

module.exports = {
  S,
  setupPageForPrinting
};
