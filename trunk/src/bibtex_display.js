function fixValue(value) {
  value = value.replace(/\\glqq\s?/, "&bdquo;");
  value = value.replace(/\\grqq\s?/, '&rdquo;');
  value = value.replace(/\\ /, '&nbsp;');
  value = value.replace(/---/, '&mdash;');
  value = value.replace(/\{(.*?)\}/, '$1');
  return value;
}

function displayBibtex(i) {
  b = new BibtexParser();
  b.setInput(i);
  b.bibtex();

  e = b.getEntries();
  
  for (var item in e) {
    var tpl = $("#bibtex_display .template").clone().removeClass('template');
    for (var key in e[item]) {
      
      var f = tpl.find("." + key.toLowerCase());
      if (f) {
        var currentHTML = f.html() || "";
        var value = fixValue(e[item][key]);
        
        if (currentHTML.match("%")) {
          // "complex" template field
          f.html(currentHTML.replace("%", value));
        } else {
          // simple field
          f.html(value);
        }
      }
    }
    
    var emptyFields = tpl.find("span");
    emptyFields.each(function (key,f) {
      if (f.innerHTML.match("%")) {
        f.innerHTML = "";
      }
    });
    
    $("#bibtex_display").append(tpl);
  }
}