let lastTimeout = 1000;
let connection;
let messageCallbacks = {};

function startWebSocket() {
  let url = `ws://${location.host}`;
  if(location.protocol == 'https:')
    url = `wss://${location.host}`;
  console.log(`connecting to ${url}`);
  connection = new WebSocket(url);

  connection.onopen = () => {
    toServer('room', { playerName, roomID });
  };

  connection.onerror = (error) => {
    console.log(`WebSocket error: ${error}`);
  };

  connection.onclose = () => {
    console.log(`WebSocket closed`);
    setTimeout(startWebSocket, lastTimeout *= 2);
  };

  connection.onmessage = (e) => {
    const { func, args } = JSON.parse(e.data);
    for(const callback of (messageCallbacks[func] || []))
      callback(args);
  };
}

function onMessage(func, callback) {
  if(!messageCallbacks[func])
    messageCallbacks[func] = [];
  messageCallbacks[func].push(callback);
}

function toServer(func, args) {
  connection.send(JSON.stringify({ func, args }));
}

function log(str) {
  toServer('log', str);
}

onLoad(startWebSocket);
