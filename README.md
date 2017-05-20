# Fimfiction to EPUB

This userscript enhances [Fimfiction](https://www.fimfiction.net/)'s "Download Story (.epub)" button with a custom generator. Its publications ought to be compatible with EPUB 2.0, EPUB 3.0, and EPUB 3.1 readers.

## Why?

I thought it was really cool when I found out that Fimfiction had a built-in EPUB generator for reading offline and on e-readers, but its output seemed a little barren to me. Since I didn't have an actual use for it myself at the time, my solution was to put together EPUB versions of my own stories (well, one of the two stories I've published so far at the time of this writing) for the benefit of other people.

But then I got an e-reader of my own, and I wanted to read Fimfiction stories on it. I came to realize that the scope of my obsessive-compulsiveness extended well beyond my own stories, which I wasn't planning on reading anyway for obvious reasons.

So I wrote this script to put together EPUB versions of *everyone's* stories. For the benefit of me. And other people.

## Features for normal people

* Cover image
* Inline images, including emotes
* Long description
* Table of contents
* Author's notes
* Nice-looking apostrophes and quotation marks
* Customizable via Fimfiction's "Settings" page

Note that your e-reader might go straight to the first chapter when you open the book, skipping the cover, long description, and table of contents. That's because I marked that stuff as nonlinear, i.e. not critical for understanding the story. According to the specification, the e-reader is under no obligation to let you access it, but it should at least give you a table of contents.

## Features for nerds

* EPUB 3.1 compliance&mdash;the only case I know of where the output is non-compliant is when the story references a non-compliant SVG, which is something I've never seen in any stories other than, uh, my... my own.
* An NCX and enough EPUB 2.0 compliance to be read using an EPUB 2.0 reader.
* Fancy use~~less~~ful metadata. Fimfiction is totally an EPUB subject authority. They just don't know it yet.

## What if my device can't read EPUBs?

[Your device can probably read EPUBs.](http://koreader.rocks/) You can use [Calibre](https://calibre-ebook.com/) to convert EPUB to other formats if you really want to use a system that makes that necessary.

## Why does your code suck so bad?

I just want to read some stories about ponies, man. I don't have time for this "abstraction" stuff, or "comments", or "unit tests", and definitely not "lines under 280 characters long". That's a load of tortellini or some such funny-named, non-vulgar thing. Just accept the beauteous beauty of the EPUBs themselves, which are beautiful. (That's just my most humble opinion, of course, but it's also true.)
