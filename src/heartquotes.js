// https://gist.github.com/Permutatrix/6a251d5bc7b27cb238c17d4f7d4c41cf

export function heartquotes(root) {
  function transform(replace) {
    // thanks to Kelly Martin for writing the brilliant code these were adapted from:
    // http://smartquotesjs.com/
    replace(/'''/g, '\u2034');                                                  // triple prime
    replace(/(\W|^)"(?=\S)/g, '\u201c', true);                                  // beginning "
    replace(/(\u201c[^"]*)"(?=[^"]*$|[^\u201c"]*\u201c)/g, '\u201d', true);     // ending "
    replace(/([^0-9])"/g, '\u201d', true);                                      // remaining " at end of word
    replace(/''/g, '\u2033');                                                   // double prime
    replace(/(\W|^)'(?=\S)/g, '\u2018', true);                                  // beginning '
    replace(/([a-z])'(?=[a-z])/ig, '\u2019', true);                             // conjunction's possession
    replace(/((\u2018[^']*)|[a-z])'(?=[^0-9]|$)/ig, '\u2019', true);            // ending '
    replace(/(\u2018)(?=([0-9]{2}[^\u2019]*)(\u2018([^0-9]|$)|$|\u2019[a-z]))/ig, '\u2019'); // abbrev. years like '93
    replace(/(\B|^)\u2018(?=([^\u2019]*\u2019\b)*([^\u2019\u2018]*\W[\u2019\u2018]\b|[^\u2019\u2018]*$))/ig, '\u2019', true); // backwards apostrophe
    replace(/'/g, '\u2032');
    replace(/\.\.\./g, '\u2026');
  }
  
  var TEXT_NODE = Element.TEXT_NODE, ELEMENT_NODE = Element.ELEMENT_NODE;
  
  var contents = '', nodes = [];
  
  function replace(regex, string, fakeLookbehind) {
    var any = false;
    do {
      var match = regex.exec(contents);
      if(!match || !match[0]) {
        return any;
      }
      any = true;
      var length = match[0].length, index = match.index;
      if(fakeLookbehind) {
        length -= match[1].length;
        index += match[1].length;
      }
      var point = 0, i = 0, len = nodes.length, node;
      for(; i < len; ++i) {
        node = nodes[i];
        var np = point + node.nodeValue.length;
        if(np > index) {
          break;
        }
        point = np;
      }
      if(i >= len) {
        throw Error("Match seems to be outside of the region!");
      }
      contents = contents.substr(0, index)
               + string
               + contents.substr(index + length);
      index -= point;
      if(node.nodeValue.length < index + length) {
        var amt = node.nodeValue.length - index;
        node.nodeValue = node.nodeValue.substr(0, index) + string;
        for(var l = length - amt; l > 0 && ++i < len;) {
          var n = nodes[i];
          if(n.nodeValue.length < l) {
            l -= n.nodeValue.length;
            n.nodeValue = '';
          } else {
            n.nodeValue = n.nodeValue.substr(l);
          }
        }
      } else {
        node.nodeValue = node.nodeValue.substr(0, index)
                       + string
                       + node.nodeValue.substr(index + length);
      }
      regex.lastIndex += string.length - length;
    } while(regex.global);
  }
  
  function flush() {
    transform(replace, contents);
    
    contents = '';
    nodes.length = 0;
  }
  
  function element(el) {
    var display = window.getComputedStyle(el).getPropertyValue('display');
    if(display === 'none') {
      return;
    } else if(display === 'block') {
      flush();
    }
    
    if(/^(code|pre|script|style)$/i.test(el.nodeName)) {
      if(display !== 'block') {
        contents += 'x';
        nodes.push({nodeValue: 'x'});
      }
      return;
    }
    
    var children = el.childNodes;
    for(var i = 0, len = children.length; i < len; ++i) {
      var child = children[i];
      if(child.nodeType === TEXT_NODE) {
        contents += child.nodeValue;
        nodes.push(child);
      } else if(child.nodeType === ELEMENT_NODE) {
        element(child);
      }
    }
    
    if(display === 'block') {
      flush();
    }
  }
  
  element(root);
  flush();
}
