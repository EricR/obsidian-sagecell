import { v4 as uuidv4 } from 'uuid';
import fetch from 'cross-fetch';
import SockJS from 'sockjs-client';

export default class Client {
  serverUrl: string;
  connected: boolean;
  timeout: number;
  sessionId: string;
  cellSessionId: string
  ws: SockJS;
  outputEls: any;
  onError: any;
  onStream: any;
  onDisplayData: any;
  onSageError: any;
  onStatusChange: any;

  constructor(settings: any) {
    this.serverUrl = settings.serverUrl;
    this.timeout = settings.timeout;
  }

  connect(): Promise<any> {
    this.connected = false;
    this.sessionId = null;
    this.cellSessionId = uuidv4();
    this.ws = null;
    this.outputEls = {}

    return new Promise((resolve, reject) => {
      fetch(this.getKernelUrl(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      }).then(response => response.json())
      .then((data) => {
        this.sessionId = data.id;
        this.ws = new SockJS(this.getWSUrl());
        this.ws.onopen = () => {
          this.connected = true;
          if (this.onStatusChange) { this.onStatusChange("connected"); }
          resolve();
        }
        this.ws.onmessage = (msg: any) => { this.handleMessage(msg); }
        this.ws.onerror = (e: any) => { if (this.onError) this.onError(e); }
        this.ws.onclose = () => { this.disconnect(); }
      }).catch((e) => {
        if (this.onError) { this.onError(e); }
        reject(e);
      });
    });
  }

  async ensureConnected(): Promise<any> {
    if (!this.connected) return await this.connect();
  }

  send(msg_type: string, content: object, outputEl: HTMLElement): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.connected) {
        reject(new Error("Not connected"));
      }
      if (!this.ws) {
        reject(new Error("No WebSocket connection"));
      }

      const id = uuidv4();
      this.outputEls[id] = outputEl;

      const payload = JSON.stringify({
        channel: 'shell',
        header: {
          msg_type: msg_type,
          msg_id: id,
          session: this.cellSessionId,
          username: ""
        },
        parent_header: {},
        metadata: {},
        content: content
      });

      this.ws.send(`${this.sessionId}/channels,${payload}`);
    });
  }

  handleMessage(msg: any) {
    const data = JSON.parse(msg.data.substring(46));
    const msg_type = data.header.msg_type;
    const msg_id = data.parent_header.msg_id;
    const content = data.content;

    if (msg_type == 'stream' && content.text) {
      if (this.onStream) this.onStream(this.outputEls[msg_id], content.text);
    }
    if (msg_type == 'display_data' && content.data['text/image-filename']) {
      if (this.onDisplayData) this.onDisplayData(this.outputEls[msg_id], this.getFileUrl(content.data['text/image-filename']))
    }
    if (msg_type == 'error') {
      if (this.onSageError) this.onSageError(this.outputEls[msg_id], content);
    }
    if (msg_type == 'status' && content.execution_state) {
      if (this.onStatusChange) this.onStatusChange(content.execution_state);
      if (content.execution_state == 'dead') this.disconnect();
    }
  }

  disconnect() {
    if (this.ws) this.ws.close();
    this.connected = false;
    this.sessionId = null;
    this.cellSessionId = null;
    this.ws = null;
    if (this.onStatusChange) { this.onStatusChange("disconnected"); }
  }

  getKernelUrl(): string {
    return `${this.serverUrl}/kernel?timeout=${this.timeout}&CellSessionID=${this.cellSessionId}`
  }

  getWSUrl(): string {
    return `${this.serverUrl}/sockjs?CellSessionID=${this.cellSessionId}`
  }

  getFileUrl(file: string): string {
    return `${this.serverUrl}/kernel/${this.sessionId}/files/${file}`
  }
}