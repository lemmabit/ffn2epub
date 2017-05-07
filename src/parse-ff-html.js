// note that this function modifies `doc` in place.
export function parseFFHTML(doc) {
  function isEmptyParagraph(el) {
    return el.outerHTML.toLowerCase() === '<p></p>';
  }
  
  const titleA = doc.querySelector('h1 a');
  const title = titleA.textContent.trim();
  const url = titleA.href;
  
  const authorA = doc.querySelector('h2 a');
  const author = authorA.textContent.trim();
  const authorURL = authorA.href;
  
  const allNamedAnchors = [...doc.querySelectorAll('a[name]')];
  const chapterAs = [...doc.querySelector('ul').getElementsByTagName('a')];
  const anchors = chapterAs.map(chapterA => {
    const name = /#(.+)$/.exec(chapterA.getAttribute('href'))[1];
    return allNamedAnchors.find(a => a.name === name);
  });
  
  const chapters = [];
  for(let i = 0; i < anchors.length; ++i) {
    const anchor = anchors[i];
    const nextAnchor = anchors[i + 1] || null;
    
    const chapterTitleH3 = anchor.nextElementSibling;
    if(chapterTitleH3.tagName.toLowerCase() !== 'h3') {
      throw Error(`The first element after <a name="${anchor.name}"> was <${chapterTitleH3.tagName}>; expected <h3>`);
    }
    const chapterTitle = chapterTitleH3.textContent.trim();
    
    const elements = [];
    
    const titleElement = doc.createElement('h1');
    titleElement.classList.add('generated-chapter-title');
    titleElement.textContent = chapterTitle;
    elements.push(titleElement);
    
    for(let el = chapterTitleH3.nextElementSibling; el !== nextAnchor; el = el.nextElementSibling) {
      if(elements.length > 1 || !isEmptyParagraph(el)) { // skip any leading <p></p>.
        elements.push(el);
      }
    }
    
    if(elements[elements.length - 1].tagName.toLowerCase() === 'hr') {
      elements.pop();
    }
    while(isEmptyParagraph(elements[elements.length - 1])) {
      elements.pop(); // cut off any trailing <p></p>.
    }
    
    elements.forEach(heartquotes); // smartify quotes and ellipses.
    
    chapters.push({
      chapterTitle,
      elements,
    });
  }
  
  const existingTitleElements = chapters.map(({ chapterTitle, elements }) => {
    for(let i = 1; i < elements.length; ++i) {
      const el = elements[i];
      const textContent = el.textContent;
      if(/[^\W_]/.test(textContent)) {
        if(areStringsEquivalent(textContent, chapterTitle)) {
          return el;
        } else {
          return;
        }
      }
    }
  });
  
  if(existingTitleElements.every(x => x)) {
    // every chapter brings its own title.
    for(let i = 0; i < chapters.length; ++i) {
      existingTitleElements[i].classList.add('chapter-title');
      chapters[i].elements.shift(); // remove the generated title.
    }
  }
  // if any chapter doesn't bring its own title, generate titles for them all.
  // this will lead to redundancy in some cases, but that's better than
  // inconsistency.
  
  return {
    title,
    url,
    author,
    authorURL,
    chapters,
  };
}
