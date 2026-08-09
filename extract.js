const path = require('path');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const XLSX = require('xlsx');
const Tesseract = require('tesseract.js');

async function extractText(buffer, originalName) {
  const ext = path.extname(originalName).toLowerCase();

  if (ext === '.pdf') {
    const data = await pdfParse(buffer);
    return data.text;
  }

  if (ext === '.docx' || ext === '.doc') {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  if (ext === '.xlsx' || ext === '.xls' || ext === '.csv') {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    let out = '';
    workbook.SheetNames.forEach((sheetName) => {
      const sheet = workbook.Sheets[sheetName];
      out += `\n--- Sheet: ${sheetName} ---\n${XLSX.utils.sheet_to_csv(sheet)}\n`;
    });
    return out;
  }

  if (['.png', '.jpg', '.jpeg', '.webp', '.bmp'].includes(ext)) {
    const { data } = await Tesseract.recognize(buffer, 'eng');
    return data.text;
  }

  if (['.txt', '.md'].includes(ext)) {
    return buffer.toString('utf8');
  }

  throw new Error(`Unsupported file type: ${ext || 'unknown'}`);
}

module.exports = { extractText };
