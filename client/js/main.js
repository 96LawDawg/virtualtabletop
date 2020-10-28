const url = 'ws://localhost:8273';
const connection = new WebSocket(url);

connection.onopen = () => {
  toServer('room', self.location.pathname.substr(1));
};

connection.onerror = (error) => {
  console.log(`WebSocket error: ${error}`);
};

connection.onmessage = (e) => {
  console.log(`from server: ${e.data}`);
  const { func, args } = JSON.parse(e.data);
  fromServer(func, args);
};

function fromServer(func, args) {
  if(func == "log")
    console.log.call(args);
}

function toServer(func, args) {
  connection.send(JSON.stringify({ func, args }));
}

window.addEventListener('mousemove', function(event) {
  toServer('mouse', [ event.clientX, event.clientY ]);
});
