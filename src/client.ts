import { v4 as uuidv4 } from 'uuid';
import fetch from 'cross-fetch';
import SockJS from 'sockjs-client';
import OutputWriter from './output-writer'

export default class Client {
  serverUrl: string;
  connected: boolean;
  sessionId: string;
  cellSessionId: string;
  ws: any;
  outputWriters: any;

  constructor(settings: any) {
    this.serverUrl = settings.serverUrl;
    this.outputWriters = {};
  }

  async connect(): Promise<any> {
    return new Promise((resolve, reject) => {
      if (this.connected) { return resolve(); }

      this.connected = false;
      this.sessionId = null;
      this.cellSessionId = uuidv4();
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
        this.ws.onmessage = (msg: any) => { this.handleReplyWithSession(msg); }
        this.ws.onclose = () => { this.disconnect(); }
      }).catch((e) => {
        reject(e);
      });
    });
  }

  execute(code: string, outputEl: HTMLElement) {
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
    this.ws.send(`${this.sessionId}/channels,${payload}`);
  }

  handleReplyWithSession(msg: any) {
    const data = JSON.parse(msg.data.substring(46));
    const msgType = data.header.msg_type;
    const msgId = data.parent_header.msg_id;
    const content = data.content;

    if (msgType == 'status' && content.execution_state) {
      if (content.execution_state == 'dead') return this.disconnect();
      return;
    }
    if (msgType == 'stream' && content.text) {
      this.outputWriters[msgId].appendText(content.text);
      return;
    }
    if (msgType == 'display_data' && content.data['text/image-filename']) {
      this.outputWriters[msgId].appendImage(this.getFileUrl(content.data['text/image-filename']));
      return;
    }
    if (msgType == 'display_data' && content.data['text/html']) {
      this.outputWriters[msgId].appendSafeHTML(content.data['text/html']);
      return;
    }
    if (msgType == 'error') {
      this.outputWriters[msgId].appendError(content);
      return;
    }
  }

  disconnect() {
    if (this.ws) this.ws.close();
    this.connected = false;
    this.sessionId = null;
    this.cellSessionId = null;
    this.outputWriters = {};
    this.ws = null;
  }

  getKernelUrl(): string {
    return `${this.serverUrl}/kernel?CellSessionID=${this.cellSessionId}`
  }

  getWSUrl(): string {
    return `${this.serverUrl}/sockjs?CellSessionID=${this.cellSessionId}`
  }

  getFileUrl(file: string): string {
    return `${this.serverUrl}/kernel/${this.sessionId}/files/${file}`
  }
}