const WebSocket = require('C:/Users/Hey Amigo/Github/campus-marche/apps/web/node_modules/next/dist/compiled/ws');
const fs = require('fs');

const tabId = process.argv[2];
const ws = new WebSocket(`ws://localhost:9222/devtools/page/${tabId}`);
let msgId = 1;

ws.on('open', () => {
  ws.send(JSON.stringify({id: msgId++, method: 'Page.captureScreenshot', params: {format: 'png', captureBeyondViewport: false}}));
});

ws.on('message', (data) => {
  const msg = JSON.parse(data.toString());
  if (msg.id === 1 && msg.result && msg.result.data) {
    const outPath = process.argv[3] || 'screenshot.png';
    fs.writeFileSync(outPath, Buffer.from(msg.result.data, 'base64'));
    console.log('Screenshot saved to', outPath);
    ws.close();
    process.exit(0);
  }
  if (msg.error) { console.error('CDP Error:', JSON.stringify(msg.error)); process.exit(1); }
});

ws.on('error', (e) => { console.error('WS Error:', e.message); process.exit(1); });
setTimeout(() => { console.error('Timeout'); process.exit(1); }, 15000);
