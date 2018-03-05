# Customize publications
The default style for each entry can be specified explicitly using the below template system in you html code.

## BibTex template

BibTeX template defines what each entry will look like when printed.
```html
  <div class="bibtex_template">
  </div>
```

Check if an entry value `year` exist before printing the value in the inner span (hidden otherwise). Also check if an entry value doesn't exist `!year` before printing. This is a simple way of having an `if else` statement in the bibtex_template.
```html
<span class="if year"><span class="year"></span>,</span>
<span class="if !year">Missing the year,</span>
```

Demo BibTeX template example:
```html
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
## BibTex Structure
BibTeX structure allows for sorting and grouping of entries placed into the templates div (increases run time).
```html
<div class="bibtex_structure">
  <div class="templates"></div>
</div>
```

Group or sort values along with adding extra information describing information type (string, number) and sorting property (ASC, DESC). BibTeX entries that do not contain the grouping value (ex. year) will be added to "Other Publications" at the end of the grouping.
```html
<div class="group year" extra="ASC number"></div>
<div class="sort title" extra="DESC string"></div>
```

Demo BibTeX structure example:
```html
<div class="bibtex_structure">
  <div class="group year" extra="ASC number">
    <div class="group journal" extra="ASC string">
        <div class="templates"></div>
      </div>
    </div>
  </div>
</div>
```

Custom sections for grouping your bibtex file by their type `sections bibtextypekey`. Define as many `section` divs with their respective types (`@article`). Then create a title for each section. You can also use the `|` to include multiple types for that section. Example demonstrates how to add custome sections to your page.
```html
<div class="bibtex_structure">
  <div class="sections bibtextypekey">
      <div class="section @article" title="Refereed Articles"></div>
      <div class="section @book" title="Books"></div>
      <div class="section @inproceedings" title="Conference and Workshop Papers"></div>
      <div class="section @misc|@phdthesis|@mastersthesis|@bachelorsthesis|@techreport" title="Other Publications"></div>
      <div class="templates"></div>
  </div>
</div>
```


For more information on the additional capabilities check out the [extras](extra.md).
