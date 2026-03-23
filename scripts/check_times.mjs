import fs from 'fs';

const data = JSON.parse(fs.readFileSync('e:/Usuario/Desktop/dev/fxreplay/public/data/eurusd_h1_0.json', 'utf8'));

console.log("Printing first 5 candles:");
for (let i = 0; i < 5; i++) {
  const item = data[i];
  const date = new Date(item.time * 1000);
  console.log(`Time: ${item.time} | UTC: ${date.toUTCString()} | getUTCHours(): ${date.getUTCHours()}`);
}

console.log("\nPrinting items with overlap or midnight transitions (20-25):");
for (let i = 20; i < 25; i++) {
  const item = data[i];
  const date = new Date(item.time * 1000);
  console.log(`Time: ${item.time} | UTC: ${date.toUTCString()} | getUTCHours(): ${date.getUTCHours()}`);
}
