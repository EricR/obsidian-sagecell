import { Plugin, Notice } from 'obsidian';
import SageCellSettingsTab from './settings-tab';
import SageCellSettings from './settings';
import Client from './client'

export default class SageCellPlugin extends Plugin {
  settings: SageCellSettings;
  statusBarItem: HTMLElement;
  client: Client;

  async onload() {
    console.log("loading sagecell plugin");

    this.settings = Object.assign({}, new SageCellSettings(), await this.loadData());
    this.addSettingTab(new SageCellSettingsTab(this.app, this));
    this.addCommand({
      id: 'execute-sage-cells',
      name: 'Execute all sage cells in the current document.',
      checkCallback: (checking: boolean): boolean | void => {
        if (checking) return this.getActiveView().currentMode.type == 'preview';
        this.executeCurrentDoc();
      }
    });

    this.configurePrismAndCodeMirror();
    this.loadMathJax();
  }

  executeCurrentDoc = () => {
    const activeView = this.getActiveView();
    const activeFile = activeView.file;
    const currentMode = activeView.currentMode;
    const contentEl = activeView.contentEl;

    if(activeFile.extension == 'md' && currentMode.type == 'preview') {
      contentEl.querySelectorAll('code.is-loaded.language-sage').forEach((codeEl: HTMLElement) => {
        const client = new Client(this.settings);
        client.connect().then(() => {
          const code = codeEl.innerText;
          codeEl.innerText = '';
          client.execute(code, codeEl);
        });
      });
    }
  }

  getActiveView = (): any => {
    return this.app.workspace.activeLeaf.view;
  }

  async configurePrismAndCodeMirror() {
    var prismLoaded: boolean = false;

    window.CodeMirror.defineMIME('sage', 'python');

    // Hacky workaround. There has to be a better way to do this...
    while (!prismLoaded) {
      await new Promise(r => setTimeout(r, 100));
      prismLoaded = window['Prism'];
    }
    window['Prism'].languages.sage = window['Prism'].languages.python;
    window['Prism'].highlightAll();
  }

  async loadMathJax() {
    if (!window.MathJax) {
      var scriptEl = document.createElement('script');
      scriptEl.type = 'text/javascript';
      scriptEl.src = '/lib/mathjax/tex-chtml-full.js';
      document.body.appendChild(scriptEl);
    }
  }
}