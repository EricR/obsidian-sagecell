import { sanitizeHTMLToDom, renderMath, finishRenderMath } from 'obsidian';

export default class OutputWriter {
  outputEl: HTMLElement
  lastType: string

  constructor(target: HTMLElement) {
    this.outputEl = target;
    this.lastType = "";
  }

  async appendText(text: string) {
    if (this.lastType == 'text') {
      const previousPreEl = this.outputEl.querySelectorAll('pre');

      if (previousPreEl.length > 0) {
        previousPreEl[previousPreEl.length-1].innerText += text;
      }
    } else {
      const preEl = document.createElement("pre");
      preEl.innerText = text;
      this.outputEl.appendChild(preEl);
    }
    this.lastType = 'text';
  }

  async appendImage(url: string) {
    const imgEl = document.createElement("img");
    imgEl.src = url;
    imgEl.classList.add('sagecell-image');

    this.outputEl.appendChild(imgEl);
    this.outputEl.appendChild(document.createTextNode("\n"));
    this.lastType = 'image';
  }

  async appendSafeHTML(html: string) {
    const safeContainer = document.createElement("div");
    safeContainer.append(sanitizeHTMLToDom(html));
    safeContainer.innerHTML = this.replaceMathJax(safeContainer.innerHTML);

    this.outputEl.appendChild(safeContainer);
    this.lastType = 'html';    
  }

  async appendError(error: any) {
    const spanEl = document.createElement("pre");
    spanEl.classList.add('sagecell-error');
    spanEl.innerText =`${error.ename}: ${error.evalue}`;

    this.outputEl.appendChild(spanEl);
    this.lastType = 'error';
  }

  replaceMathJax(html: string) : string {
    if(!html.startsWith("\\(") && !html.startsWith("\\[")) {
      return html
    }

    html = html.replace(/\\\((.*)\\\)/g, (m, $1) => {
      return renderMath($1, false).innerHTML;
    });

    html = html.replace(/\\\[(.*)\\\]/g, (m, $1) => {
      return renderMath($1, true).innerHTML;
    });

    finishRenderMath();

    return html
  }
}