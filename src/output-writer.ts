export default class OutputWriter {
  outputEl: HTMLElement

  constructor(target: HTMLElement) {
    this.outputEl = target;
  }

  appendText(text: string) {
    const spanEl = document.createElement("span");
    spanEl.innerText = text;
    this.outputEl.appendChild(spanEl);
  }

  appendImage(url: string) {
    const imgEl = document.createElement("img");
    imgEl.src = url;
    imgEl.classList.add('sagecell-image');

    this.outputEl.appendChild(imgEl);
    this.outputEl.appendChild(document.createTextNode("\n"));
  }

  appendSafeHTML(html: string) {
    const parser = new DOMParser();
    const unsafeDoc = parser.parseFromString(html, 'text/html');

    unsafeDoc.querySelectorAll('script').forEach((scriptEl: HTMLElement) => {
      if (scriptEl.type == 'math/tex') {
        const mathEl = document.createElement('math');
        mathEl.appendChild(document.createTextNode(scriptEl.innerText));
        scriptEl.parentNode.replaceChild(mathEl, scriptEl);
      }
    });

    const safeHTML = window.DOMPurify.sanitize(unsafeDoc.documentElement.innerHTML);
    const safeDoc = parser.parseFromString(safeHTML, 'text/html');

    safeDoc.querySelectorAll('math').forEach((mathEl: HTMLElement) => {
      const spanEl = document.createElement('span')
      spanEl.classList = 'math math-inline';
      spanEl.appendChild(window.MathJax.tex2chtml(mathEl.textContent, {display: false}));
      mathEl.parentNode.replaceChild(spanEl, mathEl);
    });

    this.outputEl.innerHTML += safeDoc.body.innerHTML;
    
    MathJax.startup.document.clear();
    MathJax.startup.document.updateDocument();
  }

  appendError(error: any) {
    const spanEl = document.createElement("pre");
    spanEl.classList.add('sagecell-error');
    spanEl.innerText =`${error.ename}: ${error.evalue}`;

    this.outputEl.appendChild(spanEl);
  }
}