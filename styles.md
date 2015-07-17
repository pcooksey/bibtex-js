The default style can be specified explicitly by adding the following to your html code:

```
<div class="bibtex_template">
<div class="if author" style="font-weight: bold;">
  <span class="if year">
    <span class="year"></span>, 
  </span>
  <span class="author"></span>
  <span class="if url" style="margin-left: 20px">
    <a class="url" style="color:black; font-size:10px">(view online)</a>
  </span>
</div>
<div style="margin-left: 10px; margin-bottom:5px;">
  <span class="title"></span>
</div>
</div>
```

When class `if` is listed, the html element is only displayed if all fields listed as classes are present for an entry. Thus, the classes listed in `<span class="if url">` cause the url related elements to only be displayed if an entry has the `url` field. For all other elements, the contents is replaced by the field-name specified as its class.