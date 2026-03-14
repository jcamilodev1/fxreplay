export const generateSampleData = () => {
  const data = [];
  let time = new Date('2024-01-01').getTime() / 1000;
  let value = 1.0800;

  for (let i = 0; i < 200; i++) {
    const open = value + (Math.random() - 0.5) * 0.001;
    const high = open + Math.random() * 0.001;
    const low = open - Math.random() * 0.001;
    const close = (high + low) / 2 + (Math.random() - 0.5) * 0.0005;
    
    data.push({
      time: time,
      open: parseFloat(open.toFixed(5)),
      high: parseFloat(high.toFixed(5)),
      low: parseFloat(low.toFixed(5)),
      close: parseFloat(close.toFixed(5)),
    });

    time += 3600; // 1 hour
    value = close;
  }
  return data;
};
