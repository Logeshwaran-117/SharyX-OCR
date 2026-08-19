const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const { analyseBankingDocument } = require('../controllers/bankingController');
const BankingDocument = require('../models/BankingDocument');
const { answerBankingQuestion } = require('../services/bankingAiService');

// ── POST /api/banking/analyse ─────────────────────────────────────────────────
router.post('/analyse', upload.single('document'), analyseBankingDocument);

// ── GET /api/banking/history ──────────────────────────────────────────────────
router.get('/history', async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Not authenticated' });
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 12, 50);
    const search = (req.query.search || '').trim();
    const docType = req.query.type || 'all';

    const filter = { userId: req.user._id };
    if (search) filter.filename = { $regex: search, $options: 'i' };
    if (docType !== 'all') filter.documentType = docType;

    const total = await BankingDocument.countDocuments(filter);
    const totalPages = Math.max(Math.ceil(total / limit), 1);
    const safePage = Math.min(page, totalPages);

    const docs = await BankingDocument.find(filter)
      .select('-extractedText -transactions')
      .sort({ uploadedAt: -1 })
      .skip((safePage - 1) * limit)
      .limit(limit);

    res.json({ docs, total, page: safePage, totalPages });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch banking history' });
  }
});

// ── GET /api/banking/history/:id ──────────────────────────────────────────────
router.get('/history/:id', async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Not authenticated' });
    const doc = await BankingDocument.findOne({ _id: req.params.id, userId: req.user._id });
    if (!doc) return res.status(404).json({ message: 'Document not found' });
    res.json(doc);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch document' });
  }
});

// ── DELETE /api/banking/history/:id ──────────────────────────────────────────
router.delete('/history/:id', async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Not authenticated' });
    await BankingDocument.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete document' });
  }
});

// ── GET /api/banking/history/:id/chat ────────────────────────────────────────
router.get('/history/:id/chat', async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Not authenticated' });
    const doc = await BankingDocument.findOne({ _id: req.params.id, userId: req.user._id }).select('chatHistory');
    if (!doc) return res.status(404).json({ message: 'Not found' });
    res.json(doc.chatHistory || []);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch chat history' });
  }
});

// ── POST /api/banking/history/:id/chat ───────────────────────────────────────
router.post('/history/:id/chat', async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Not authenticated' });
    const { question } = req.body;
    if (!question?.trim()) return res.status(400).json({ message: 'Question required' });

    const doc = await BankingDocument.findOne({ _id: req.params.id, userId: req.user._id });
    if (!doc) return res.status(404).json({ message: 'Banking document not found' });

    if (!doc.chatHistory) doc.chatHistory = [];

    const answer = await answerBankingQuestion(
      doc.extractedText,
      doc.transactions || [],
      question.trim(),
      doc.chatHistory
    );

    doc.chatHistory.push({ role: 'user', text: question.trim() });
    doc.chatHistory.push({ role: 'assistant', text: answer });
    await doc.save();

    res.json({ answer, chatHistory: doc.chatHistory });
  } catch (err) {
    console.error('[bankingRoutes] Chat error:', err);
    res.status(500).json({ message: err.message || 'Failed to get answer' });
  }
});

