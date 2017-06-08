import { get, escapeForHTML, showCustomError } from './utils.js';
import * as Book from './book.js';
import { getSettings } from './inject-settings.js';

window.addEventListener('click', ev => {
  const {
    centerHeadings,
    enableHeartquotes,
    markAsNonlinear,
    autoHyphens,
    paragraphSpacing,
    epubVersion,
  } = getSettings();
  
  const a = ev.target.closest('a[title="Download Story (.epub)"]');
  if(!a) return;
  const match = /download\/(\d+)\/epub/.exec(a.href);
  if(!match) return;
  const storyID = decodeURIComponent(match[1]);
  const storyContainer = a.closest('.story_container');
  
  Promise.resolve()
  .then(() => get(storyContainer.querySelector('a[title="Download Story (.html)"]').href, 'document'))
  .then(story => {
    const book = Book.fromFFHTML({
      story,
      storyContainer,
      enableHeartquotes,
    });
    return Book.toEPUB(book, {
      centerHeadings,
      enableHeartquotes,
      markAsNonlinear,
      autoHyphens,
      paragraphSpacing,
      epubVersion,
    }).then(blob => ({
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
