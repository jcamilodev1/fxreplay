import fs from 'fs';

const data = JSON.parse(fs.readFileSync('e:/Usuario/Desktop/dev/fxreplay/public/data/eurusd_h1_0.json', 'utf8'));

const dayCounts = {};
const hourCounts = {};

for (const item of data) {
  const date = new Date(item.time * 1000);
  const day = date.getUTCDay();
  const hour = date.getUTCHours();
  
  dayCounts[day] = (dayCounts[day] || 0) + 1;
  hourCounts[hour] = (hourCounts[hour] || 0) + 1;
}

console.log("Day Frequency (0=Sun, 1=Mon, ..., 6=Sat):");
console.log(dayCounts);

console.log("\nHour Frequency (UTC):");
console.log(hourCounts);
