* Scrape data that isn't available in Fimfiction's rendered HTML.
  * Date of publication [`<dc:date>`](http://www.idpf.org/epub/31/spec/epub-packages.html#sec-opf-dcdate)
  * Tags, including content rating, categories, and possibly character tags [`<dc:subject>`](http://www.idpf.org/epub/31/spec/epub-packages.html#sec-opf-dcsubject)
    * Link to <https://www.fimfiction.net/tag-information> as `opf:authority`?
  * Descriptions, long and short
    * Add a [`<nav epub:type="landmarks">`](http://www.idpf.org/epub/31/spec/epub-packages.html#sec-nav-landmarks) to `nav.xhtml` to point to such things.
* Add an NCX and reference it from [the `spine`'s `toc` attribute](http://www.idpf.org/epub/31/spec/epub-packages.html#attrdef-spine-toc).
