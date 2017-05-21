import { get, escapeForHTML, showCustomError } from './utils.js';
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
    
    if(includeAuthorsNotes) {
      const readIcons = storyContentBox.querySelectorAll('.chapter-read-icon');
      for(let i = 0; i < readIcons.length; ++i) {
        // restore the original read/unread state.
        // this will look weird, but it's for the user's own good.
        readIcons[i].classList.toggle('chapter-read'); // set it to the wrong state.
        readIcons[i].click(); // toggle it back to the right state.
      }
    }
  })
  .catch(err => {
    showCustomError(`
      <div style="text-align: left;">
        <p>
          An error occurred in the process of generating an EPUB. This may be a
          problem on your end, e.g. a network error. Or it may be a bug.
        </p>
        <p style="margin-top: 1em;">
          Reload the page and try again. (If the page won't load, there's your
          problem.) If you get this error message again, please report it to me.
        </p>
        <p style="margin-top: 1em;">
          The best place to submit a bug report is
          <a href="https://github.com/Permutatrix/ffn2epub/issues">on GitHub</a>.
          If you don't want to make an account there,
          <a href="https://www.fimfiction.net/user/Permutator">PM me</a>.
        </p>
        <p style="margin-top: 1em;">
          Regardless of where you report the bug, please include the stack trace
          below. The report is useless without it. You should also include the
          name of your browser and the extension you're running the script under
          (probably either Greasemonkey or Tampermonkey).
        </p>
        <textarea style="margin-top: 1em; font-family: monospace; width: 100%; height: 7em;">\`\`\`
${escapeForHTML(String(err) + '\n\n' + err.stack)}
\`\`\`</textarea>
      </div>
    `, { width: '600px' });
  });
  
  ev.preventDefault();
  return false;
}, false);
