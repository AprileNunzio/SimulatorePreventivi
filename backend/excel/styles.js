
const S = {
  fontTitle: { name: 'Segoe UI', size: 18, bold: true, color: { argb: 'FF0F172A' } }, 
  fontSubtitle: { name: 'Segoe UI', size: 12, bold: false, color: { argb: 'FF475569' } }, 
  fontBold: { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FF0F172A' } },
  fontNormal: { name: 'Segoe UI', size: 11, color: { argb: 'FF334155' } },
  fontHeaderTable: { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FFFFFFFF' } }, 
  fontTotalHighlight: { name: 'Segoe UI', size: 14, bold: true, color: { argb: 'FF0F172A' } },

  fillHeaderTable: {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1D4ED8' } 
  },
  fillTotalRow: {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF1F5F9' } 
  },
  fillZebra: {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF8FAFC' } 
  },

  borderThinAll: {
    top: { style: 'thin', color: { argb: 'FFE2E8F0' } }, 
    left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
  },
  borderBottomThick: {
    bottom: { style: 'medium', color: { argb: 'FF94A3B8' } } 
  },
  borderTopThick: {
    top: { style: 'medium', color: { argb: 'FF94A3B8' } }
  },

  alignCenter: { vertical: 'middle', horizontal: 'center', wrapText: true },
  alignLeft: { vertical: 'middle', horizontal: 'left', wrapText: true },
  alignRight: { vertical: 'middle', horizontal: 'right', wrapText: true },

  formatCurrency: '€ #,##0.00',
  formatPercent: '0.00%'
};

function setupPageForPrinting(sheet) {
  sheet.pageSetup.paperSize = 9; 
  sheet.pageSetup.orientation = 'portrait';
  sheet.pageSetup.fitToPage = true;
  sheet.pageSetup.fitToWidth = 1;
  sheet.pageSetup.fitToHeight = 0; 
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
