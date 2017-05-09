import { get, escapeForHTML } from './utils.js';
import * as Book from './book.js';

window.addEventListener('click', ev => {
  const a = ev.target.closest('a[href^="/download_epub.php"]');
  if(!a) return;
  const match = /[\?&]story=([^&]*)/.exec(a.href);
  if(!match) return;
  const storyID = decodeURIComponent(match[1]);
  
  get(`/download_story.php?story=${storyID}&html`, 'text')
  .then(html => {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const book = Book.fromFFHTML(doc);
    return Book.toEPUB(book);
  })
  .then(blob => {
    window.location = URL.createObjectURL(blob);
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
