let lastTimeout = 1000;
let connection;

function startWebSocket() {
  const url = `ws://${location.hostname}:8273`;
  console.log(`connecting to ${url}`);
  connection = new WebSocket(url);

  connection.onopen = () => {
    toServer('room', self.location.pathname.substr(1));
  };

  connection.onerror = (error) => {
    console.log(`WebSocket error: ${error}`);
    setTimeout(startWebSocket, lastTimeout *= 2);
  };

  connection.onclose = () => {
    console.log(`WebSocket closed`);
    setTimeout(startWebSocket, lastTimeout *= 2);
  };

  connection.onmessage = (e) => {
    const { func, args } = JSON.parse(e.data);
    fromServer(func, args);
  };
}
startWebSocket();

function addWidget(widget) {
  widgets.set(widget.id, new BasicWidget(widget, document.querySelector('.surface')));
}

function fromServer(func, args) {
  if(func == 'add')
    addWidget(args);
  if(func == 'state') {
    for(const widget of document.querySelectorAll('.widget'))
      widget.parentNode.removeChild(widget);
    for(const widgetID in args)
      addWidget(args[widgetID]);
  }
  if(func == 'translate')
    widgets.get(args.id).setPositionFromServer(args.pos[0], args.pos[1]);
}

function toServer(func, args) {
  connection.send(JSON.stringify({ func, args }));
}

window.addEventListener('mousemove', function(event) {
  toServer('mouse', [ event.clientX, event.clientY ]);
});

const widgets = new Map();

function objectToWidget(o) {
  if(!o.id)
    o.id = Math.random().toString(36).substring(3, 7);
  toServer('add', o);
}

function setScale() {
  if(window.innerWidth/window.innerHeight < 1600/1044) {
    const scale = window.innerWidth/1600;
    document.documentElement.style.setProperty('--scale', scale);
    document.querySelector('#room').style.top  = ((window.innerHeight - 1000*scale)/2 - 22) + 'px';
    document.querySelector('#room').style.left = '0';
    document.querySelector('#toolbar').style.top  = ((window.innerHeight - 1000*scale)/2 + 1000*scale - 23) + 'px';
    document.querySelector('#toolbar').style.left = '0';
    document.querySelector('#toolbar').style.width = '100%';
    document.querySelector('#toolbar').style.height = '44px';
  } else {
    const scale = window.innerHeight/1000;
    document.documentElement.style.setProperty('--scale', scale);
    document.querySelector('#room').style.top  = '0';
    document.querySelector('#room').style.left = ((window.innerWidth - 1600*scale)/2 + 22) + 'px';
    document.querySelector('#toolbar').style.top  = '0';
    document.querySelector('#toolbar').style.left = ((window.innerWidth - 1600*scale)/2 - 21) + 'px';
    document.querySelector('#toolbar').style.width = '44px';
    document.querySelector('#toolbar').style.height = '100%';
  }
}

function on(selector, eventName, callback) {
  document.querySelector(selector).addEventListener(eventName, callback);
}

window.addEventListener('DOMContentLoaded', function() {
  on('#add', 'click', function() {
    const style = document.querySelector('#edit').style;
    style.display = style.display === 'block' ? 'none' : 'block';
  });

  on('#upload', 'click', function() {
    const upload = document.createElement('input');
    upload.type = 'file';
    upload.addEventListener('change', function(e) {
      var req = new XMLHttpRequest();
      req.open("PUT", self.location.pathname, true);
      req.setRequestHeader('Content-Type', 'application/octet-stream');
      req.send(e.target.files[0]);
    });
    upload.dispatchEvent(new MouseEvent('click', {bubbles: true}));
  });

  on('#addWidget', 'click', function() {
    objectToWidget(JSON.parse(document.querySelector('#widgetText').value));
    document.querySelector('#edit').style.display = 'none';
  });

  setScale();
});

window.onresize = function(event) {
  setScale();
}
