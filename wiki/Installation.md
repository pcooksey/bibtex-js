Load javascript, add this to your html code:

```
<script type="text/javascript" src="http://ajax.googleapis.com/ajax/libs/jquery/1.4.2/jquery.min.js"></script>
<script type="text/javascript" src="http://bibtex-js.googlecode.com/svn/trunk/src/bibtex_js.js"></script>
```

Put bibtex input into a (hidden) textarea:

```
<textarea id="bibtex_input" style="display:none;">
@book{book1,
  author = "Donald Knuth",
  title = "Concrete Mathematics"
}
</textarea>
```

Output will be displayed in the element with id "bibtex-display", add this to HTML:

```
<div id="bibtex_display"></div>
```

That's it. Customize how publications are displayed using [styles](styles.md).