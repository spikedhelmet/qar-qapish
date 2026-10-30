// WebSocket connection to the host's server.
export class Net {
  constructor(onMessage, onClose) {
    this.onMessage = onMessage;
    this.onClose = onClose;
    this.ping = 0;
  }

  connect() {
    return new Promise((resolve, reject) => {
      const proto = location.protocol === 'https:' ? 'wss' : 'ws';
      this.ws = new WebSocket(`${proto}://${location.host}/ws`);
      this.ws.onopen = () => {
        this.pingTimer = setInterval(() => this.send({ t: 'ping', c: performance.now() }), 2000);
        resolve();
      };
      this.ws.onerror = () => reject(new Error('Could not reach the game server'));
      this.ws.onclose = () => { clearInterval(this.pingTimer); this.onClose(); };
      this.ws.onmessage = e => {
        const msg = JSON.parse(e.data);
        if (msg.t === 'pong') { this.ping = Math.round(performance.now() - msg.c); return; }
        this.onMessage(msg);
      };
    });
  }

  send(msg) {
    if (this.ws?.readyState === 1) this.ws.send(JSON.stringify(msg));
  }
}
