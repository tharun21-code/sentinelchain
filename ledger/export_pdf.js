const puppeteer = require('puppeteer');
const path = require('path');

async function exportToPDF() {
  const htmlPath = path.join(__dirname, 'report.html');
  const pdfPath = path.join(__dirname, 'report.pdf');

  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle0' });
  await page.pdf({ path: pdfPath, format: 'A4' });

  await browser.close();

  console.log('Wrote PDF:', pdfPath);
}

exportToPDF().catch(console.error);
