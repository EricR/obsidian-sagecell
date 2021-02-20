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
    this.configurePrism();
    this.statusBarItem = this.addStatusBarItem();
    this.statusBarItem.innerText = "Sage: Disconnected";
    this.client = new Client(this.settings);
    this.renderer = new Renderer(this);

    this.client.onConnect = () => {
      new Notice("Connecteed to Sage server.");
      this.statusBarItem.innerText = "Sage: Connected";
    }
    this.client.onDisconnect = () => {
      new Notice("Disconnected from Sage server.");
      this.statusBarItem.innerText = "Sage: Disconnected";
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
    MarkdownPreviewRenderer.registerPostProcessor(this.renderer.postprocessor);
  }

  async onunload() {
    MarkdownPreviewRenderer.unregisterPostProcessor(this.renderer.postprocessor);
  }

  async configurePrism() {
    var prismLoaded: boolean = false;

    console.log("SageCell: Waiting for Prism.js to load");

    while (!prismLoaded) {
      await new Promise(r => setTimeout(r, 100));
      prismLoaded = window['Prism'];
    }

    window['Prism'].languages.sage = window['Prism'].languages.python;
    window['Prism'].highlightAll();

    console.log("SageCell: Configured Prism.js");
  }
}