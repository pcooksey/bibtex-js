/* 
* Author = Philip Cooksey
* Credit = Henrik Mühe
*
* Issues:
*  no comment handling within strings
*  no string concatenation
*  no variable values yet

* Grammar implemented here:
*  bibtex -> (string | preamble | comment | entry)*;
*  string -> '@STRING' '{' key_equals_value '}';
*  preamble -> '@PREAMBLE' '{' value '}';
*  comment -> '@COMMENT' '{' value '}';
*  entry -> '@' key '{' key ',' key_value_list '}';
*  key_value_list -> key_equals_value (',' key_equals_value)*;
*  key_equals_value -> key '=' value;
*  value -> value_quotes | value_braces | key;
*  value_quotes -> '"' .*? '"'; // not quite
*  value_braces -> '{' .*? '"'; // not quite
*
*/

function BibtexParser() {
  this.pos = 0;
  this.input = "";
  
  this.entries = {};
  this.strings = {
      JAN: "January",
      FEB: "February",
      MAR: "March",      
      APR: "April",
      MAY: "May",
      JUN: "June",
      JUL: "July",
      AUG: "August",
      SEP: "September",
      OCT: "October",
      NOV: "November",
      DEC: "December"
  };
  this.currentKey = "";
  this.currentEntry = "";
  

  this.setInput = function(t) {
    this.input = t;
  }
  
  this.getEntries = function() {
    return this.entries;
  }
  
  this.getBibTexRaw = function() {
  	return this.bibtexraw;
  }

  this.isWhitespace = function(s) {
    return (s == ' ' || s == '\r' || s == '\t' || s == '\n');
  }

  this.match = function(s) {
    this.skipWhitespace();
    if (this.input.substring(this.pos, this.pos+s.length) == s) {
      this.pos += s.length;
    } else {
      throw "Token mismatch, expected " + s + ", found " + this.input.substring(this.pos);
    }
    this.skipWhitespace();
  }

  this.tryMatch = function(s) {
    this.skipWhitespace();
    if (this.input.substring(this.pos, this.pos+s.length) == s) {
      return true;
    } else {
      return false;
    }
    this.skipWhitespace();
  }

  this.skipWhitespace = function() {
    while (this.isWhitespace(this.input[this.pos])) {
      this.pos++;
    }
    if (this.input[this.pos] == "%") {
      while(this.input[this.pos] != "\n") {
        this.pos++;
      }
      this.skipWhitespace();
    }
  }

  this.value_braces = function() {
    var bracecount = 0;
    this.match("{");
    var start = this.pos;
    while(true) {
      if (this.input[this.pos] == '}' && this.input[this.pos-1] != '\\') {
        if (bracecount > 0) {
          bracecount--;
        } else {
          var end = this.pos;
          this.match("}");
          return this.input.substring(start, end);
        }
      } else if (this.input[this.pos] == '{') {
        bracecount++;
      } else if (this.pos == this.input.length-1) {
        throw "Unterminated value";
      }
      this.pos++;
    }
  }

  this.value_quotes = function() {
    this.match('"');
    var start = this.pos;
    while(true) {
      if (this.input[this.pos] == '"' && this.input[this.pos-1] != '\\') {
          var end = this.pos;
          this.match('"');
          return this.input.substring(start, end);
      } else if (this.pos == this.input.length-1) {
        throw "Unterminated value:" + this.input.substring(start);
      }
      this.pos++;
    }
  }
  
  this.single_value = function() {
    var start = this.pos;
    if (this.tryMatch("{")) {
      return this.value_braces();
    } else if (this.tryMatch('"')) {
      return this.value_quotes();
    } else {
      var k = this.key();
      if (this.strings[k.toUpperCase()]) {
        return this.strings[k];
      } else if (k.match("^[0-9]+$")) {
        return k;
      } else {
        throw "Value expected:" + this.input.substring(start);
      }
    }
  }
  
  this.value = function() {
    var values = [];
    values.push(this.single_value());
    while (this.tryMatch("#")) {
      this.match("#");
      values.push(this.single_value());
    }
    return values.join("");
  }

  this.key = function() {
    var start = this.pos;
    while(true) {
      if (this.pos == this.input.length) {
        throw "Runaway key";
      }
    
      if (this.input[this.pos].match("[a-zA-Z0-9_:\\./-]")) {
        this.pos++
      } else {
        return this.input.substring(start, this.pos).toUpperCase();
      }
    }
  }

  this.key_equals_value = function() {
    var key = this.key();
    if (this.tryMatch("=")) {
      this.match("=");
      var val = this.value();
      return [ key, val ];
    } else {
      throw "... = value expected, equals sign missing:" + this.input.substring(this.pos);
    }
  }

  this.key_value_list = function() {
    var kv = this.key_equals_value();
    this.entries[this.currentEntry][kv[0]] = kv[1];
    while (this.tryMatch(",")) {
      this.match(",");
      // fixes problems with commas at the end of a list
      if (this.tryMatch("}")) {
        break;
      }
      kv = this.key_equals_value();
      this.entries[this.currentEntry][kv[0]] = kv[1];
    }
  }

  this.entry_body = function() {
    this.currentEntry = this.key();
    this.entries[this.currentEntry] = new Object();    
    this.match(",");
    this.key_value_list();
  }

  this.directive = function () {
    this.match("@");
    return "@"+this.key();
  }

  this.string = function () {
    var kv = this.key_equals_value();
    this.strings[kv[0].toUpperCase()] = kv[1];
  }

  this.preamble = function() {
    this.value();
  }

  this.comment = function() {
    this.value(); // this is wrong
  }

  this.entry = function() {
    this.entry_body();
  }

  this.bibtex = function() {
    var i = 0;
    bibtexraw = this.input.split('@');
    while(this.tryMatch("@")) {
      var d = this.directive().toUpperCase();
      this.match("{");
      if (d == "@STRING") {
        this.string();
      } else if (d == "@PREAMBLE") {
        this.preamble();
      } else if (d == "@COMMENT") {
        this.comment();
      } else {
        this.entry();
      }
      this.match("}");
    }
    this.entries[this.currentEntry]["bibtexraw"] = bibtexraw[i++];
  }
}

