// tools/screenshot.js
// Lightweight Puppeteer helper to capture screenshots at common breakpoints.
// Usage:
//   node tools/screenshot.js [output-dir]
// Notes:
//  - Puppeteer is not installed by default. Run: npm install puppeteer --save-dev
//  - This script runs headless Chrome. On Windows it works out of the box with Puppeteer.

const fs = require('fs');
const path = require('path');
(async ()=>{
  const puppeteer = require('puppeteer');
  const outDir = process.argv[2] || 'screenshots';
  if(!fs.existsSync(outDir)) fs.mkdirSync(outDir, {recursive:true});
  const url = 'file://' + path.resolve(process.cwd(), 'index.html');
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  const sizes = [
    {name:'desktop', width:1280, height:800},
    {name:'tablet', width:900, height:1200},
    {name:'mobile', width:390, height:844}
  ];
  for(const s of sizes){
    await page.setViewport({width:s.width, height:s.height});
    await page.goto(url, {waitUntil:'networkidle2'});
    const out = path.join(outDir, `index-${s.name}.png`);
    await page.screenshot({path:out, fullPage:true});
    console.log('Saved', out);
  }
  await browser.close();
})();
