import { MarkdownRenderChild, ButtonComponent, loadPrism } from 'obsidian';
import { v4 as uuidv4 } from 'uuid';
import Client from '../client'

export default class Cell extends MarkdownRenderChild {
  id: string;
  client: Client;
  kind: string;
  code: string;
  outputEl: HTMLElement;
  runButtonComp: ButtonComponent;
  prismjs: any;

  constructor(containerEl: HTMLElement, client: Client, kind: string, code: string) {
    super(containerEl);
    this.id = uuidv4();
    this.client = client;
    this.kind = kind;
    this.code = code;
  }

  async onload() {
    console.log(`load: ${this.id}`);
    this.containerEl.classList.add("sagecell-container");

    const toolbarEl = this.containerEl.createEl("div");
    toolbarEl.classList.add("sagecell-toolbar");

    this.runButtonComp = new ButtonComponent(toolbarEl);
    this.runButtonComp.setIcon("play");
    this.runButtonComp.setClass("sagecell-button-exec");
    this.runButtonComp.onClick((evt) => { this.runCode.bind(this)(); });

    const contentEl = this.containerEl.createEl("div");
    contentEl.classList.add("sagecell-content")

    const preEl = contentEl.createEl("pre")
    preEl.classList.add(`language-sage-${this.kind}`);

    const codeEl = preEl.createEl("code");
    codeEl.classList.add(`language-sage-${this.kind}`);
    codeEl.textContent = this.code;

    this.outputEl = contentEl.createEl("div");
    this.outputEl.classList.add("sagecell-output");

    this.prismjs = await loadPrism();
    this.prismjs.highlightElement(codeEl);
  }

  async onunload() {
  }

  async runCode() {
    if(this.runButtonComp.disabled) return;

    // Clear the cell's output and disable the run button.
    this.outputEl.innerHTML = "";
    this.runButtonComp.setDisabled(true);
    this.runButtonComp.setIcon("loader");

    // Execute the code by calling the client.
    await this.client.connect();

    this.client.enqueue(this.code, this.outputEl, () => {
      this.runButtonComp.setDisabled(false);
      this.runButtonComp.setIcon("play");
    });
  }
}