Load javascript, add this to your html code:

```html
<script type="text/javascript" src="http://ajax.googleapis.com/ajax/libs/jquery/1.4.2/jquery.min.js"></script>
<script type="text/javascript" src="https://raw.githubusercontent.com/pcooksey/bibtex-js/master/src/bibtex_js.js"></script>
```

Place BibTeX link into <bibtex> or put bibtex text into a (hidden) textarea:

```html
<bibtex src="test.bib"></bibtex>

<textarea id="bibtex_input" style="display:none;">
@book{book1,
  author = "Donald Knuth",
  title = "Concrete Mathematics"
}
</textarea>
```

Output will be displayed in the element with id "bibtex-display", add this to HTML:

```html
<div id="bibtex_display"></div>
```

That's it. Customize how publications are displayed using [styles](styles.md).