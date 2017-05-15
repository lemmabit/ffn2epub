import { get, areStringsEquivalent, processTemplate, escapeForXML, makeSlug, detectImageType, renderDateString } from './utils.js';
import { heartquotes, stringquotes } from './heartquotes.js';
import * as OCFWriter from './ocf-writer.js';

// note that this function modifies `doc` in place.
export function fromFFHTML({ story: doc, storyPage }) {
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
  
  const coverImageA = storyPage.querySelector('.story_image a');
  const coverImageURL = coverImageA && coverImageA.href;
  
  const descriptionMeta = storyPage.querySelector('meta[property="og:description"]');
  const description = descriptionMeta.getAttribute('content');
  
  const datePublishedSpan = document.querySelector('.date_approved .published ~ span');
  const datePublishedParts = /(\d+)[a-z]* ([a-z]+) (\d+)/i.exec(datePublishedSpan.textContent);
  const datePublished = new Date();
  datePublished.setUTCMilliseconds(0);
  datePublished.setUTCSeconds(0);
  datePublished.setUTCMinutes(0);
  datePublished.setUTCHours(0);
  datePublished.setUTCDate(datePublishedParts[1] |0);
  datePublished.setUTCMonth({
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
  }[datePublishedParts[2].slice(0, 3).toLowerCase()] |0);
  datePublished.setUTCFullYear(datePublishedParts[3] |0);
  
  return {
    title,
    url,
    author,
    authorURL,
    coverImageURL,
    description,
    datePublished,
    chapters,
  };
}

import resources_container_xml from './resources/container.xml';
import resources_package_opf from './resources/package.opf';
import resources_nav_xhtml from './resources/nav.xhtml';
import resources_chapter_xhtml from './resources/chapter.xhtml';
import resources_cover_image_xhtml from './resources/cover-image.xhtml';
import resources_style_css from './resources/style.css';

const reVoidTag = /^(?:area|base|br|col|embed|hr|img|input|keygen|link|meta|param|source|track|wbr)$/i;

