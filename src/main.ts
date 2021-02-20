import { Plugin, MarkdownPreviewRenderer, Notice } from 'obsidian';
import SageCellSettingsTab from './settings-tab';
import SageCellSettings from './settings';
import Client from './client'
import Renderer from './renderer'

export default class SageCellPlugin extends Plugin {
  settings: SageCellSettings;
  client: Client;
  statusBarItem: HTMLElement;
  renderer: Renderer;

  async onload() {
    console.log("SageCell: Loading...");

    this.settings = Object.assign({}, new SageCellSettings(), await this.loadData());
    this.addSettingTab(new SageCellSettingsTab(this.app, this));
    this.statusBarItem = this.addStatusBarItem();
    this.statusBarItem.innerText = "Sage: disconnected";
    this.client = new Client(this.settings);
    this.renderer = new Renderer(this);

    this.client.onStatusChange = (status: string) => {
      this.statusBarItem.innerText = `Sage: ${status}`;
    }
    this.client.onError = (e: Error) => {
      new Notice(`Sage Error: ${e.message}`);
    }
    this.client.onStream = (el: HTMLElement, output: string) => {
      el.appendChild(document.createTextNode(output));
    }
    this.client.onDisplayData = (el: HTMLElement, url: string) => {
      const imgEl = document.createElement("img");
      imgEl.setAttribute('src', url);
      imgEl.classList.add('sagecell-image');
      el.appendChild(imgEl);
      el.appendChild(document.createTextNode("\n"));
    }
    this.client.onSageError = (el: HTMLElement, error: any) => {
      const spanEl = document.createElement("span");
      spanEl.classList.add('sagecell-error');
      spanEl.innerText = `${error.ename}: ${error.evalue}`;
      el.appendChild(spanEl);
    }

    window.CodeMirror.defineMIME('sage', 'python');
    this.configurePrism();
    MarkdownPreviewRenderer.registerPostProcessor(this.renderer.postprocessor);
  }

  async onunload() {
    MarkdownPreviewRenderer.unregisterPostProcessor(this.renderer.postprocessor);
  }

  async configurePrism() {
    var prismLoaded: boolean = false;

    console.log("SageCell: Waiting for Prism.js to load");

    // Hacky workaround. There has to be a better way to do this...
    while (!prismLoaded) {
      await new Promise(r => setTimeout(r, 8000));
      prismLoaded = window['Prism'];
    }

    window['Prism'].languages.sage = window['Prism'].languages.python;
    window['Prism'].highlightAll();

    console.log("SageCell: Configured Prism.js");
  }
}