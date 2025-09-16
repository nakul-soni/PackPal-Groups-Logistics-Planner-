// Export checklist to PDF using jsPDF
window.PackPalExport = window.PackPalExport || {};

(function(){
    async function exportChecklistToPDF(){
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const { db } = PackPal.firebase;
        const itemsSnap = await db.ref('items').get();
        const items = itemsSnap.val() || {};
        const rows = Object.values(items).map(i => [i.name, i.trip || '-', i.assignedToName || '-', i.status || 'unpacked']);

        let y = 14;
        doc.setFont('helvetica','bold');
        doc.setFontSize(16);
        doc.text('PackPal Checklist', 14, y);
        y += 8;
        doc.setFont('helvetica','normal');
        doc.setFontSize(11);
        doc.text('Item', 14, y);
        doc.text('Trip', 80, y);
        doc.text('Assigned', 120, y);
        doc.text('Status', 170, y);
        y += 6;
        rows.forEach(r => {
            if (y > 280){ doc.addPage(); y = 14; }
            doc.text(String(r[0]), 14, y);
            doc.text(String(r[1]), 80, y);
            doc.text(String(r[2]), 120, y);
            doc.text(String(r[3]), 170, y);
            y += 6;
        });
        doc.save('packpal-checklist.pdf');
    }

    PackPalExport = { exportChecklistToPDF };
})();


