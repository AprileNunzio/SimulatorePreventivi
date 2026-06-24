const WebSocket = require('ws');
const http = require('http');

http.get('http://127.0.0.1:9222/json', (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    const targets = JSON.parse(body);
    const target = targets.find(t => t.title === 'Simulatore Preventivi' && t.type === 'page');
    if (!target) return console.log('No target found');
    
    const ws = new WebSocket(target.webSocketDebuggerUrl);
    ws.on('open', () => {
      ws.send(JSON.stringify({id: 1, method: 'Runtime.enable'}));
      ws.send(JSON.stringify({id: 2, method: 'Log.enable'}));
      ws.send(JSON.stringify({id: 3, method: 'Page.enable'}));
      // reload the page to capture initialization errors
      ws.send(JSON.stringify({id: 4, method: 'Network.enable'}));
      ws.send(JSON.stringify({id: 5, method: 'Page.reload'}));
      
      setTimeout(() => {
        ws.send(JSON.stringify({
          id: 6,
          method: 'Runtime.evaluate',
          params: { 
            expression: 'Pages.collaboratori.openCollaboratoreAnalytics(1).then(() => "SUCCESS").catch(e => e.message)',
            awaitPromise: true,
            returnByValue: true
          }
        }));
      }, 3000);
    });

    ws.on('message', data => {
      const msg = JSON.parse(data);
      if (msg.method === 'Runtime.consoleAPICalled') {
        const args = msg.params.args.map(a => a.value || a.description).join(' ');
        console.log('[Console]', args);
      } else if (msg.method === 'Log.entryAdded') {
        console.log('[Log]', msg.params.entry.text);
      } else if (msg.method === 'Runtime.exceptionThrown') {
        console.log('[Exception]', msg.params.exceptionDetails.exception.description);
      } else if (msg.method === 'Network.responseReceived') {
        if (msg.params.response.status >= 400) {
           console.log('[Network Error]', msg.params.response.url, msg.params.response.status);
        }
      } else if (msg.method === 'Network.loadingFailed') {
        console.log('[Network Failed]', msg.params.errorText, msg.params.type, msg.params.documentURL);
      } else if (msg.id === 6) {
        console.log('[Evaluate Result]', msg.result);
      }
    });

    setTimeout(() => process.exit(0), 8000);
  });
});
