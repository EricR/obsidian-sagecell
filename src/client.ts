import { v4 as uuidv4 } from 'uuid';
import SockJS from 'sockjs-client';
import OutputWriter from './output-writer'

export default class Client {
  serverUrl: string;
  connected: boolean;
  sessionId: string;
  cellSessionId: string;
  ws: any;
  queue: string[];
  outputWriters: any;

  constructor(settings: any) {
    this.serverUrl = settings.serverUrl;
    this.queue = [];
    this.outputWriters = {};
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.connected) { return reject(); }

      this.connected = false;
      this.sessionId = "";
      this.cellSessionId = uuidv4();
      this.queue = [];
      this.outputWriters = {};
      this.ws = null;

      fetch(this.getKernelUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }).then(response => response.json())
      .then((data) => {
        this.sessionId = data.id;
        this.ws = new SockJS(this.getWSUrl());
        this.ws.onopen = () => {
          this.connected = true;
          resolve();
        }
        this.ws.onmessage = (msg: any) => { this.handleReply(msg); }
        this.ws.onclose = () => { this.disconnect(); }
        this.ws.onerror = () => { this.disconnect(); }
      }).catch((e) => {
        this.disconnect();
        reject(e);
      });
    });
  }

  enqueue(code: string, outputEl: HTMLElement) {
    const msgId = uuidv4();
    const payload = JSON.stringify({
      header: {
        msg_id: msgId,
        username: "",
        session: this.cellSessionId,
        msg_type: 'execute_request',
      },
      metadata: {},
      content: {
        code: code,
        silent: false,
        user_variables: [],
        user_expressions: {
          "_sagecell_files": "sys._sage_.new_files()",
        },
        allow_stdin: false
      },
      parent_header: {}
    });
    this.outputWriters[msgId] = new OutputWriter(outputEl);
    this.queue.push(payload)
  }

  send() {
    const payload = this.queue.shift();
    this.ws.send(`${this.sessionId}/channels,${payload}`);
  }

  async handleReply(msg: any) {
    const data = JSON.parse(msg.data.substring(46));
    const msgType = data.header.msg_type;
    const msgId = data.parent_header.msg_id;
    const content = data.content;
    
    if (msgType == 'stream' && content.text) {
      this.outputWriters[msgId].appendText(content.text);
    }
    if (msgType == 'execute_result' && content.data['text/plain']) {
      this.outputWriters[msgId].appendText(content.data['text/plain']);
    }
    if (msgType == 'display_data' && content.data['text/image-filename']) {
      this.outputWriters[msgId].appendImage(this.getFileUrl(content.data['text/image-filename']));
    }
    if (msgType == 'display_data' && content.data['text/html']) {
      this.outputWriters[msgId].appendSafeHTML(content.data['text/html'].replace("cell://", this.getFileUrl("")));
    }
    if (msgType == 'error') {
      this.outputWriters[msgId].appendError(content);
    }
    if (msgType == 'execute_reply') {
      if (this.queue.length > 0) {
        this.send();
      } else {
        this.disconnect();
      }
    }
  }

  disconnect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws) this.ws.close();
      this.connected = false;
      this.sessionId = "";
      this.cellSessionId = "";
      this.outputWriters = {};
      this.ws = null;
      resolve();
    });
  }

  getKernelUrl(): string {
    return `${this.serverUrl}/kernel?CellSessionID=${this.cellSessionId}&timeout=inf`
  }

  getWSUrl(): string {
    return `${this.serverUrl}/sockjs?CellSessionID=${this.cellSessionId}`
  }

  getFileUrl(file: string): string {
    return `${this.serverUrl}/kernel/${this.sessionId}/files/${file}`
  }
}