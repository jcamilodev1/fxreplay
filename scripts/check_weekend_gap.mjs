import fs from 'fs';

const data = JSON.parse(fs.readFileSync('e:/Usuario/Desktop/dev/fxreplay/public/data/eurusd_h1_0.json', 'utf8'));

console.log("Looking for Weekend Gaps (Fri to Sun):");
let lastDate = null;
for (let i = 0; i < data.length; i++) {
  const item = data[i];
  const date = new Date(item.time * 1000);
  const day = date.getUTCDay();
  const hour = date.getUTCHours();
  
  if (lastDate && (item.time - lastDate.time > 3600)) {
    const gapHours = (item.time - lastDate.time) / 3600;
    if (gapHours > 12) { // Long gap is likely weekend
      console.log(`\n[WEEKEND GAP]`);
      console.log(`Last candle: Day=${lastDate.day} | UTC: ${lastDate.date.toUTCString()}`);
      console.log(`Next candle: Day=${day} | UTC: ${date.toUTCString()}`);
      console.log(`Gap duration: ${gapHours} hours`);
      break; // Only need the first one to deduce timezone
    }
  }
  
  lastDate = { time: item.time, date: date, day: day };
}
