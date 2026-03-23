import fs from 'fs';

const data = JSON.parse(fs.readFileSync('e:/Usuario/Desktop/dev/fxreplay/public/data/eurusd_h1_0.json', 'utf8'));

console.log("Analyzing candle sequence for Day of Week:");
let lastDate = null;
for (let i = 0; i < 200; i++) {
  const item = data[i];
  const date = new Date(item.time * 1000);
  const day = date.getUTCDay(); // 0 = Sun, 1 = Mon ...
  const hour = date.getUTCHours();
  
  if (lastDate && (item.time - lastDate.time > 3600)) {
    console.log(`\n[GAP DETECTED] from ${lastDate.date.toUTCString()} to ${date.toUTCString()}`);
    console.log(`Gap duration: ${(item.time - lastDate.time)/3600} hours`);
  }
  
  if (hour === 0 || i === 0 || lastDate && (item.time - lastDate.time > 3600)) {
     console.log(`Tick: Day=${day} (${date.toUTCString().split(' ')[0]}) | Hour=${hour} | UTC: ${date.toUTCString()}`);
  }
  
  lastDate = { time: item.time, date: date };
}
