import { areStringsEquivalent, processTemplate, escapeForXML, makeSlug } from './utils.js';
import { heartquotes, stringquotes } from './heartquotes.js';
import * as OCFWriter from './ocf-writer.js';

// note that this function modifies `doc` in place.
export function fromFFHTML(doc) {
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
      title: chapterTitle,
      elements,
    });
  }
  
  const existingTitleElements = chapters.map(({ title, elements }) => {
    for(let i = 1; i < elements.length; ++i) {
      const el = elements[i];
      const textContent = el.textContent;
      if(/[^\W_]/.test(textContent)) {
        if(areStringsEquivalent(textContent, title)) {
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

import resources_container_xml from './resources/container.xml';
import resources_package_opf from './resources/package.opf';
import resources_nav_xhtml from './resources/nav.xhtml';

export function toEPUB(book) {
  const now = new Date();
  now.setUTCMilliseconds(0);
  const nowString = now.toISOString().replace(/\.000Z$/, 'Z');
  
  const slugs = new Map();
  const leadingZeroes = String(book.chapters.length).replace(/./g, '0');
  book.chapters.forEach((chapter, index) => {
    slugs.set(chapter, makeSlug(`${(leadingZeroes + (index + 1)).slice(-leadingZeroes.length)}-${chapter.title}`));
  });
  
  const ocfWriter = OCFWriter.create();
  ocfWriter.addFile("META-INF/container.xml", resources_container_xml);
  ocfWriter.addFile("package.opf", processTemplate(resources_package_opf, {
    EPUB_VERSION:       escapeForXML('3.0'),
    URI:                escapeForXML(book.url),
    TITLE:              escapeForXML(book.title),
    LAST_MODIFIED_DATE: escapeForXML(nowString),
    AUTHOR:             escapeForXML(book.author),
    CHAPTER_ITEMS:      book.chapters.map(ch => {
      const slug = slugs.get(ch);
      if(slug !== escapeForXML(slug)) {
        throw Error("Slugs should always be XML-safe!");
      }
      return `<item id="ch${slug}" href="${slug}.xhtml" media-type="application/xhtml+xml" />`;
    }),
    CHAPTER_ITEMREFS:   book.chapters.map(ch => {
      const slug = slugs.get(ch);
      if(slug !== escapeForXML(slug)) {
        throw Error("Slugs should always be XML-safe!");
      }
      return `<itemref idref="ch${slug}" />`;
    }),
  }));
  ocfWriter.addFile("nav.xhtml", processTemplate(resources_nav_xhtml, {
    STORY_TITLE:        escapeForXML(stringquotes(book.title)),
    CHAPTER_LIS:        book.chapters.map(ch => {
      const slug = slugs.get(ch);
      if(slug !== escapeForXML(slug)) {
        throw Error("Slugs should always be XML-safe!");
      }
      return `<li><a href="${slug}.xhtml">${escapeForXML(stringquotes(ch.title))}</a></li>`;
    }),
  }));
  return ocfWriter.generate();
}
