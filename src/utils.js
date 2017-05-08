export function get(url, responseType) {
  return new Promise((resolve, reject) => {
    GM_xmlhttpRequest({
      method: "GET",
      url,
      responseType,
      onload({ status, response }) {
        if(status === 200) {
          resolve(response);
        } else {
          reject(new Error(`Got HTTP response code ${status} for URL ${url}`));
        }
      },
      onerror: reject,
      onabort() {
        reject(new Error(`Request for ${url} was aborted`));
      },
    });
  });
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
      .replace(/\b(?:fi[fv]e?ty|fift[iy]e?th)\b/g, '50')
      .replace(/\b(?:sixty|sixt[iy]e?th)\b/g, '60')
      .replace(/\b(?:seventy|sevent[iy]e?th)\b/g, '70')
      .replace(/\b(?:eight?ty|eight?t[iy]e?th)\b/g, '80')
      .replace(/\b(?:nine?ty|nine?t[iy]e?th)\b/g, '90')
      
      .replace(/\W/g, '');
  }
  
  return normalize(a) === normalize(b);
}
