import { Plugin, MarkdownView, MarkdownRenderChild, loadPrism } from 'obsidian';
import { EditorView } from "@codemirror/view";

import SageCellSettingsTab from './ui/settings-tab';
import SageCellSettings from './settings';
import Client from './client'
import Cell from './ui/cell'

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
      const cell = new Cell(el, this.client, "python", src);
      ctx.addChild(cell);
    });

    // Command to run the current file as a notebook.
    this.addCommand({
      id: 'sage-run',
      name: 'Run the current file as a SageMath notebook',
      callback: async () => {
        if(!app.workspace.activeLeaf) return;

        const activeView = app.workspace.activeLeaf.view;

        if(activeView.getViewType() != "markdown") return;

        const activeMarkdownView = activeView as MarkdownView;
        const cells : Cell[] = [];

        if(activeMarkdownView.getMode() == "source") {
          // @ts-expect-error, not typed
          const editor = activeMarkdownView.editor.cm as EditorView;
          // @ts-expect-error, not typed
          const children = editor.docView.children;

          for(let i = 0; i < children.length; i++) {
            if(children[i].widget && children[i].widget.lang.startsWith("sage-")) {
              cells.push(...children[i].widget.children);
            }
          }
        } else {
          const preview = activeMarkdownView.previewMode;
          // @ts-expect-error, not typed
          cells.push(...preview._children);
        }

        for(let i = 0; i < cells.length; i++) {
          await cells[i].runCode();
        }
      }
    });
  }

  async loadSettings() {
    this.settings = Object.assign({}, new SageCellSettings(), await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}
