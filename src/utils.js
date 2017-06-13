export function get(url, responseType) {
  if(!url) {
    // Let's get an actually useful stack trace for this case.
    throw Error("Tried to get an empty URI!");
  }
  let isDocument = false;
  if(responseType === 'document') {
    isDocument = true;
    responseType = 'text';
  }
  return new Promise((resolve, reject) => {
    GM_xmlhttpRequest({
      method: "GET",
      url,
      responseType,
      onload({ status, response }) {
        if(status === 200) {
          if(!isDocument) {
            resolve(response);
          } else {
            // DURR HURR HURR
            resolve(new DOMParser().parseFromString(response + `<base href="${escapeForHTML(location.href)}" />`, 'text/html'));
          }
        } else {
          reject(Error(`Got HTTP response code ${status} for URL ${url}`));
        }
      },
      onerror() {
        reject(Error(`Request for ${url} errored`));
      },
      onabort() {
        reject(Error(`Request for ${url} was aborted`));
      },
    });
  });
}

export function showCustomError(html, options) {
  const { width } = options || {};
  
  // This is adapted from the `ShowErrorWindow` code from Fimfiction.net.
  // Probably not supposed to do that, technically.
  // But I don't imagine anyone cares.
  const menu = new unsafeWindow.PopUpMenu('', '<i class="fa fa-warning"></i> Error');
  menu.SetContent('');
  menu.SetCloseOnHoverOut(false);
  menu.SetFixed(true);
  menu.SetContent(`<center style="padding: 18px;">${html}</center>`);
  menu.SetFooter('<center><button id="alert_button" class="styled_button" style="padding: 5px 40px;">Ok</button></center>');
  menu.element.querySelector('.drop-down-pop-up').style.width = width || '350px';
  menu.Show();
  document.getElementById('alert_button').addEventListener('click', ev => {
    ev.preventDefault();
    ev.stopPropagation();
    menu.Close()
  }, true);
}

export function makeSafeUint8Array(dumb) {
  const data = dumb.wrappedJSObject || dumb;
  
  const length = dumb.length;
  const out = new Uint8Array(length);
  for(let i = 0; i < length; ++i) {
    out[i] = data[i];
  }
  return out;
}

export function escapeForHTML(string) {
  const div = document.createElement('div');
  div.textContent = string;
  return div.innerHTML;
}

// the ordering is important because '&' appears in entity references.
const xmlEntities = [
  { reference: '&amp;',  regex: /&/g },
  { reference: '&quot;', regex: /"/g },
  { reference: '&apos;', regex: /'/g },
  { reference: '&lt;',   regex: /</g },
  { reference: '&gt;',   regex: />/g },
];

export function escapeForXML(string) {
  string = String(string);
  for(let i = 0; i < xmlEntities.length; ++i) {
    const { reference, regex } = xmlEntities[i];
    string = string.replace(regex, reference);
  }
  return string;
}

export function processTemplate(template, replacements) {
  function flatten(arrayOrString, join) {
    if(typeof arrayOrString === 'string') {
      return arrayOrString;
    } else {
      return arrayOrString.map(x => flatten(x, join)).join(join);
    }
  }
  
  // collect replacements upfront: { start, end, replacement }
  const replacementPoints = [];
  for(let key in replacements) {
    if(Object.prototype.hasOwnProperty.call(replacements, key)) {
      const placeholder = `{{ ${key} }}`;
      const replacement = replacements[key];
      
      for(
        let search = 0, start;
        (start = template.indexOf(placeholder, search)) !== -1;
        search = start + placeholder.length
      ) {
        replacementPoints.push({
          start,
          end: start + placeholder.length,
          replacement,
        });
      }
    }
  }
  // sort them so we can process them in order
  replacementPoints.sort((a, b) => a.start - b.start);
  
  const output = [];
  let nextChar = 0;
  for(let i = 0; i < replacementPoints.length; ++i) {
    const { start, end, replacement } = replacementPoints[i];
    output.push(template.slice(nextChar, start));
    // this is a little arcane.
    // lineLength ends up being the length of the current line, up to the
    // replacement point.
    // this allows us to do nice indentation.
    let lineLength = 0;
    for(let j = output.length - 1; j >= 0; --j) {
      const lastNewline = output[j].lastIndexOf('\n');
      if(lastNewline !== -1) {
        lineLength += output[j].length - lastNewline - 1;
        break;
      } else {
        lineLength += output[j].length;
      }
    }
    output.push(flatten(replacement, '\n' + Array(lineLength + 1).join(' ')));
    nextChar = end;
  }
  output.push(template.slice(nextChar));
  
  return output.join('');
}

export function makeSlug(str) {
  return String(str)
    .toLowerCase()
    .normalize('NFD')
    .replace(/\s/g, '-')
    .replace(/[^\x20-\x7E]/g, '')
    .replace(/\W/g, '-')
    .replace(/\-+/g, '-')
    .replace(/^\-+/, '')
    .replace(/\-+$/, '');
}

export function detectImageType(input) {
  const buf = new Uint8Array(input);
  
  if(!buf || buf.length <= 1) {
    return;
  }
  
  function check(header) {
    for(let i = 0; i < header.length; ++i) {
      if(header[i] !== buf[i]) {
        return false;
      }
    }
    
    return true;
  }
  
  if(check([0xFF, 0xD8, 0xFF])) {
    return {
      ext: 'jpg',
      mime: 'image/jpeg',
    };
  }
  
  if(check([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])) {
    return {
      ext: 'png',
      mime: 'image/png',
    };
  }
  
  if(check([0x47, 0x49, 0x46])) {
    return {
      ext: 'gif',
      mime: 'image/gif',
    };
  }
  
  if(/<\s*svg\W/i.test(new TextDecoder().decode(input))) {
    return {
      ext: 'svg',
      mime: 'image/svg+xml',
    };
  }
}

export function createImageElement(src) {
  return new Promise((resolve, reject) => {
    let isBlob = false;
    if(src instanceof Blob) {
      isBlob = true;
      src = URL.createObjectURL(src);
    }
    function finish() {
      if(isBlob) {
        URL.revokeObjectURL(src);
      }
    }
    const img = document.createElement('img');
    img.onerror = () => {
      finish();
      reject(Error(`Error loading <img src="${src}" />`));
    };
    img.onabort = () => {
      finish();
      reject(Error(`<img src="${src}" />'s loading was aborted`));
    };
    img.onload = () => {
      finish();
      resolve(img);
    };
    img.src = src;
  });
}

export function getImage(src) {
  return get(src, 'arraybuffer').then(buf => {
    const imageType = detectImageType(buf);
    if(imageType) {
      return { data: buf, imageType, img: undefined };
    } else {
      return createImageElement(new Blob([buf])).then(img => new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight);
        const imageType = {
          ext: 'png',
          mime: 'image/png',
        };
        const blob = canvas.toBlob(blob => {
          resolve({ data: blob, imageType, img });
        }, imageType.mime);
      }));
    }
  });
}

