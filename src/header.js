// ==UserScript==
// @name        Fimfiction to EPUB
// @namespace   https://officially.fun/
// @description An alternative EPUB generator for Fimfiction.net stories
// @author      Permutator
// @copyright   2017, Permutator
// @license     MIT, https://github.com/Permutatrix/ffn2epub/blob/master/LICENSE
// @homepageURL https://github.com/Permutatrix/ffn2epub#readme
// @supportURL  https://github.com/Permutatrix/ffn2epub/issues
// @updateURL   https://openuserjs.org/meta/Permutatrix/Fimfiction_to_EPUB.meta.js
// @downloadURL https://openuserjs.org/src/scripts/Permutatrix/Fimfiction_to_EPUB.user.js
// @include     /^https?://(www.)?fimfiction.net//
// @version     1.2.1
// @run-at      document-start
// @grant       GM_xmlhttpRequest
// ==/UserScript==

/*
License for Pako, whose DEFLATE implementation this script embeds and uses:

(The MIT License)

Copyright (C) 2014-2017 by Vitaly Puzrin and Andrei Tuputcyn

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

/*
License for smartquotes.js, whose replacement rules this script embeds and uses:

The MIT License (MIT)

Copyright (c) 2013 Kelly Martin

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

// The parts I wrote are also under the MIT license, which I don't feel the
// need to repeat a third time. You can find it at the following address:
// <https://github.com/Permutatrix/ffn2epub/blob/master/LICENSE>

