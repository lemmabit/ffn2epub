import { get, escapeForHTML } from './utils.js';
import * as Book from './book.js';
import * as Settings from './settings.js';

import './inject-settings.js';

window.addEventListener('click', ev => {
  const includeAuthorsNotes = Settings.get('includeAuthorsNotes', true);
  const epubVersion = Settings.get('epubVersion', '3.0');
  
  const a = ev.target.closest('a[href^="/download_epub.php"]');
  if(!a) return;
  const match = /[\?&]story=([^&]*)/.exec(a.href);
  if(!match) return;
  const storyID = decodeURIComponent(match[1]);
  const storyContentBox = a.closest('.story_content_box');
  
  Promise.all([
    get(storyContentBox.querySelector('a.story_name').href, 'document').then(storyPage => {
      if(includeAuthorsNotes) {
        return Promise.all(
          [...storyPage.querySelectorAll('.story_content_box a.chapter_link')]
          .map(a => get(a.href, 'document'))
        ).then(chapterPages => ({ storyPage, chapterPages }));
      } else {
        return { storyPage, chapterPages: undefined };
      }
    }),
    get(`/download_story.php?story=${storyID}&html`, 'document'),
  ])
  .then(([{ storyPage, chapterPages }, story]) => {
    const book = Book.fromFFHTML({ story, storyPage, chapterPages, includeAuthorsNotes });
    return Book.toEPUB(book, { epubVersion }).then(blob => ({
      filename: `${book.title} - ${book.author}.epub`,
      blob,
    }));
  })
  .then(({ filename, blob }) => {
    const a = document.createElement('a');
    a.style.display = 'none';
    const url = URL.createObjectURL(blob);
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 100);
  })
  .catch(err => {
    unsafeWindow.ShowErrorWindow(`
      <div style="text-align: left;">
        <p>An error occurred in the process of generating an EPUB.</p>
        <p>A stack trace can be found below if you'd like to report it:</p>
        <textarea style="font-family: monospace; width: 100%;">${escapeForHTML(String(err) + '\n\n' + err.stack)}</textarea>
      </div>
    `);
  });
  
  ev.preventDefault();
  return false;
}, false);
