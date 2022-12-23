import { Plugin, loadPrism } from 'obsidian';

import SageCellSettingsTab from './settings-tab';
import SageCellSettings from './settings';
import Client from './client'

declare global {
  interface Window { DOMPurify: any; MathJax: any; }
}

export default class SageCellPlugin extends Plugin {
  settings: SageCellSettings;
  client: Client;

  async onload() {
    // Initialize settings and add tab.
    await this.loadSettings();
    this.addSettingTab(new SageCellSettingsTab(this.app, this));

    // Initialize Sage API client.
    this.client = new Client(this.settings);

    // Add syntax highlighting in blocks.
    let prismjs = await loadPrism();
    prismjs.languages["sage-python"] = prismjs.languages["python"];

    // Add syntax highlighting in the editor.
    window.CodeMirror.defineMIME("sage-python", "python")

    // Register the new code block type.
    this.registerMarkdownCodeBlockProcessor("sage-python", async (src, el, ctx) => {
      const wrapperEl = el.createEl("div");
      const preEl = wrapperEl.createEl("pre")
      preEl.classList.add("language-sage-python");
      const codeEl = preEl.createEl("code");
      codeEl.classList.add("language-sage-python");
      codeEl.textContent = src;
      prismjs.highlightElement(codeEl);

      await this.client.connect();
      this.client.enqueue(src, wrapperEl);
      this.client.send();
    });
  }

  onunload() {

  }

  async loadSettings() {
    this.settings = Object.assign({}, new SageCellSettings(), await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}
