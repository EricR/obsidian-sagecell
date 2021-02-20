import { App, MarkdownPostProcessor, MarkdownPostProcessorContext, Notice } from 'obsidian';
import SageCellPlugin from './main'

export default class Renderer {
  plugin: SageCellPlugin;

  constructor(plugin: SageCellPlugin) {
    this.plugin = plugin;
  }

  postprocessor: MarkdownPostProcessor = (el: HTMLElement, ctx: MarkdownPostProcessorContext) => {
    const elPre = el.querySelector('pre');
    if (!elPre) return;

    const elCode = elPre.querySelector('code.language-sage');
    if (!elCode) return;

    const elOutput = document.createElement('pre');
    elOutput.classList.add('sagecell');
    elPre.parentNode.insertBefore(elOutput, elPre.nextSibling);

    const msg = {
      code: elCode.textContent,
      silent: false,
      store_history: false,
      user_expressions: {
        "_sagecell_files": "sys._sage_.new_files()",
      },
      "allow_stdin": false
    }

    this.plugin.client.ensureConnected().then(() => {
      this.plugin.client.send('execute_request', msg, elOutput);
    });
  }
}