The default style can be specified explicitly by adding the following to your html code:

Basic bibtex template where you define what each entry will look like when printed.
```
  <div class="bibtex_template">
  </div>
```

Language allows you to check if an entry value exist before printing the value (hidden otherwise).
```
<span class="if year"><span class="year"></span>,</span>
```

Demo example:
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

Basic bibtex structure allows for sorting and grouping of entries placed into the templates div (increases run time).
```
<div class="bibtex_structure">
  <div class="templates"></div>
</div>
```

Language has group or sort with extra information describing information type (string, number) and sorting property (ASC, DESC) 

```
<div class="group year" extra="ASC number"></div>
<div class="sort title" extra="DESC string"></div>
```

Demo structure example:
```
<div class="bibtex_structure">
  <div class="group year" extra="ASC number">
    <div class="group journal" extra="ASC string">
        <div class="templates"></div>
      </div>
    </div>
  </div>
</div>
```