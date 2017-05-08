import { get, escapeForHTML } from './utils.js';
import { parseFFHTML } from './parse-ff-html.js';
import * as OCFWriter from './ocf-writer.js';

window.addEventListener('click', ev => {
  const a = ev.target.closest('a[href^="/download_epub.php"]');
  if(!a) return;
  const match = /[\?&]story=([^&]*)/.exec(a.href);
  if(!match) return;
  const storyID = decodeURIComponent(match[1]);
  
  get(`/download_story.php?story=${storyID}&html`, 'text')
  .then(html => {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const book = parseFFHTML(doc);
    const ocfWriter = OCFWriter.create();
    ocfWriter.addFile('stuff/cool/yeah.txt', "Howdy!");
    ocfWriter.addFile('stuff/me.zip', ocfWriter.generate());
    return ocfWriter.generate().then(blob => {
      window.location = URL.createObjectURL(blob);
    });
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