export function renderDateString(date) {
  return date.toISOString().replace(/\.000Z$/, 'Z');
}

export function areStringsEquivalent(a, b) {
  function normalize(str) {
    function numberer(original) {
      let out = '';
      for(let i = 1; i <= 8; ++i) {
        if(arguments[i]) {
          out = String(i + 1);
          break;
        }
      }
      for(let i = 9; i <= 17; ++i) {
        if(arguments[i]) {
          return out + (i - 8);
        }
      }
      // something went wrong. same as above.
      // this isn't a critical function. best not to bother the user.
      return original;
    }
    
    return String(str)
      .toLowerCase()
      
      .replace(/_/g, ' ')
      
      .replace(/\b(?:chapter|ch)\b/g, '')
      .replace(/\b(?:volume)\b/g, 'vol')
      .replace(/\b(?:versus|v\.?s)\b/g, 'v')
      .replace(/\b(?:version|ver)\b/g, 'v')
      .replace(/\b(?:edition)\b/g, 'ed')
      
      .replace(/\b(\d+)(?:st|nd|rd|th)\b/g, '$1')
      
      .replace(/\b(?:(?:(twenty)|(thirty)|(fou?rty)|(fi[fv]e?ty)|(sixty)|(seventy)|(eight?ty)|(nine?ty))?[\-\s]*(?:(one|first|one?th)|(two|second|twoe?th)|(three|third|threee?th)|(four|fourth)|(five|fi[fv]e?th)|(six|sixth)|(seven|seventh)|(eight|eight?th)|(nine|nine?th)))\b/g, numberer)
      
      .replace(/\b(?:zero|zeroe?th)\b/g, '0')
      .replace(/\b(?:ten|tenth)\b/g, '10')
      .replace(/\b(?:eleven|eleventh|11th)\b/g, '11')
      .replace(/\b(?:twelve|twel[fv]e?th|12th)\b/g, '12')
      .replace(/\b(?:thirteen|thirteenth)\b/g, '13')
      .replace(/\b(?:fourteen|fourteenth)\b/g, '14')
      .replace(/\b(?:fifteen|fifteenth)\b/g, '15')
      .replace(/\b(?:sixteen|sixteenth)\b/g, '16')
      .replace(/\b(?:seventeen|seventeenth)\b/g, '17')
      .replace(/\b(?:eight?teen|eight?teenth)\b/g, '18')
      .replace(/\b(?:nine?teen|nine?teenth)\b/g, '19')
      .replace(/\b(?:twenty|twent[iy]e?th)\b/g, '20')
      .replace(/\b(?:thirty|thirt[iy]e?th)\b/g, '30')
      .replace(/\b(?:fou?rty|fort[iy]e?th)\b/g, '40')
      .replace(/\b(?:fi[fv]e?ty|fi[fv]e?t[iy]e?th)\b/g, '50')
      .replace(/\b(?:sixty|sixt[iy]e?th)\b/g, '60')
      .replace(/\b(?:seventy|sevent[iy]e?th)\b/g, '70')
      .replace(/\b(?:eight?ty|eight?t[iy]e?th)\b/g, '80')
      .replace(/\b(?:nine?ty|nine?t[iy]e?th)\b/g, '90')

      .normalize('NFD')
      
      .replace(/\W/g, '');
  }
  
  return normalize(a) === normalize(b);
}
