import { get, escapeForHTML } from './utils.js';
import * as Book from './book.js';

window.addEventListener('click', ev => {
  const a = ev.target.closest('a[href^="/download_epub.php"]');
  if(!a) return;
  const match = /[\?&]story=([^&]*)/.exec(a.href);
  if(!match) return;
  const storyID = decodeURIComponent(match[1]);
  const storyContentBox = a.closest('.story_content_box');
  
  Promise.all([
    get(`/download_story.php?story=${storyID}&html`, 'text'),
    get(storyContentBox.querySelector('a.story_name').href, 'text'),
  ])
  .then(([storyHTML, storyPageHTML]) => {
    const story = new DOMParser().parseFromString(storyHTML, 'text/html');
    const storyPage = new DOMParser().parseFromString(storyPageHTML, 'text/html');
    const book = Book.fromFFHTML({ story, storyPage });
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
