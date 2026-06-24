const WebSocket = require('ws');
const ws = new WebSocket('ws://127.0.0.1:9222/devtools/page/226C4A55167E7C8CAF63BFA476CCE983');

ws.on('open', function open() {
  ws.send(JSON.stringify({id: 1, method: 'Runtime.enable'}));
  ws.send(JSON.stringify({id: 2, method: 'Log.enable'}));
  ws.send(JSON.stringify({id: 3, method: 'Runtime.evaluate', params: {expression: 'console.log("WebSocket connected")'}}));
});

ws.on('message', function incoming(data) {
  const msg = JSON.parse(data);
  if (msg.method === 'Runtime.consoleAPICalled') {
    const args = msg.params.args.map(a => a.value || a.description).join(' ');
    console.log('[Console]', args);
  } else if (msg.method === 'Log.entryAdded') {
    console.log('[Log]', msg.params.entry.text);
  } else if (msg.method === 'Runtime.exceptionThrown') {
    console.log('[Exception]', msg.params.exceptionDetails.exception.description);
  }
});

setTimeout(() => process.exit(0), 2000);
