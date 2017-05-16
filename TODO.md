* Scrape data that isn't available in Fimfiction's rendered HTML.
  * Long description
    * Add a [`<nav epub:type="landmarks">`](http://www.idpf.org/epub/31/spec/epub-packages.html#sec-nav-landmarks) to `nav.xhtml` to point to such things.
  * Author's notes
* Add an NCX and reference it from [the `spine`'s `toc` attribute](http://www.idpf.org/epub/31/spec/epub-packages.html#attrdef-spine-toc).
* Support FB2 as an output format.
* Allow the user to select an EPUB version.