function BibtexDisplay() {
  this.fixValue = function (value) {
    value = value.replace(/\\glqq\s?/g, "&ldquo;");
    value = value.replace(/\\grqq\s?/g, '&rdquo;');
    value = value.replace(/\\ /g, '&nbsp;');
    value = value.replace(/\\url/g, '');
    value = value.replace(/---/g, '&mdash;');
    value = value.replace(/{\\"a}/g, '&auml;');
    value = value.replace(/\{\\"o\}/g, '&ouml;');
    value = value.replace(/{\\"u}/g, '&uuml;');
    value = value.replace(/{\\"A}/g, '&Auml;');
    value = value.replace(/{\\"O}/g, '&Ouml;');
    value = value.replace(/{\\"U}/g, '&Uuml;');
    value = value.replace(/\\ss/g, '&szlig;');
    value = value.replace(/\{(.*?)\}/g, '$1');
    return value;
  }
  
  this.createTemplate = function(entry){
    // find template
    var tpl = $(".bibtex_template").clone().removeClass('bibtex_template');
    
    // find all keys in the entry
    var keys = [];
    for (var key in entry) {
      keys.push(key.toUpperCase());
    }
    
    // find all ifs and check them
    var removed = false;
    do {
      // find next if
      var conds = tpl.find(".if");
      if (conds.size() == 0) {
        break;
      }
      
      // check if
      var cond = conds.first();
      cond.removeClass("if");
      var ifTrue = true;
      var classList = cond.attr('class').split(' ');
      $.each( classList, function(index, cls){
        if(keys.indexOf(cls.toUpperCase()) < 0) {
          ifTrue = false;
        }
        cond.removeClass(cls);
      });
      
      // remove false ifs
      if (!ifTrue) {
        cond.remove();
      }
    } while (true);
    
    // fill in remaining fields 
    for (var index in keys) {
      var key = keys[index];
      var value = entry[key] || "";
      tpl.find("span:not(a)." + key.toLowerCase()).html(this.fixValue(value));
      tpl.find("a." + key.toLowerCase()).attr('href', this.fixValue(value));
    }
    return tpl;
  }
  
  this.createArray = function(entries) {
    var entriesArray = [];
    for(var entryKey in entries) {
      entriesArray.push(entries[entryKey]);
    }
    return entriesArray;
  }
  
  this.sortArray = function(array, key, rule) {
    array = array.sort(function(a,b) { 
      switch(rule.toUpperCase()) {
        case "DESC":
          return parseInt(a[key.toUpperCase()]) - parseInt(b[key.toUpperCase()]); break;
        case "ASC":
          return parseInt(b[key.toUpperCase()]) - parseInt(a[key.toUpperCase()]); break;
        default: 
          return 0; break;
      }
    });
    return array;
  }
  
  this.createStructure = function(structure, output, entries, level) {
    //Used during the search
    level = level || 0;
  
    var struct = structure.clone().removeClass('bibtex_structure');
    var groupParent = struct.children(".group");
    var sortParent = struct.children(".sort");
    
    if (groupParent.length) {
      console.log("Group " +level);
      var group = groupParent.first();
      group.removeClass("group");
      var groupName = group.attr('class').toUpperCase();
      var rule = group.attr('extra');
      
      //Sort the array based on group rules
      var sortedArray = this.sortArray(entries, groupName, rule);
      
      // Get all the unique values for the groups
      var values = [];
      $.each(sortedArray, function(i, object) { 
          if(groupName in object && $.inArray(object[groupName],values)===-1) {      
            values.push(object[groupName]);
            return;
          }
        });
        
      // Iterate through the values and recurively call this function
      globalStruct = $('<div></div>');
      for( val in values) {
        //Starting to create the page
        var newStruct = struct.clone();
        var groupNameValue = values[val];
        newStruct.children("."+groupName.toLowerCase()).first().prepend("<h1 class='"+groupName+"'>"+this.fixValue(groupNameValue)+"</h1>");
        splicedArray = $.grep(sortedArray, function(object, i) 
          { return object[groupName] == groupNameValue; });
        var tempStruct = this.createStructure(groupParent.clone(), output, splicedArray, level+1);
        if(groupParent.children(".group").length) {
          nextGroupName = "."+groupParent.children(".group").attr('class').split(' ').join('.');
          newStruct.find(nextGroupName).replaceWith(tempStruct);
        } else {
          newStruct.find(".templates").append(tempStruct.find(".templates").html());
        }
        if(level==0) {
          output.append(newStruct);
        } else {
          globalStruct.append(newStruct);
        }
      }
      if(level==0) {
        return output;
      } else {
        return globalStruct;
      }
    } else if(sortParent.length) {
      console.log("Sorting "+level);
      var sortName = sortParent.attr('class').split(" ")[1].toUpperCase();
      var rule = sortParent.attr('extra');
      
      var sort = structure.children(".sort").first().clone();
      //Sort the array based on sort rules
      var sortedArray = this.sortArray(entries, sortName, rule);
      if(level==0) {
        output.append(this.createStructure(sortParent, output, sortedArray, level+1));
      } else {
        return this.createStructure(sortParent, output, sortedArray, level+1);
      }
    } else {
      console.log("Adding " +level);
      // iterate over bibTeX entries and add them to template
      for (var entryKey in entries) {
        var entry = entries[entryKey];
        var tpl = this.createTemplate(entry);
        structure.find(".templates").append(tpl);
        tpl.show();
      }
      return structure;
    }
  }

  this.displayBibtex = function(input, output) {
    // parse bibtex input
    var b = new BibtexParser();
    b.setInput(input);
    b.bibtex();
    var entries = b.getEntries();
    
    // save old entries to remove them later
    var old = output.find("*");
    
    var structure = $(".bibtex_structure").clone();
    // If structure exists we need to do more complicated sorting with entries
    if(structure.length) {
      // Create array for sorting
      var entriesArray = this.createArray(entries);
      this.createStructure(structure,output,entriesArray);
    } else {
      // iterate over bibTeX entries
      for (var entryKey in entries) {
        var entry = entries[entryKey];
        
        tpl = this.createTemplate(entry);
        
        output.append(tpl);
        tpl.show();
      }
    }
    // remove old entries
    old.remove();
  }

}

function bibtex_js_draw() {
  $(".bibtex_template").hide();
  if($("#bibtex_input").length){
    (new BibtexDisplay()).displayBibtex($("#bibtex_input").val(), $("#bibtex_display"));
  } else {
    var bibstring = "";
    $('bibtex').each(function(index, value) {
       $.get($(this).attr('src'), function(data) {
        bibstring += data;
      });
    });
    $(document).ajaxStop(function() {
	  // executed on completion of last outstanding ajax call
	  (new BibtexDisplay()).displayBibtex(bibstring, $("#bibtex_display"));
    });
  }
}

// check whether or not jquery is present
if (!window.jQuery) {
  //Add jquery to the webpage
  var jq = document.createElement('script'); jq.type = 'text/javascript';
  jq.src = 'http://ajax.googleapis.com/ajax/libs/jquery/1.4.2/jquery.min.js';
  document.getElementsByTagName('head')[0].appendChild(jq);
  // Poll for jQuery to come into existance
  var checkReady = function(callback) {
      if (window.jQuery) {
          callback(jQuery);
      }
      else {
          window.setTimeout(function() { checkReady(callback); }, 100);
      }
  };
  var defaultTemplate = "<div class=\"bibtex_template\"><div class=\"if author\" style=\"font-weight: bold;\">\n"+
                        "<span class=\"if year\">\n"+
                        "<span class=\"year\"></span>,\n"+
                        "</span>\n  <span class=\"author\"></span>\n"+
                        "<span class=\"if url\" style=\"margin-left: 20px\">\n"+
                        "<a class=\"url\" style=\"color:black; font-size:10px\">(view online)</a>\n"+
                        "</span>\n</div>\n<div style=\"margin-left: 10px; margin-bottom:5px;\">\n"+
                        "<span class=\"title\"></span>\n</div></div>";
  // Start polling...
  checkReady(function($) {
    // draw bibtex when loaded
    $(document).ready(function () {
      // check for template, add default
      if ($(".bibtex_template").size() == 0) {
        $("body").append(defaultTemplate);
      }
      bibtex_js_draw();
    });
  });
} else {
  // draw bibtex when loaded
  $(document).ready(function () {
    // check for template, add default
    if ($(".bibtex_template").size() == 0) {
      $("body").append(defaultTemplate);
    }
    bibtex_js_draw();
  });
}