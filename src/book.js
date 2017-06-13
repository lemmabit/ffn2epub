import { areStringsEquivalent, processTemplate, escapeForXML, makeSlug, renderDateString, createImageElement, getImage } from './utils.js';
import { heartquotes, stringquotes } from './heartquotes.js';
import * as OCFWriter from './ocf-writer.js';

// note that this function modifies the passed-in documents in place.
export function fromFFHTML({ story: doc, storyInfoBox, enableHeartquotes, includeAuthorsNotes }) {
  function isEmptyParagraph(el) {
    return el.outerHTML.toLowerCase() === '<p></p>';
  }
  
  const titleA = doc.querySelector('h1 a');
  const title = titleA.textContent.trim();
  const url = titleA.href.replace(/^http:/, 'https:');
  
  const authorA = doc.querySelector('h2 a');
  const author = authorA.textContent.trim();
  const authorURL = authorA.href.replace(/^http:/, 'https:');
  
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
    
    const chapterTitleH1 = anchor.closest('h1');
    const chapterTitle = chapterTitleH1.textContent.trim();
    
    const elements = [];
    
    const titleElement = doc.createElement('h1');
    titleElement.classList.add('generated-chapter-title');
    titleElement.textContent = chapterTitle;
    elements.push(titleElement);
    
    for(let el = chapterTitleH1.closest('header').nextElementSibling; el && !el.matches('footer'); el = el.nextElementSibling) {
      if(
        !el.matches('base') && // skip <base>
        (includeAuthorsNotes || !el.matches('aside.authors-note')) && // skip author's notes if asked to
        (elements.length > 1 || !isEmptyParagraph(el)) // skip leading <p></p>
      ) {
        elements.push(el);
      }
    }
    
    while(isEmptyParagraph(elements[elements.length - 1])) {
      elements.pop(); // cut off any trailing <p></p>.
    }
    
    if(enableHeartquotes) {
      // smartify quotes and ellipses.
      elements.forEach(el => {
        if(el.matches('aside.authors-note')) {
          [...el.children].forEach(heartquotes);
        } else {
          heartquotes(el);
        }
      });
    }
    
    chapters.push({
      title: chapterTitle,
      elements,
    });
  }
  
  const existingTitleElements = chapters.map(({ title, elements }) => {
    for(let i = 1; i < elements.length; ++i) {
      const el = elements[i];
      if(el.matches('aside.authors-note')) {
        return;
      }
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
  
  const coverImageImg = storyInfoBox.querySelector('.story_container__story_image img, img.story_image');
  const coverImageURL = coverImageImg && coverImageImg.getAttribute('data-fullsize');
  
  const descriptionSummary = doc.querySelector('header > details > summary');
  const description = descriptionSummary.textContent.trim();
  
  const longDescription = (function() {
    const elements = [];
    for(let el = descriptionSummary.nextElementSibling; el; el = el.nextElementSibling) {
      if(elements.length > 0 || !isEmptyParagraph(el)) { // skip any leading <p></p>.
        elements.push(el);
      }
    }
    while(isEmptyParagraph(elements[elements.length - 1])) {
      elements.pop(); // cut off any trailing <p></p>.
    }
    
    const titleElement = document.createElement('h1');
    titleElement.classList.add('generated-chapter-title');
    titleElement.textContent = title;
    const authorElement = document.createElement('div');
    authorElement.classList.add('generated-author-attribution');
    authorElement.textContent = `by ${author}`;
    elements.unshift(titleElement, authorElement);
    
    const fimficLinkContainer = document.createElement('p');
    fimficLinkContainer.classList.add('generated-fimfiction-link');
    const fimficLinkElement = document.createElement('a');
    fimficLinkElement.href = url;
    fimficLinkElement.textContent = "Published on Fimfiction.net.";
    fimficLinkContainer.appendChild(fimficLinkElement);
    elements.push(fimficLinkContainer);
    
    if(enableHeartquotes) {
      elements.forEach(heartquotes); // just like with chapters.
    }
    
    return {
      title,
      elements,
    };
  })();
  
  const datePublishedTime = doc.querySelector('header > h1 + h2 + p > time');
  const datePublished = new Date(datePublishedTime.getAttribute('datetime'));
  
  const contentRatingA = storyInfoBox.querySelector('[class*="content-rating-"], [class*="content_rating_"]');
  const { contentRating } = [
    { className: 'content-rating-everyone', contentRating: 'Everyone' },
    { className: 'content-rating-teen',     contentRating: 'Teen' },
    { className: 'content-rating-mature',   contentRating: 'Mature' },
  ].find(({ className }) => {
    return contentRatingA.classList.contains(className) ||
           contentRatingA.classList.contains(className.replace(/\-/g, '_'));
  });
  
  const categories = [...storyInfoBox.querySelectorAll('.tag-genre')].map(a => a.title.trim() || a.textContent.trim());
  
  const characterTags = [...storyInfoBox.querySelectorAll('.tag-character')].map(a => {
    return {
      human: a.title.trim(),
      machine: a.getAttribute('data-tag'),
    };
  });
  
  return {
    title,
    url,
    author,
    authorURL,
    coverImageURL,
    description,
    longDescription,
    datePublished,
    contentRating,
    categories,
    characterTags,
    chapters,
  };
}

import resources_container_xml from './resources/container.xml';
import resources_package_opf from './resources/package.opf';
import resources_nav_xhtml from './resources/nav.xhtml';
import resources_nav_ncx from './resources/nav.ncx';
import resources_chapter_xhtml from './resources/chapter.xhtml';
import resources_cover_image_xhtml from './resources/cover-image.xhtml';
import resources_style_css from './resources/style.css';

export function toEPUB(book, {
  centerHeadings,
  enableHeartquotes,
  markAsNonlinear,
  autoHyphens,
  paragraphSpacing,
  epubVersion,
}) {
  function maybeStringquotes(string) {
    if(enableHeartquotes) {
      return stringquotes(string);
    } else {
      return string;
    }
  }
  
  const nonlinear = markAsNonlinear ? 'no' : 'yes';
  
  const now = new Date();
  now.setUTCMilliseconds(0);
  
  const ocfWriter = OCFWriter.create();
  ocfWriter.addFile('META-INF/container.xml', resources_container_xml);
  
  const customCSS = (function() {
    let hyphenationCSS = `
      h1, .chapter-title {
        hyphens: none;
        -epub-hyphens: none;
        -webkit-hyphens: none;
        -moz-hyphens: none;
        adobe-hyphenate: none;
      }
      `;
    if(autoHyphens === 'never') {
      hyphenationCSS = `
      html, body {
        hyphens: none;
        -epub-hyphens: none;
        -webkit-hyphens: none;
        -moz-hyphens: none;
        adobe-hyphenate: none;
      }
      `;
    } else if(autoHyphens === 'always') {
      hyphenationCSS = `
      html, body {
        hyphens: auto;
        -epub-hyphens: auto;
        -webkit-hyphens: auto;
        -moz-hyphens: auto;
        adobe-hyphenate: auto;
      }
      ` + hyphenationCSS;
    } else if(autoHyphens === 'always+shy') {
      hyphenationCSS = `
      html, body {
        hyphens: manual;
        -epub-hyphens: manual;
        -webkit-hyphens: manual;
        -moz-hyphens: manual;
        adobe-hyphenate: explicit;
      }
      ` + hyphenationCSS;
    }
    let headingsCSS = '';
    if(centerHeadings) {
      headingsCSS = `
      h1, .generated-author-attribution {
        text-align: center;
      }
      `;
    }
    const spacingParts = new Set(paragraphSpacing.split('+'));
    let spacingCSS = `
      p {
        text-indent: ${spacingParts.has('indent') ? '2.5em' : '0'};
      }
      `;
    if(spacingParts.has('indent') && !spacingParts.has('first')) {
      spacingCSS += `
      p.first-paragraph {
        text-indent: 0;
      }
      `;
    }
    if(spacingParts.has('double')) {
      spacingCSS += `
      /* Mostly a bunch of selectors from Fimfiction itself. */
      .generated-author-attribution,
      .bbcode-center, .embed-container,
      p, blockquote, hr, ul, ol, pre, figure,
      h1, h2, h3, h4, h5, h6,
      .imgur-embed-iframe-pub, .oembed,
      .story-embed, .bbcode__block,
      .bbcode-right, .excerpt, .plaque {
        margin-top: 1.15em;
      }
      `;
    } else {
      spacingCSS += `
      .generated-author-attribution {
        margin: 1.15em 0;
      }
      `;
    }
    return (hyphenationCSS + headingsCSS + spacingCSS).trim().split(/\n {0,6}/);
  })();
  
  const slugs = new Map();
  const descriptionAndChapters = [book.longDescription].concat(book.chapters);
  const chaptersLeadingZeroes = String(book.chapters.length).replace(/./g, '0');
  const images = new Map();
  const prereqPromises = new Map();
  const allNecessaryPromises = [];
  let imageCounter = 0;
  descriptionAndChapters.forEach((chapter, index) => {
    if(chapter === book.longDescription) {
      slugs.set(chapter, 'long-desc');
    } else {
      slugs.set(chapter, makeSlug(`${(chaptersLeadingZeroes + index).slice(-chaptersLeadingZeroes.length)}-${chapter.title}`));
    }
    const promises = [];
    chapter.elements.forEach(el => {
      const imgs = el.getElementsByTagName('img');
      for(let i = 0; i < imgs.length; ++i) {
        const src = imgs[i].src;
        if(!images.has(src)) {
          const imageNumber = ++imageCounter;
          const p = getImage(src).then(({ data, imageType: { ext, mime } }) => {
            const id = `img${(imagesLeadingZeroes + imageNumber).slice(-imagesLeadingZeroes.length)}`;
            const name = `${id}.${ext}`;
            ocfWriter.addFile(name, data);
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
  const imagesLeadingZeroes = String(imageCounter).replace(/./g, '0');
  const coverImagePromise = book.coverImageURL ? getImage(book.coverImageURL).then(({ data, imageType: { ext, mime }, img }) => {
    const name = `cover-image.${ext}`;
    ocfWriter.addFile(name, data);
    images.set({}, { id: 'cover-image', name, mime });
    return { id: 'cover-image', name, mime, data, img };
  }) : Promise.resolve();
  const coverImageElementPromise = book.coverImageURL && coverImagePromise.then(({ id, name, mime, data, img }) => {
    if(img) {
      return { id, name, mime, img };
    } else {
      const blob = data instanceof Blob ? data : new Blob([data], { type: mime });
      return createImageElement(blob).then(img => ({ id, name, mime, img }));
    }
  });
  allNecessaryPromises.push(coverImagePromise);
  const resourcesPromise = Promise.all(allNecessaryPromises);
  
  ocfWriter.addFile('package.opf', resourcesPromise.then(() => processTemplate(resources_package_opf, {
    EPUB_VERSION:       escapeForXML(epubVersion),
    URI:                escapeForXML(book.url),
    TITLE:              escapeForXML(book.title),
    LAST_MODIFIED_DATE: escapeForXML(renderDateString(now)),
    AUTHOR:             escapeForXML(book.author),
    CATEGORY_SUBJECTS:  [`Rated "${book.contentRating}"`].concat(book.categories).map(cat => {
      let machineForm = cat.toLowerCase();
      machineForm = {
        'rated "everyone"': 'everyone',
        'rated "teen"': 'teen',
        'rated "mature"': 'mature',
        '2nd person': '2nd',
        'alternate universe': 'au',
        'equestria girls': 'eqg',
        'sci-fi': 'scifi',
        'slice of life': 'sol',
      }[machineForm] || machineForm;
      return `<dc:subject opf:authority="https://www.fimfiction.net/tag-information" opf:term="${escapeForXML(machineForm)}">${escapeForXML(cat)}</dc:subject>`;
    }),
    CHARACTER_SUBJECTS: book.characterTags.map(({ human, machine }) => {
      // <https://www.fimfiction.net/tags> is a poor choice, but there's no
      // list of every character tag outside of the "edit story" interface.
      return `<dc:subject opf:authority="https://www.fimfiction.net/tags" opf:term="${escapeForXML(machine)}">${escapeForXML(human)}</dc:subject>`;
    }),
    DESCRIPTION:        escapeForXML(book.description),
    PUBLISHED_DATE:     escapeForXML(renderDateString(book.datePublished)),
    COVER_IMAGE_META:   book.coverImageURL ? '<meta name="cover" content="cover-image" />' : '',
    CHAPTER_ITEMS:      (book.coverImageURL ? ['<item id="cover-image-page" href="cover-image.xhtml" media-type="application/xhtml+xml" properties="svg" />'] : []).concat(['<item id="long-desc" href="long-desc.xhtml" media-type="application/xhtml+xml" />'], book.chapters.map(ch => {
      const slug = slugs.get(ch);
      if(slug !== escapeForXML(slug)) {
        throw Error("Slugs should always be XML-safe!");
      }
      return `<item id="ch${slug}" href="${slug}.xhtml" media-type="application/xhtml+xml" />`;
    })),
    IMAGE_ITEMS:        Array.from(images.values()).map(({ id, name, mime }) => {
      return `<item id="${escapeForXML(id)}" href="${escapeForXML(name)}" media-type="${escapeForXML(mime)}"${id === 'cover-image' ? ' properties="cover-image"' : ''} />`;
    }),
    CHAPTER_ITEMREFS:   (book.coverImageURL ? [
      `<itemref idref="cover-image-page" linear="${nonlinear}" />`
    ] : []).concat([
      `<itemref idref="long-desc" linear="${nonlinear}" />`,
      `<itemref idref="nav" linear="${nonlinear}" />`
    ], book.chapters.map(ch => {
      const slug = slugs.get(ch);
      if(slug !== escapeForXML(slug)) {
        throw Error("Slugs should always be XML-safe!");
      }
      return `<itemref idref="ch${slug}" linear="yes" />`;
    })),
  })));
  ocfWriter.addFile('nav.xhtml', processTemplate(resources_nav_xhtml, {
    STORY_TITLE:        escapeForXML(maybeStringquotes(book.title)),
    CUSTOM_CSS:         customCSS,
    CHAPTER_LIS:        book.chapters.map(ch => {
      const slug = slugs.get(ch);
      if(slug !== escapeForXML(slug)) {
        throw Error("Slugs should always be XML-safe!");
      }
      return `<li><a href="${slug}.xhtml">${escapeForXML(maybeStringquotes(ch.title))}</a></li>`;
    }),
    COVER_LI:           book.coverImageURL ? '<li><a epub:type="cover" href="cover-image.xhtml">Cover</a></li>' : '',
    FIRST_CHAPTER_NAME: escapeForXML(`${slugs.get(book.chapters[0])}.xhtml`),
  }));
  ocfWriter.addFile('nav.ncx', processTemplate(resources_nav_ncx, {
    URI:                escapeForXML(book.url),
    TITLE:              escapeForXML(book.title),
    AUTHOR:             escapeForXML(book.author),
    CHAPTER_NAV_POINTS: book.chapters.map((ch, index) => {
      const slug = slugs.get(ch);
      if(slug !== escapeForXML(slug)) {
        throw Error("Slugs should always be XML-safe!");
      }
      return [
        `<navPoint id="ch${slug}" playOrder="${index + 1}">`,
        `  <navLabel><text>${escapeForXML(ch.title)}</text></navLabel>`,
        `  <content src="${slug}.xhtml" />`,
        `</navPoint>`,
      ];
    }),
  }));
  ocfWriter.addFile('style.css', processTemplate(resources_style_css, {
    CUSTOM_CSS:         customCSS,
  }));
  if(book.coverImageURL) {
    ocfWriter.addFile('cover-image.xhtml', coverImageElementPromise.then(({ name, img }) => processTemplate(resources_cover_image_xhtml, {
      STORY_TITLE:        escapeForXML(maybeStringquotes(book.title)),
      IMAGE_WIDTH:        escapeForXML(img.naturalWidth),
      IMAGE_HEIGHT:       escapeForXML(img.naturalHeight),
      IMAGE_NAME:         escapeForXML(name),
    })));
  }
  descriptionAndChapters.forEach(chapter => {
    const slug = slugs.get(chapter);
    const prereq = prereqPromises.get(chapter);
    ocfWriter.addFile(`${slug}.xhtml`, prereq.then(() => processTemplate(resources_chapter_xhtml, {
      STORY_TITLE:        escapeForXML(maybeStringquotes(book.title)),
      CHAPTER_TITLE:      escapeForXML(maybeStringquotes(chapter.title)),
      ELEMENTS:           chapter.elements.map(el => renderAsXHTML({
        el, images,
        doHyphenate: autoHyphens === 'always+shy',
      })),
    })));
  });
  return resourcesPromise.then(() => ocfWriter.generate());
}

import Hypher from 'hypher';
import english from 'hyphenation.en-us';
let hypher;

const reVoidTag = /^(?:area|base|br|col|embed|hr|img|input|keygen|link|meta|param|source|track|wbr)$/i;

function renderAsXHTML({ el, images, doHyphenate }) {
  if(doHyphenate && !hypher) {
    hypher = new Hypher(english);
  }
  
  var TEXT_NODE = Element.TEXT_NODE, ELEMENT_NODE = Element.ELEMENT_NODE;
  
  function render(el) {
    let out = '';
    
    let tagName = el.tagName.toLowerCase();
    let classNames = el.getAttribute('class') || '';
    if(tagName === 'center') {
      tagName = 'p';
      classNames = 'center ' + classNames;
    } else if(el.matches('header, footer, aside')) {
      tagName = 'div';
    } else if(el.matches('.authors-note > header:first-child h1')) {
      tagName = 'b';
    }
    
    if(tagName === 'p' && !el.matches('p + p')) {
      // we have to mark this manually because ereaders tend to have
      // rather poor CSS implementations.
      classNames += ' first-paragraph';
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
      } else if(name === 'src' && typeof el.src === 'string') {
        value = el.src;
      } else if(name === 'href' && typeof el.href === 'string') {
        value = el.href;
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
        let text = child.nodeValue;
        if(doHyphenate && !el.closest('h1, .chapter-title')) {
          text = hypher.hyphenateText(text);
        }
        out += escapeForXML(text);
      } else if(child.nodeType === ELEMENT_NODE) {
        out += render(child);
      }
    }
    
    out += `</${tagName}>`;
    
    return out;
  }
  
  return render(el);
}