export function toEPUB(book) {
  const now = new Date();
  now.setUTCMilliseconds(0);
  
  const ocfWriter = OCFWriter.create();
  ocfWriter.addFile('META-INF/container.xml', resources_container_xml);
  
  const slugs = new Map();
  const leadingZeroes = String(book.chapters.length).replace(/./g, '0');
  const images = new Map();
  const prereqPromises = new Map();
  const allNecessaryPromises = [];
  let imageCounter = 0;
  book.chapters.forEach((chapter, index) => {
    slugs.set(chapter, makeSlug(`${(leadingZeroes + (index + 1)).slice(-leadingZeroes.length)}-${chapter.title}`));
    const promises = [];
    chapter.elements.forEach(el => {
      const imgs = el.getElementsByTagName('img');
      for(let i = 0; i < imgs.length; ++i) {
        const src = imgs[i].src;
        if(!images.has(src)) {
          const imageNumber = ++imageCounter;
          const p = get(src, 'arraybuffer').then(buf => {
            const leadingZeroes = String(imageCounter).replace(/./g, '0');
            const { ext, mime } = detectImageType(buf);
            const id = `img${(leadingZeroes + imageNumber).slice(-leadingZeroes.length)}`;
            const name = `${id}.${ext}`;
            ocfWriter.addFile(name, buf);
            images.set(src, { id, name, mime });
          });
          images.set(src, p);
          allNecessaryPromises.push(p);
        }
        promises.push(Promise.resolve(images.get(src)));
      }
    });
    prereqPromises.set(chapter, Promise.all(promises));
  });
  const coverImagePromise = book.coverImageURL ? get(book.coverImageURL, 'arraybuffer').then(buf => {
    const { ext, mime } = detectImageType(buf);
    const name = `cover-image.${ext}`;
    ocfWriter.addFile(name, buf);
    const out = { id: 'cover-image', name, mime, buf };
    images.set({}, out);
    return out;
  }) : Promise.resolve();
  const coverImageElementPromise = book.coverImageURL && coverImagePromise.then(({ id, name, mime, buf }) => new Promise((resolve, reject) => {
    const img = document.createElement('img');
    img.onerror = img.onabort = reject;
    img.onload = () => resolve({ id, name, mime, buf, img });
    img.src = URL.createObjectURL(new Blob([buf], { type: mime }));
  }));
  allNecessaryPromises.push(coverImagePromise);
  const resourcesPromise = Promise.all(allNecessaryPromises);
  
  ocfWriter.addFile('package.opf', resourcesPromise.then(() => processTemplate(resources_package_opf, {
    EPUB_VERSION:       escapeForXML('3.0'),
    URI:                escapeForXML(book.url),
    TITLE:              escapeForXML(book.title),
    LAST_MODIFIED_DATE: escapeForXML(renderDateString(now)),
    AUTHOR:             escapeForXML(book.author),
    DESCRIPTION:        escapeForXML(book.description),
    PUBLISHED_DATE:     escapeForXML(renderDateString(book.datePublished)),
    COVER_IMAGE_META:   book.coverImageURL ? '<meta name="cover" content="cover-image" />' : '',
    CHAPTER_ITEMS:      (book.coverImageURL ? ['<item id="cover-image-page" href="cover-image.xhtml" media-type="application/xhtml+xml" properties="svg" />'] : []).concat(book.chapters.map(ch => {
      const slug = slugs.get(ch);
      if(slug !== escapeForXML(slug)) {
        throw Error("Slugs should always be XML-safe!");
      }
      return `<item id="ch${slug}" href="${slug}.xhtml" media-type="application/xhtml+xml" />`;
    })),
    IMAGE_ITEMS:        Array.from(images.values()).map(({ id, name, mime }) => {
      return `<item id="${escapeForXML(id)}" href="${escapeForXML(name)}" media-type="${escapeForXML(mime)}"${id === 'cover-image' ? ' properties="cover-image"' : ''} />`;
    }),
    CHAPTER_ITEMREFS:   (book.coverImageURL ? ['<itemref idref="cover-image-page" linear="no" />'] : []).concat(book.chapters.map(ch => {
      const slug = slugs.get(ch);
      if(slug !== escapeForXML(slug)) {
        throw Error("Slugs should always be XML-safe!");
      }
      return `<itemref idref="ch${slug}" linear="yes" />`;
    })),
  })));
  ocfWriter.addFile('nav.xhtml', processTemplate(resources_nav_xhtml, {
    STORY_TITLE:        escapeForXML(stringquotes(book.title)),
    CHAPTER_LIS:        book.chapters.map(ch => {
      const slug = slugs.get(ch);
      if(slug !== escapeForXML(slug)) {
        throw Error("Slugs should always be XML-safe!");
      }
      return `<li><a href="${slug}.xhtml">${escapeForXML(stringquotes(ch.title))}</a></li>`;
    }),
  }));
  ocfWriter.addFile('style.css', resources_style_css);
  if(book.coverImageURL) {
    ocfWriter.addFile('cover-image.xhtml', coverImageElementPromise.then(({ name, img }) => processTemplate(resources_cover_image_xhtml, {
      IMAGE_WIDTH: escapeForXML(img.naturalWidth),
      IMAGE_HEIGHT: escapeForXML(img.naturalHeight),
      IMAGE_NAME: escapeForXML(name),
    })));
  }
  book.chapters.forEach(chapter => {
    const slug = slugs.get(chapter);
    const prereq = prereqPromises.get(chapter);
    ocfWriter.addFile(`${slug}.xhtml`, prereq.then(() => processTemplate(resources_chapter_xhtml, {
      STORY_TITLE:        escapeForXML(stringquotes(book.title)),
      CHAPTER_TITLE:      escapeForXML(stringquotes(chapter.title)),
      ELEMENTS:           chapter.elements.map(el => {
        var TEXT_NODE = Element.TEXT_NODE, ELEMENT_NODE = Element.ELEMENT_NODE;
        
        function render(el) {
          let out = '';
          
          let tagName = el.tagName.toLowerCase();
          let classNames = el.getAttribute('class') || '';
          if(tagName === 'center') {
            tagName = 'p';
            classNames = 'center ' + classNames;
          }
          classNames = classNames.trim();
          
          if(tagName === 'iframe') {
            return '';
          }
          
          out += '<';
          out += tagName;
          if(classNames) {
            out += ` class="${escapeForXML(classNames)}"`;
          }
          Array.prototype.forEach.call(el.attributes, ({ name, value }) => {
            name = name.toLowerCase();
            if(tagName === 'img' && name === 'src') {
              value = images.get(el.src).name;
            }
            if(name !== 'class') {
              out += ` ${name}="${escapeForXML(value)}"`;
            }
          });
          if(reVoidTag.test(tagName)) {
            out += ' />';
            return out;
          }
          out += '>';
          
          const children = el.childNodes;
          for(let i = 0; i < children.length; ++i) {
            var child = children[i];
            if(child.nodeType === TEXT_NODE) {
              out += escapeForXML(child.nodeValue);
            } else if(child.nodeType === ELEMENT_NODE) {
              out += render(child);
            }
          }
          
          out += `</${tagName}>`;
          
          return out;
        }
        
        return render(el);
      }),
    })));
  });
  return resourcesPromise.then(() => ocfWriter.generate());
}
