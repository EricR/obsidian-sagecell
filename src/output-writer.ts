export default class OutputWriter {
  outputEl: HTMLElement
  lastType: string

  constructor(target: HTMLElement) {
    this.outputEl = target;
    this.lastType = "";
  }

  appendText(text: string) {
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

  appendImage(url: string) {
    const imgEl = document.createElement("img");
    imgEl.src = url;
    imgEl.classList.add('sagecell-image');

    this.outputEl.appendChild(imgEl);
    this.outputEl.appendChild(document.createTextNode("\n"));
    this.lastType = 'image';
  }

  appendSafeHTML(html: string) {
    const parser = new DOMParser();
    const unsafeDoc = parser.parseFromString(html, 'text/html');
    const safeHTML = window.DOMPurify.sanitize(unsafeDoc.documentElement.innerHTML, { ADD_TAGS: ['iframe']});
    const safeDoc = parser.parseFromString(safeHTML, 'text/html');

    this.outputEl.innerHTML += safeDoc.body.innerHTML;
    this.lastType = 'html';
  }

  appendError(error: any) {
    const spanEl = document.createElement("pre");
    spanEl.classList.add('sagecell-error');
    spanEl.innerText =`${error.ename}: ${error.evalue}`;

    this.outputEl.appendChild(spanEl);
    this.lastType = 'error';
  }
}