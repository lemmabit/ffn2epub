* Scrape data that isn't available in Fimfiction's rendered HTML.
  * Tags, including content rating, categories, and possibly character tags [`<dc:subject>`](http://www.idpf.org/epub/31/spec/epub-packages.html#sec-opf-dcsubject)
    * Link to <https://www.fimfiction.net/tag-information> as `opf:authority`?
  * Long description
    * Add a [`<nav epub:type="landmarks">`](http://www.idpf.org/epub/31/spec/epub-packages.html#sec-nav-landmarks) to `nav.xhtml` to point to such things.
  * Author's notes
* Add an NCX and reference it from [the `spine`'s `toc` attribute](http://www.idpf.org/epub/31/spec/epub-packages.html#attrdef-spine-toc).
* Support FB2 as an output format.
* Allow the user to select an EPUB version.
