import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  HeadingLevel,
} from "docx";

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportTableToExcel(fields, rows, filename = "table") {
  const worksheet = XLSX.utils.json_to_sheet(rows, { header: fields });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

export function exportTableToPDF(fields, rows, filename = "table", title = "Extracted Data") {
  const doc = new jsPDF({ orientation: fields.length > 5 ? "landscape" : "portrait" });
  doc.setFontSize(14);
  doc.text(title, 14, 15);
  autoTable(doc, {
    startY: 22,
    head: [fields],
    body: rows.map((row) => fields.map((f) => String(row[f] ?? ""))),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [37, 99, 235] },
  });
  doc.save(`${filename}.pdf`);
}

export async function exportTableToDocx(fields, rows, filename = "table", title = "Extracted Data") {
  const headerRow = new TableRow({
    tableHeader: true,
    children: fields.map(
      (f) =>
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: f, bold: true })] })],
        })
    ),
  });

  const bodyRows = rows.map(
    (row) =>
      new TableRow({
        children: fields.map(
          (f) => new TableCell({ children: [new Paragraph(String(row[f] ?? ""))] })
        ),
      })
  );

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({ text: title, heading: HeadingLevel.HEADING_1 }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [headerRow, ...bodyRows],
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  downloadBlob(blob, `${filename}.docx`);
}
