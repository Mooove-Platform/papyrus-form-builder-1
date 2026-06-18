const fs = require('fs');
const path = require('path');
const { PDFParse } = require('pdf-parse');
const { pathToFileURL } = require('url');

async function testPdf() {
  try {
    const workerPath = require.resolve('pdfjs-dist/legacy/build/pdf.worker.mjs');
    console.log('Resolved worker path:', workerPath);
    const workerUrl = pathToFileURL(workerPath).toString();
    console.log('Worker URL:', workerUrl);
    
    PDFParse.setWorker(workerUrl);
    
    const pdfPath = path.join(__dirname, 'AI Readiness 2026 Structure.pdf');
    const buffer = fs.readFileSync(pdfPath);
    
    console.log('PDF buffer loaded. Size:', buffer.length);
    const parser = new PDFParse({ data: buffer });
    
    console.log('PDFParse instantiated.');
    const parsedPdf = await parser.getText();
    
    console.log('getText() completed.');
    console.log('Result text length:', parsedPdf.text ? parsedPdf.text.length : 0);
  } catch (err) {
    console.error('Error during PDF parsing:', err);
  }
}

testPdf();