// ── GET /api/banking/history/:id/export ──────────────────────────────────────
// format=csv (default) | xlsx | txt | pdf
router.get('/history/:id/export', async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Not authenticated' });
    const format = (req.query.format || 'csv').toLowerCase();
    const doc = await BankingDocument.findOne({ _id: req.params.id, userId: req.user._id })
      .select('transactions filename currency analytics summary accountName bankName periodStart periodEnd documentType');
    if (!doc) return res.status(404).json({ message: 'Not found' });

    const txs = doc.transactions || [];
    const safeName = (doc.filename || 'transactions').replace(/\.[^/.]+$/, '');
    const cur = doc.currency || 'USD';

    // ── CSV ──────────────────────────────────────────────────────────────
    if (format === 'csv') {
      const header = 'Date,Description,Debit,Credit,Balance,Category,Reference,Anomaly\n';
      const rows = txs.map(t =>
        [t.date, `"${(t.description || '').replace(/"/g, '""')}"`,
         t.debit ?? '', t.credit ?? '', t.balance ?? '',
         t.category || '', t.reference || '', t.isAnomaly ? 'YES' : ''].join(',')
      ).join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${safeName}_transactions.csv"`);
      return res.send(header + rows);
    }

    // ── TXT ──────────────────────────────────────────────────────────────
    if (format === 'txt') {
      const A = doc.analytics || {};
      let out = `BANKING ANALYSIS REPORT\n${'='.repeat(60)}\n`;
      out += `File: ${doc.filename}\n`;
      out += `Bank: ${doc.bankName || 'N/A'} | Account: ${doc.accountName || 'N/A'}\n`;
      out += `Period: ${doc.periodStart || '—'} to ${doc.periodEnd || '—'}\n`;
      out += `Currency: ${cur}\n\n`;
      out += `SUMMARY\n${'-'.repeat(40)}\n`;
      out += `Total Credits: ${cur} ${(A.totalCredits || 0).toLocaleString(undefined, {minimumFractionDigits:2})}\n`;
      out += `Total Debits:  ${cur} ${(A.totalDebits || 0).toLocaleString(undefined, {minimumFractionDigits:2})}\n`;
      out += `Net Cash Flow: ${cur} ${(A.netCashFlow || 0).toLocaleString(undefined, {minimumFractionDigits:2})}\n`;
      out += `Transactions:  ${A.transactionCount || 0}\n`;
      out += `Anomalies:     ${A.anomalyCount || 0}\n\n`;
      if (doc.summary) {
        out += `AI EXECUTIVE SUMMARY\n${'-'.repeat(40)}\n`;
        out += doc.summary.replace(/#{1,6}\s/g, '').replace(/\*\*/g, '') + '\n\n';
      }
      out += `TRANSACTIONS\n${'-'.repeat(40)}\n`;
      out += `${'Date'.padEnd(14)}${'Description'.padEnd(40)}${'Debit'.padStart(14)}${'Credit'.padStart(14)}${'Balance'.padStart(14)}\n`;
      out += '-'.repeat(96) + '\n';
      txs.forEach(t => {
        const desc = (t.description || '').slice(0, 38).padEnd(40);
        const deb = t.debit != null ? t.debit.toFixed(2).padStart(14) : ''.padStart(14);
        const cre = t.credit != null ? t.credit.toFixed(2).padStart(14) : ''.padStart(14);
        const bal = t.balance != null ? t.balance.toFixed(2).padStart(14) : ''.padStart(14);
        out += `${(t.date || '').padEnd(14)}${desc}${deb}${cre}${bal}\n`;
      });
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${safeName}_report.txt"`);
      return res.send(out);
    }

    // ── XLSX ─────────────────────────────────────────────────────────────
    if (format === 'xlsx') {
      const XLSX = require('xlsx');
      const wb = XLSX.utils.book_new();

      // Sheet 1: Transactions
      const txRows = [['Date','Description','Category','Debit','Credit','Balance','Reference','Anomaly']];
      txs.forEach(t => txRows.push([
        t.date || '', t.description || '', t.category || '',
        t.debit ?? '', t.credit ?? '', t.balance ?? '',
        t.reference || '', t.isAnomaly ? 'YES' : 'NO'
      ]));
      const ws1 = XLSX.utils.aoa_to_sheet(txRows);
      ws1['!cols'] = [10,40,18,12,12,12,18,8].map(w => ({ wch: w }));
      XLSX.utils.book_append_sheet(wb, ws1, 'Transactions');

      // Sheet 2: Summary
      const A = doc.analytics || {};
      const sumRows = [
        ['Banking Analysis Report', ''],
        ['File', doc.filename], ['Bank', doc.bankName || ''], ['Account', doc.accountName || ''],
        ['Currency', cur], ['Period', `${doc.periodStart || '—'} to ${doc.periodEnd || '—'}`],
        [''], ['STATISTICS', ''],
        ['Total Credits', A.totalCredits || 0], ['Total Debits', A.totalDebits || 0],
        ['Net Cash Flow', A.netCashFlow || 0], ['Avg Transaction', A.avgTransactionAmount || 0],
        ['Largest Credit', A.largestCredit || 0], ['Largest Debit', A.largestDebit || 0],
        ['Transaction Count', A.transactionCount || 0], ['Anomalies', A.anomalyCount || 0],
      ];
      const ws2 = XLSX.utils.aoa_to_sheet(sumRows);
      ws2['!cols'] = [{ wch: 20 }, { wch: 30 }];
      XLSX.utils.book_append_sheet(wb, ws2, 'Summary');

      // Sheet 3: Category Breakdown
      const _catBreakdown = A.categoryBreakdown instanceof Map ? Object.fromEntries(A.categoryBreakdown) : (A.categoryBreakdown || {});
      const catData = Object.entries(_catBreakdown);
      if (catData.length > 0) {
        const catRows = [['Category', 'Total Spend', 'Percentage']];
        const total = catData.reduce((s, [, v]) => s + v, 0);
        catData.sort(([,a],[,b]) => b-a).forEach(([cat, val]) => {
          catRows.push([cat, val, total > 0 ? `${((val/total)*100).toFixed(1)}%` : '0%']);
        });
        const ws3 = XLSX.utils.aoa_to_sheet(catRows);
        ws3['!cols'] = [{ wch: 22 }, { wch: 14 }, { wch: 12 }];
        XLSX.utils.book_append_sheet(wb, ws3, 'Categories');
      }

      const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${safeName}_analysis.xlsx"`);
      return res.send(buf);
    }

    // ── PDF ──────────────────────────────────────────────────────────────
    if (format === 'pdf') {
      const PDFDocument = require('pdfkit');
      const A = doc.analytics || {};
      const pdfDoc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks = [];
      pdfDoc.on('data', c => chunks.push(c));
      pdfDoc.on('end', () => {
        const buf = Buffer.concat(chunks);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${safeName}_report.pdf"`);
        res.send(buf);
      });

      // Header
      pdfDoc.fontSize(22).font('Helvetica-Bold').fillColor('#1e40af').text('Banking Analysis Report', { align: 'center' });
      pdfDoc.moveDown(0.5);
      pdfDoc.fontSize(11).font('Helvetica').fillColor('#6b7280').text(`${doc.filename}  |  ${doc.bankName || ''}  |  ${cur}`, { align: 'center' });
      pdfDoc.moveDown(1);

      // Stats boxes
      const fmt = n => n != null ? Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—';
      const stats = [
        ['Total Credits', `${cur} ${fmt(A.totalCredits)}`, '#10b981'],
        ['Total Debits', `${cur} ${fmt(A.totalDebits)}`, '#ef4444'],
        ['Net Cash Flow', `${cur} ${fmt(A.netCashFlow)}`, '#3b82f6'],
        ['Transactions', A.transactionCount || 0, '#6366f1'],
      ];
      const startX = 50, boxW = 115, boxH = 55, gap = 8;
      stats.forEach(([label, val, color], i) => {
        const x = startX + i * (boxW + gap);
        pdfDoc.roundedRect(x, pdfDoc.y, boxW, boxH, 6).fillAndStroke('#f8fafc', '#e2e8f0');
        pdfDoc.font('Helvetica').fontSize(8).fillColor('#6b7280').text(label, x + 8, pdfDoc.y - boxH + 10, { width: boxW - 16 });
        pdfDoc.font('Helvetica-Bold').fontSize(13).fillColor(color).text(String(val), x + 8, pdfDoc.y - 28, { width: boxW - 16 });
      });
      pdfDoc.moveDown(4.5);

      // Summary
      if (doc.summary) {
        pdfDoc.fontSize(14).font('Helvetica-Bold').fillColor('#111827').text('AI Executive Summary');
        pdfDoc.moveDown(0.4);
        const cleaned = doc.summary.replace(/#{1,6}\s/g, '').replace(/\*\*/g, '');
        pdfDoc.fontSize(9).font('Helvetica').fillColor('#374151').text(cleaned, { lineGap: 4 });
        pdfDoc.moveDown(1);
      }

      // Category breakdown
      const catData = Object.entries(A.categoryBreakdown instanceof Map ? Object.fromEntries(A.categoryBreakdown) : (A.categoryBreakdown || {})).sort(([,a],[,b]) => b-a).slice(0, 8);
      if (catData.length > 0) {
        pdfDoc.fontSize(14).font('Helvetica-Bold').fillColor('#111827').text('Spending by Category');
        pdfDoc.moveDown(0.4);
        const total = catData.reduce((s,[,v]) => s+v, 0);
        catData.forEach(([cat, val]) => {
          const pct = total > 0 ? ((val/total)*100).toFixed(1) : '0';
          pdfDoc.fontSize(9).font('Helvetica').fillColor('#374151').text(`${cat}`, 50, pdfDoc.y, { continued: true, width: 180 });
          pdfDoc.fillColor('#6b7280').text(`${cur} ${fmt(val)}  (${pct}%)`, { align: 'right', width: 300 });
        });
        pdfDoc.moveDown(1);
      }

      // Transaction table
      pdfDoc.fontSize(14).font('Helvetica-Bold').fillColor('#111827').text('Transactions');
      pdfDoc.moveDown(0.4);
      const tblX = 50, cols = [65, 175, 70, 65, 65, 65];
      const headers = ['Date', 'Description', 'Category', 'Debit', 'Credit', 'Balance'];
      // Header row
      let cx = tblX;
      pdfDoc.rect(tblX, pdfDoc.y, 495, 16).fill('#1e40af');
      headers.forEach((h, i) => {
        pdfDoc.fontSize(7.5).font('Helvetica-Bold').fillColor('#ffffff').text(h, cx + 3, pdfDoc.y - 13, { width: cols[i] - 6 });
        cx += cols[i];
      });
      pdfDoc.moveDown(0.2);

      txs.slice(0, 80).forEach((t, idx) => {
        if (pdfDoc.y > 760) pdfDoc.addPage();
        const rowY = pdfDoc.y;
        if (idx % 2 === 0) pdfDoc.rect(tblX, rowY, 495, 14).fill('#f8fafc');
        const cells = [
          t.date || '', (t.description || '').slice(0, 28),
          (t.category || '').slice(0, 14),
          t.debit != null ? fmt(t.debit) : '',
          t.credit != null ? fmt(t.credit) : '',
          t.balance != null ? fmt(t.balance) : '',
        ];
        cx = tblX;
        cells.forEach((cell, i) => {
          pdfDoc.fontSize(7).font('Helvetica').fillColor(t.isAnomaly ? '#c2410c' : '#374151')
            .text(cell, cx + 3, rowY + 3, { width: cols[i] - 6, ellipsis: true });
          cx += cols[i];
        });
        pdfDoc.moveDown(0.55);
      });

      if (txs.length > 80) {
        pdfDoc.moveDown(0.5).fontSize(8).fillColor('#6b7280').text(`... and ${txs.length - 80} more transactions (export XLSX for full list)`);
      }

      pdfDoc.end();
      return;
    }

    

    res.status(400).json({ message: `Unknown format: ${format}` });
  } catch (err) {
    console.error('Export error:', err);
    res.status(500).json({ message: `Export failed: ${err.message}` });
  }
});

module.exports = router;