// Minimal valid PDF fixture with extractable text and optional metadata.
export function makePdf({title='Efficient Memory Systems',authors='Alice Smith, Bob Jones',metadata=true,scanned=false}={}) {
 const escape=s=>s.replace(/([\\()])/g,'\\$1');
 const rows=scanned?[]:[[18,740,title],[12,710,authors],[10,690,'Example University'],[10,670,'Proceedings of ISCA 2024'],[10,650,'doi:10.1234/memory.2024'],[12,620,'Abstract'],[10,600,'Memory hierarchy and data movement affect accelerator performance.'],[12,560,'1 Introduction'],[10,540,'The main paper starts here.']];
 const stream=rows.map(([size,y,text])=>`BT /F1 ${size} Tf 54 ${y} Td (${escape(text)}) Tj ET`).join('\n');
 const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',`<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,metadata?`<< /Title (${escape(title)}) /Author (${escape(authors)}) /CreationDate (D:20261110000000) >>`:'<< >>'];
 let pdf='%PDF-1.4\n';const offsets=[0];
 objects.forEach((obj,i)=>{offsets.push(Buffer.byteLength(pdf));pdf+=`${i+1} 0 obj\n${obj}\nendobj\n`;});
 const xref=Buffer.byteLength(pdf);
 pdf+=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n`+offsets.slice(1).map(n=>`${String(n).padStart(10,'0')} 00000 n \n`).join('');
 pdf+=`trailer\n<< /Size ${objects.length+1} /Root 1 0 R /Info 6 0 R >>\nstartxref\n${xref}\n%%EOF`;
 return Buffer.from(pdf);
}
