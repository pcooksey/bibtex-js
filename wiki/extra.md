# Additional funcationality!

## Search methods: 

Multiple search fields are combined to find the intersection of the bibtex entries. If the value(s) are not in a bibtex entry then it is hidden. 

If there is a bibtex entry that should not be searched then add `noread` to the class.
```html
<span class="bibtexraw noread"></span>
```

We define a search field with bibtex_search in the class. Then add in options with the values to be searched. The values are interpreted using regular expressions i.e., "Multi-robot|multirobot|soccer" finds the OR of the three strings. This is the only way to find the combination rather than intersection of bibtex entries.
```html
<select class="bibtex_search">
  <option value="">Search Topic</option>
  <!-- Add topic values here -->
  <option value="Robot Soccer">Robot Soccer</option>
  <option value="Multi-robot|multirobot|soccer">Multirobot Systems</option>
  <option value="Best Paper Award">Best Paper Award</option>
</select>
```

Adding the class bibtex_author will generate the author list within the select tags, and extra attribute defines that it will only be the first authors (can be removed for all authors). The search attribute defines that this select will only search the bibtex field `author` (resulting in a quicker search). The search can be changed to any field in the bibtex entries.
```html
<select class="bibtex_search bibtex_author" extra="first" search="author">
  <option value="">Search First Author</option>
</select>
```

Adding the bibtex_search into an input allows the user to search anything. The values are split up by spaces and then interpreted by regular expressions.
```html
<input type="text" class="bibtex_search" id="searchbar" placeholder="Search publications">
```

## Variable access:

The class bibtexVar prints a bibtex entry value within the tag's attributes The extra field defines what value(s) to use ex., the key associate with bibtex entry ('BIBTEXKEY'). In any of the attributes use '+BIBTEXKEY+' for where it should print the value i.e., +'s around the value name. In our example, the papers are stored with the bibtex key as the file name so the template system will generate the link to the page for each bibtex entry. 
```html
<a class="bibtexVar" href="http://www.website.edu/person/papers/+BIBTEXKEY+.pdf" extra="BIBTEXKEY">
```

The cases for needing a variable are rare but the bibtexkey provides a unique identifier for each bibtex entry. Another example uses the bibtexkey is in the html reference so that bootstrap can collapse each bibtex's raw format. There is a noread in the bibtexraw so that search doesn't look at it.
```html
<div>
<a class="bibtexVar" role="button" data-toggle="collapse" href="#bib+BIBTEXKEY+" aria-expanded="false" aria-controls="bib+BIBTEXKEY+" extra="BIBTEXKEY">
		  [bib]
		</a>
</div>
<div class="bibtexVar collapse" id="bib+BIBTEXKEY+" extra="BIBTEXKEY">
  <div class="well">
	<pre><span class="bibtexraw noread"></span></pre>
  </div>
</div>
```

## Additional fields added to the bibtex entries

BIBTEXKEY = the bibtex entry key
BIBTEXRAW = the bibtex raw format
BIBTEXTYPE =
if (@INCOLLECTION") {
  ["BIBTEXTYPE"] = "book chapter";
} else if ("@INPROCEEDINGS") {
  ["BIBTEXTYPE"] = "conference, workshop";
} else if ("@ARTICLE") {
  ["BIBTEXTYPE"] = "journal";
} else if ("@TECHREPORT") {
  ["BIBTEXTYPE"] = "technical report";
}   
WEB = if set to *no* then it will not be displayed
