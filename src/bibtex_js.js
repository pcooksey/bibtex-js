
/* 
 * Author = Philip Cooksey
 * Edited = July 2015
 * Website = https://github.com/pcooksey/bibtex-js
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
    this.rawCurrentKey = "";
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

    this.errorThrown = function(str) {
        $("#bibtex_errors").html(str);
    }

    this.isWhitespace = function(s) {
        return (s == ' ' || s == '\r' || s == '\t' || s == '\n');
    }

    this.match = function(s) {
        this.skipWhitespace();
        if (this.input.substring(this.pos, this.pos + s.length) == s) {
            this.pos += s.length;
        } else {
            throw "Token mismatch, expected " + s + ", found " + this.input.substring(this.pos);
        }
        this.skipWhitespace();
    }

    this.tryMatch = function(s) {
        this.skipWhitespace();
        if (this.input.substring(this.pos, this.pos + s.length) == s) {
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
            while (this.input[this.pos] != "\n") {
                this.pos++;
            }
            this.skipWhitespace();
        }
    }

    this.value_braces = function() {
        var bracecount = 0;
        this.match("{");
        var start = this.pos;
        while (true) {
            if (this.input[this.pos] == '}' && this.input[this.pos - 1] != '\\') {
                if (bracecount > 0) {
                    bracecount--;
                } else {
                    var end = this.pos;
                    this.match("}");
                    return this.input.substring(start, end);
                }
            } else if (this.input[this.pos] == '{') {
                bracecount++;
            } else if (this.pos == this.input.length - 1) {
                throw "Unterminated value";
            }
            this.pos++;
        }
    }

    this.value_quotes = function() {
        var bracecount = 0;
        this.match('"');
        var start = this.pos;
        while (true) {
            if (this.input[this.pos] == '"' && this.input[this.pos - 1] != '\\' && bracecount == 0) {
                var end = this.pos;
                this.match('"');
                return this.input.substring(start, end);
            } else if (this.input[this.pos] == '{') {
                bracecount++;
            } else if (this.input[this.pos] == '}') {
                if (bracecount > 0) {
                    bracecount--;
                }
            } else if (this.pos == this.input.length - 1) {
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
        while (true) {
            if (this.pos == this.input.length) {
                throw "Runaway key";
            }

            if (this.input[this.pos].match("[a-zA-Z0-9_:?\\./'\\+\\-\\*]")) {
                this.pos++
            } else {
                this.rawCurrentKey = this.input.substring(start, this.pos);
                return this.rawCurrentKey.toUpperCase();
            }
        }
    }


    this.key_equals_value = function() {
        var key = this.key();
        if (this.tryMatch("=")) {
            this.match("=");
            var val = this.value();
            return [key, val];
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
            if (this.tryMatch("}") || this.tryMatch(")")) {
                break;
            }
            kv = this.key_equals_value();
            this.entries[this.currentEntry][kv[0]] = kv[1];
        }
    }

    this.entry_body = function(directive) {
        this.currentEntry = this.key();
        this.entries[this.currentEntry] = new Object();
        this.entries[this.currentEntry]["BIBTEXKEY"] = this.rawCurrentKey;
        if (directive == "@INCOLLECTION") {
            this.entries[this.currentEntry]["BIBTEXTYPE"] = "book chapter";
        } else if (directive == "@INPROCEEDINGS") {
            this.entries[this.currentEntry]["BIBTEXTYPE"] = "conference, workshop";
        } else if (directive == "@ARTICLE") {
            this.entries[this.currentEntry]["BIBTEXTYPE"] = "journal";
        } else if (directive == "@TECHREPORT") {
            this.entries[this.currentEntry]["BIBTEXTYPE"] = "technical report";
        }
        this.entries[this.currentEntry]["BIBTEXTYPEKEY"] = directive;
        this.match(",");
        this.key_value_list();
    }

    this.directive = function() {
        this.match("@");
        return "@" + this.key();
    }

    this.string = function() {
        var kv = this.key_equals_value();
        this.strings[kv[0].toUpperCase()] = kv[1];
    }

    this.preamble = function() {
        this.value();
    }

    this.comment = function() {
        this.pos = this.input.indexOf("}", this.pos);
    }

    this.entry = function(directive) {
        this.entry_body(directive);
    }

    this.bibtex = function() {
        var start = 0;
        var end = 0;
        while (this.tryMatch("@")) {
            start = this.pos;
            var d = this.directive().toUpperCase();
            if (this.tryMatch("{")) {
                this.match("{");
            } else {
                this.match("(");
            }
            if (d == "@STRING") {
                this.string();
            } else if (d == "@PREAMBLE") {
                this.preamble();
            } else if (d == "@COMMENT") {
                this.comment();
            } else {
                this.entry(d);
            }
            end = this.pos + 1;
            if (this.tryMatch("}")) {
                this.match("}");
            } else {
                this.match(")");
            }
            if (this.tryMatch(",")) {
                this.match(",");
            }
            // In case there is extra stuff in between entries
            this.pos = end + this.input.substring(end, this.input.length).indexOf("@");
            this.entries[this.currentEntry]["BIBTEXRAW"] = this.input.substring(start, end);
        }
    }
}

function BibtexDisplay() {

    this.invert = function(obj) {
        var new_obj = {};
        for (var prop in obj) {
            if (obj.hasOwnProperty(prop)) {
                new_obj[obj[prop]] = prop;
            }
        }
        return new_obj;
    }

    function isSymbol(str) {
        return str.length === 1 && str.test(/[\W]/i);
    }

    //Regex Searchs used by fixValue in proper order
    this.regExps = [];
    this.regExps.push(new RegExp("\{\\\\\\W*\\w+\}")); // 1 {\[]}
    this.regExps.push(new RegExp("\\\\\\W*\{\\w+\}")); // 2 \[]{\[]}
    this.regExps.push(new RegExp("\\\\\\W*\\w+\\s")); // 3 \[]
    this.regExps.push(new RegExp("\\\\\\W*\\w+")); // 4 \[]
    this.regExps.push(new RegExp("\\\\(?![:\\\\\])\\W{1}")); // 5

    this.fixValue = function(value) {
        do {
            var removeBrackets = value.match(/^\{(.*?)\}$/g, '$1');
            if (removeBrackets) {
                value = value.replace(/^\{(.*?)\}$/g, '$1');
            }
        } while (removeBrackets);

        // Working on a more efficient way of processing the latex
        var index = value.indexOf("\\");
        if (index > -1) {
            for (var exp in this.regExps) {
                do {
                    var str = value.match(this.regExps[exp]);
                    var key = (str) ? str[0] : "";
                    if (str) {
                        if (typeof(latex_to_unicode[key]) != "undefined") {
                            value = value.replace(key, latex_to_unicode[key]);
                        } else {
                            var newkey = key.replace(new RegExp("(\\w)"), '{$1}')
                            if (typeof(latex_to_unicode[newkey]) != "undefined") {
                                value = value.replace(key, latex_to_unicode[newkey]);
                            } else {
                                str = "";
                            }
                        }
                    } else {
                        str = "";
                    }
                } while (str.length);
            }
        }
        value = value.replace(/[\{|\}]/g, '');
        return value;
    }

    this.displayAuthor = function(string) {
        string = string.replace(/[ ]*[\n\t][ ]*/g, " ");
        string = string.replace(/[ ]+/g, " ");
        var arrayString = string.split(new RegExp("[\\s]+and[\\s]+"));
        var newString = arrayString[0];
        for (i = 1; i < arrayString.length; i++) {
            if (i + 1 >= arrayString.length) {
                newString += ", and " + arrayString[i];
            } else {
                newString += ", " + arrayString[i];
            }
        }
        return newString;
    }

    this.createTemplate = function(entry, output) {
        // Check if bibtex keys are limiting output (bibtexkeys="key1|key2|...|keyN")
        if (output[0].hasAttribute("bibtexkeys")) {
            var bitexkeys = output[0].getAttribute("bibtexkeys");
            if (!entry["BIBTEXKEY"].match(bitexkeys))
                return null;
        }

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
            if (conds.length == 0) {
                break;
            }

            // check if
            var cond = conds.first();
            cond.removeClass("if");
            var ifTrue = true;
            var classList = cond.attr('class').split(' ');
            $.each(classList, function(index, cls) {
                if (cls[0] == "!" &&
                    keys.indexOf(cls.substring(1, cls.length).toUpperCase()) < 0) {
                    ifTrue = true;
                } else if (keys.indexOf(cls.toUpperCase()) < 0) {
                    ifTrue = false;
                }
                cond.removeClass(cls);
            });

            // remove false ifs
            if (!ifTrue) {
                cond.remove();
            }
        } while (true);

        tpl.find('.bibtexVar').each(function() {
            var key = $(this).attr("extra").toUpperCase();
            var regEx = new RegExp('\\+' + key + '\\+', "gi");
            $.each(this.attributes, function(i, attrib) {
                var value = attrib.value;
                value = value.replace(regEx, entry[key]);
                attrib.value = value;
            });
        });

        // fill in remaining fields 
        for (var index in keys) {
            var key = keys[index];
            var value = entry[key] || "";

            // Fill out bibtex raw and continue
            if (key == "BIBTEXRAW") {
                tpl.find("." + key.toLowerCase()).html(value);
                continue;
            }

            if (key == "AUTHOR") {
                value = this.displayAuthor(this.fixValue(value));
            } else if (key == "PAGES") {
                value = value.replace("--", "-");
            } else if (key == "DATE") {
                value = moment(value).format("MMM. YYYY");
            } else if (key == "URL") {
                value = value.replace(/\\url/g, '');
                value = this.fixValue(value);
            } else {
                value = this.fixValue(value);
            }

            tpl.find("span:not(a)." + key.toLowerCase()).html(value);
            tpl.find("a." + key.toLowerCase()).each(function() {
                if (!$(this).attr("href")) {
                    $(this).attr("href", value);
                }
            });
        }
        tpl.addClass("bibtexentry");
        return tpl;
    }

    this.createArray = function(entries) {
        var entriesArray = [];
        for (var entryKey in entries) {
            entriesArray.push(entries[entryKey]);
        }
        return entriesArray;
    }

    this.sortArray = function(array, key, rule, type) {
        var keyUpper = key.toUpperCase();
        array = array.sort(function(a, b) {
            var aValue = "",
                bValue = "";
            // Need to check if values exist
            aValue = (keyUpper in a) ? a[keyUpper] : "";
            bValue = (keyUpper in b) ? b[keyUpper] : "";
            switch (rule.toUpperCase()) {
                case "DESC":
                    //Values remain the same
                    break;
                case "ASC":
                    //Just swaping the values
                    var tmp = bValue;
                    bValue = aValue;
                    aValue = tmp;
                    break;
                default:
                    return 0;
                    break;
            }
            switch (type.toLowerCase()) {
                case "string":
                    return bValue.toUpperCase().localeCompare(aValue.toUpperCase());
                    break;
                case "number":
                    return parseInt(bValue) - parseInt(aValue);
                    break;
                case "date":
                    return new Date(bValue) - new Date(aValue);
                    break;
                default:
                    return 0;
                    break;
            }
        });
        return array;
    }

    this.createStructure = function(structure, output, entries, level) {
        var MissingGroup = "Other Publications";
        //Used during the search
        level = level || 0;

        var struct = structure.clone().removeClass('bibtex_structure');
        var groupChild = struct.children(".group");
        var sectionsChild = struct.children(".sections");
        var sortChild = struct.children(".sort");

        if (groupChild.length) {
            var group = groupChild.first();
            var groupName = group.attr('class').split(" ")[1].toUpperCase();
            var rule = group.attr('extra').split(" ")[0];
            var type = group.attr('extra').split(" ")[1];

            //Sort the array based on group rules
            var sortedArray = this.sortArray(entries, groupName, rule, type);

            // Get all the unique values for the groups
            var values = [];
            $.each(sortedArray, function(i, object) {
                if (groupName in object && $.inArray(object[groupName], values) === -1) {
                    values.push(object[groupName]);
                    return;
                }
            });
            values.push(MissingGroup); //This is for checking none grouped publications

            //Get the bibtex topics html here.
            var topics = $(".bibtex_topics");

            // Iterate through the values and recurively call this function
            globalStruct = $('<div></div>');
            for (val in values) {
                //Starting to create the page
                var newStruct = struct.clone();
                var groupNameValue = values[val];
                //Add the header for the group
                newStruct.children("." + groupName.toLowerCase()).first().prepend("<h" + (level + 1) + " class='" +
                    groupName + "' id=\"" + groupNameValue + "\">" + this.fixValue(groupNameValue) + "</h" + (level + 1) + ">");

                //Divide the array into group with groupNameValue
                splicedArray = $.grep(sortedArray, function(object, i) {
                    if (groupNameValue == MissingGroup) {
                        return (typeof object[groupName] === "undefined") ? true : false;
                    } else {
                        return object[groupName] == groupNameValue;
                    }
                });

                if (splicedArray.length) {
                    //Add the topic value to the topics structure if it exists on the page
                    if (topics.length && level == 0) {
                        topics.append(" - <a href=\"#" + groupNameValue + "\"> " + groupNameValue + " </a>");
                    }
                    // Get back the struct to add to the page
                    var tempStruct = this.createStructure(groupChild.clone(), output, splicedArray, level + 1);
                    if (groupChild.children(".group").length) {
                        nextGroupName = "." + groupChild.children(".group").attr('class').split(' ').join('.');
                        newStruct.find(nextGroupName).replaceWith(tempStruct.find(nextGroupName));
                    } else {
                        newStruct.find(".templates").append(tempStruct.find(".templates").html());
                    }
                    if (level == 0) {
                        output.append(newStruct);
                    } else {
                        globalStruct.append(newStruct);
                    }
                }
            }
            if (level == 0) {
                return output;
            } else {
                return globalStruct;
            }
        } else if (sectionsChild.length) {
            var values = [],
                titles = [];
            // Get all the unique values for the sections
            var sectionbibtexkey = sectionsChild.first().attr('class').split(" ")[1].toUpperCase();
            $('.section', '.sections').each(function(i, object) {
                values.push($(this).attr('class').split(" ")[1].toUpperCase());
                titles.push($(this).attr('title'));
            });

            //Get the bibtex topics html here.
            var topics = $(".bibtex_topics");

            // Iterate through the values and recurively call this function
            globalStruct = $('<div></div>');
            for (val in values) {
                //Starting to create the page
                var newStruct = struct.clone();
                var sectionNameValue = values[val];
                var re = new RegExp(sectionNameValue);
                var sectionNameTitle = titles[val];
                //Add the header for the group
                newStruct.children("." + sectionbibtexkey.toLowerCase()).first().prepend("<h" + (level + 1) + " class='" + groupName + "' id=\"" + sectionNameValue + "\">" + sectionNameTitle + "</h" + (level + 1) + ">");

                newStruct.attr("id", sectionNameTitle.toLowerCase());

                //Divide the array into group with sectionNameValue
                splicedArray = $.grep(entries, function(object, i) {
                    return re.test(object[sectionbibtexkey]);
                });

                if (splicedArray.length) {
                    //Add the topic value to the topics structure if it exists on the page
                    if (topics.length && level == 0) {
                        topics.append(" - <a href=\"#" + sectionNameValue + "\"> " + sectionNameTitle + " </a>");
                    }
                    // Get back the struct to add to the page
                    var tempStruct = this.createStructure(sectionsChild.clone(), output, splicedArray, level + 1);
                    if (groupChild.children(".group").length) {
                        nextGroupName = "." + groupChild.children(".group").attr('class').split(' ').join('.');
                        newStruct.find(nextGroupName).replaceWith(tempStruct.find(nextGroupName));
                    } else {
                        newStruct.find(".templates").append(tempStruct.find(".templates").html());
                    }
                    if (level == 0) {
                        output.append(newStruct);
                    } else {
                        globalStruct.append(newStruct);
                    }
                }
            }
            if (level == 0) {
                return output;
            } else {
                return globalStruct;
            }
        } else if (sortChild.length) {
            var sortName = sortChild.attr('class').split(" ")[1].toUpperCase();
            var rule = sortChild.first().attr('extra').split(" ")[0];
            var type = sortChild.first().attr('extra').split(" ")[1];

            var sort = structure.children(".sort").first().clone();
            //Sort the array based on sort rules
            var sortedArray = this.sortArray(entries, sortName, rule, type);
            if (level == 0) {
                output.append(this.createStructure(sortChild, output, sortedArray, level + 1));
            } else {
                return this.createStructure(sortChild, output, sortedArray, level + 1);
            }
        } else {
            // iterate over bibTeX entries and add them to template
            for (var entryKey in entries) {
                var entry = entries[entryKey];
                // Checking if web is set to visible
                if (!entry["WEB"] || entry["WEB"].toUpperCase() != "NO") {
                    var tpl = this.createTemplate(entry, output);
                    // Check if template was created
                    if (tpl) {
                        structure.find(".templates").append(tpl);
                        tpl.show();
                    }
                }
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
        if (structure.length) {
            // Create array for sorting
            var entriesArray = this.createArray(entries);
            this.createStructure(structure, output, entriesArray);
        } else {
            // iterate over bibTeX entries
            for (var entryKey in entries) {
                var entry = entries[entryKey];

                tpl = this.createTemplate(entry, output);
                // Check if template was created
                if (tpl) {
                    output.append(tpl);
                    tpl.show();
                }
            }
        }
        // remove old entries
        old.remove();
    }

}

function bibtex_js_draw() {
    $(".bibtex_template").hide();
    if ($("#bibtex_input").length) {
        (new BibtexDisplay()).displayBibtex($("#bibtex_input").val(), $("#bibtex_display"));
    } else {
        //Gets the BibTex files and adds them together
        var bibstring = "";
        var requests = [];
        // Create request for bibtex files
        $('bibtex').each(function(index, value) {
            var request = $.ajax({
                    url: $(this).attr('src'),
                    dataType: "text"
                })
                .done((data) => bibstring += data)
                .fail((request, status, error) => console.error(error))
            requests.push(request);
        });

        // Executed on completion of last outstanding ajax call
        $.when.apply($, requests).then(function() {
            // Check if we have a bibtex_display id or classes
            if ($("#bibtex_display").length) {
                (new BibtexDisplay()).displayBibtex(bibstring, $("#bibtex_display"));
            } else if ($(".bibtex_display").length) {
                // Loop through all bibtex_displays on the page
                $(".bibtex_display").each(function(index) {
                    // ($this) is the class node output for the bitex entries
                    (new BibtexDisplay()).displayBibtex(bibstring, $(this));
                });
            }
            loadExtras();
            // Remove elements from html that are not needed to display
            $(".bibtex_structure").remove();
        });
    }
}

/** 
BibTex Searcher is used with input form
*/
function BibTeXSearcher() {
    this.inputArray = new Array("");
    this.inputLength = 0;

    this.setInputArray = function(val) {
        this.inputArray = val;
        this.inputLength = val.length;
    }

    this.getStringName = function(string) {
        var start_pos = string.indexOf('@') + 1;
        var end_pos = string.indexOf('[', start_pos);
        var array = [];
        if (end_pos == -1) {
            array[0] = string.substring(start_pos, string.length);
        } else {
            array[0] = string.substring(start_pos, end_pos);
            end_pos2 = string.indexOf(']', start_pos);
            array[1] = string.substring(end_pos + 1, end_pos2);
        }
        return array;
    }

    this.checkEntry = function(entry, word) {
        var found = false;
        if (word[0] != "@") {
            entry.find("span:not(.noread)").each(
                function() {
                    if ($(this).text().search(new RegExp(word, "i")) > -1 &&
                        entry.is(":visible")) {
                        found = true;
                        return false; //Break out of loop
                    }
                });
        } else {
            //This search version is for more specific searchs using the @name[parameter]=value
            var strings = word.split("=");
            var arrayStr = this.getStringName(strings[0]);
            if (arrayStr.length < 2) {
                entry.find("span:not(.noread)." + arrayStr[0]).each(
                    function() {
                        if ($(this).text().search(new RegExp(strings[1], "i")) > -1 &&
                            entry.is(":visible")) {
                            found = true;
                            return false; //Break out of loop
                        }
                    });
            } else {
                switch (arrayStr[1]) {
                    case "first":
                        entry.find("span:not(.noread)." + arrayStr[0]).each(
                            function() {
                                arrayString = $(this).text().split(new RegExp(",[\\s]+and[\\s]+|,[\\s]+"));
                                if (strings[1] == arrayString[0] && entry.is(":visible")) {
                                    found = true;
                                    return false; //Break out of loop
                                }
                            });
                        break;
                }
            }
        }
        return found;
    }

    this.unhideAll = function() {
        $("div#bibtex_display").children().each(
            function() {
                $(this).show();
                $(this).find(".bibtexentry").each(
                    function() {
                        $(this).show();
                    });
            });
    }

    this.hideEntry = function(word) {
        var funcCaller = this;
        var container = $("div#bibtex_display").children();
        if (container.first().hasClass("bibtexentry:visible")) {
            container.each(
                function() {
                    if (!funcCaller.checkEntry($(this), word)) {
                        $(this).hide();
                    }
                });
        } else {
            container.each(
                function() {
                    var shouldHide = true;
                    $(this).find(".bibtexentry:visible").each(
                        function() {
                            if (!funcCaller.checkEntry($(this), word)) {
                                $(this).hide();
                            } else {
                                shouldHide = false;
                            }
                        });
                    // Hides outside div
                    if (shouldHide) {
                        $(this).hide();
                    }
                });
        }
    }

    this.searcher = function(input, needToRestart) {
        needToRestart = typeof needToRestart !== 'undefined' ? needToRestart : false;
        var string = input;
        if (string.length) {
            var splitInput = string.split("%");
            //If input is less than restart
            if (this.inputLength > splitInput.length || this.inputLength == 0) {
                needToRestart = true;
            }
            //If last string reduced in size than restart
            else if (this.inputArray[this.inputArray.length - 1].length >
                splitInput[splitInput.length - 1].length) {
                needToRestart = true;
            }
            //If earlier words changed than restart
            else {
                for (var i = 0; i < this.inputArray.length - 1; i++) {
                    if (this.inputArray[i] != splitInput[i]) {
                        needToRestart = true;
                        break;
                    }
                }
            }
            if (needToRestart) {
                this.unhideAll();
                for (var word in splitInput) {
                    this.hideEntry(splitInput[word]);
                }
            } else {
                this.hideEntry(splitInput[splitInput.length - 1]);
            }
            this.setInputArray(splitInput);
        } else {
            this.unhideAll();
        }
    }
}

function createWebPage(defaultTemplate) {
    // draw bibtex when loaded
    $(document).ready(function() {
        // check for template, add default
        if ($(".bibtex_template").length == 0) {
            $("body").append(defaultTemplate);
        }
        bibtex_js_draw();
    });
}

function loadExtras() {
    BibTeXSearcherClass = new BibTeXSearcher();
    $(".bibtex_author").each(function(i, obj) {
        authorList($(this));
    });

    localStorage.removeItem("customerDatabase");

    if (!localStorage.searcher) {
        localStorage.searcher = new Object();
    }

    //Resets selects when back button is used
    $("select").each(function() {
        if (localStorage.getItem($(this).attr("id"))) {
            $(this).val(JSON.parse(localStorage.getItem($(this).attr("id"))));
        }
    });

    $(".bibtex_search").each(function(i, obj) {
        $(this).on('change', function(e) {
            combineSearcher(BibTeXSearcherClass, true);
            localStorage.setItem($(this).attr("id"), JSON.stringify($(this).val()));
        });
        $(this).keyup(function() {
            combineSearcher(BibTeXSearcherClass);
        });
        if ($(this).val() != "") {
            combineSearcher(BibTeXSearcherClass, true);
        }
    });

}

function combineSearcher(searcherClass, needToRestart) {
    needToRestart = typeof needToRestart !== 'undefined' ? needToRestart : false;
    var string = "";
    $("select.bibtex_search").each(function(i, obj) {
        var front = "";
        if (obj.hasAttribute("search"))
            front = "@" + $(this).attr("search");
        if (obj.hasAttribute("extra")) {
            front += "[" + $(this).attr("extra") + "]=";
        } else {
            if (front != "") {
                front += "=";
            }
        }
        if ($(this).val() != "") {
            string += "%" + front + $(this).val();
        }
    });
    $("input.bibtex_search").each(function(i, obj) {
        if ($(this).val() != "") {
            string += "%" + $(this).val().split(' ').join('%');
        }
    });
    searcherClass.searcher(string, needToRestart);
}

function authorList(object) {
    var map = new Object();
    $("span.author").each(function(i, obj) {
        arrayString = $(this).text().split(new RegExp(",[\\s]+and[\\s]+|,[\\s]+"));
        if (object.attr("extra") == "first") {
            map[arrayString[0]] = 1;
        } else {
            for (i = 0; i < arrayString.length; i++) {
                if (arrayString[i] in map) {
                    map[arrayString[i]] += 1;
                } else {
                    map[arrayString[i]] = 1;
                }
            }
        }
    });

    var tuples = [];
    for (var key in map) tuples.push([key, key.split(" ").pop().toLowerCase()]);

    tuples.sort(function(a, b) {
        a = a[1];
        b = b[1];
        return a < b ? -1 : (a > b ? 1 : 0);
    });

    for (var i = 0; i < tuples.length; i++) {
        var key = tuples[i][0];
        var value = tuples[i][1];
        var array = key.split(" ");
        var text = array.pop() + ", " + array.join(" ");
        object.append($("<option></option>").attr("value", key).text(text));
    }
}

var defaultTemplate = "<div class=\"bibtex_template\">" +
    "<div class=\"if author\" style=\"font-weight: bold;\">\n" +
    "<span class=\"if year\">\n" +
    "<span class=\"year\"></span>,\n" +
    "</span>\n  <span class=\"author\"></span>\n" +
    "<span class=\"if url\" style=\"margin-left: 20px\">\n" +
    "<a class=\"url\" style=\"color:black; font-size:10px\">(view online)</a>\n" +
    "</span>\n</div>\n<div style=\"margin-left: 10px; margin-bottom:5px;\">\n" +
    "<span class=\"title\"></span>\n</div></div>";

// check whether or not jquery is present
if (!window.jQuery) {
    //Add jquery to the webpage
    var jq = document.createElement('script');
    jq.type = 'text/javascript';
    jq.src = 'https://ajax.googleapis.com/ajax/libs/jquery/3.2.1/jquery.min.js';
    document.getElementsByTagName('head')[0].appendChild(jq);
    // Poll for jQuery to come into existance
    var checkReady = function(callback) {
        if (window.jQuery) {
            callback(jQuery);
        } else {
            window.setTimeout(function() {
                checkReady(callback);
            }, 100);
        }
    };

    // Start polling...
    checkReady(function($) {
        createWebPage(defaultTemplate);
    });
} else {
    // Create the webpage
    createWebPage(defaultTemplate);
}

var latex_to_unicode = {
    "\\space": "\u0020",
    "\\#": "\u0023",
    "\\textdollar": "\u0024",
    "\\%": "\u0025",
    "\\&": "\u0026",
    "\\textquotesingle": "\u0027",
    "\\ast": "\u002A",
    "\\textbackslash": "\u005C",
    "\\^{}": "\u005E",
    "\\_": "\u005F",
    "\\textasciigrave": "\u0060",
    "\\lbrace": "\u007B",
    "\\vert": "\u007C",
    "\\rbrace": "\u007D",
    "\\textasciitilde": "\u007E",
    "\\textexclamdown": "\u00A1",
    "\\textcent": "\u00A2",
    "\\textsterling": "\u00A3",
    "\\textcurrency": "\u00A4",
    "\\textyen": "\u00A5",
    "\\textbrokenbar": "\u00A6",
    "\\textsection": "\u00A7",
    "\\textasciidieresis": "\u00A8",
    "\\textcopyright": "\u00A9",
    "\\textordfeminine": "\u00AA",
    "\\guillemotleft": "\u00AB",
    "\\lnot": "\u00AC",
    "\u00AD": "\\-",
    "\\textregistered": "\u00AE",
    "\\textasciimacron": "\u00AF",
    "\\textdegree": "\u00B0",
    "\\pm": "\u00B1",
    "{^2}": "\u00B2",
    "{^3}": "\u00B3",
    "\\textasciiacute": "\u00B4",
    "\\mathrm{\\mu}": "\u00B5",
    "\\textparagraph": "\u00B6",
    "\\cdot": "\u00B7",
    "\\c{}": "\u00B8",
    "{^1}": "\u00B9",
    "\\textordmasculine": "\u00BA",
    "\\guillemotright": "\u00BB",
    "\\textonequarter": "\u00BC",
    "\\textonehalf": "\u00BD",
    "\\textthreequarters": "\u00BE",
    "\\textquestiondown": "\u00BF",
    "\\`{A}": "\u00C0",
    "\\'{A}": "\u00C1",
    "\\^{A}": "\u00C2",
    "\\~{A}": "\u00C3",
    "\\\"{A}": "\u00C4",
    "\\\"{a}": "\u00E4",
    "\\\"a": "\u00E4",
    "\\AA": "\u00C5",
    "\\AE": "\u00C6",
    "\\c{C}": "\u00C7",
    "\\`{E}": "\u00C8",
    "\\'{E}": "\u00C9",
    "\\^{E}": "\u00CA",
    "\\\"{E}": "\u00CB",
    "\\`{I}": "\u00CC",
    "\\'{I}": "\u00CD",
    "\\^{I}": "\u00CE",
    "\\\"{I}": "\u00CF",
    "\\DH": "\u00D0",
    "\\~{N}": "\u00D1",
    "\\`{O}": "\u00D2",
    "\\'{O}": "\u00D3",
    "\\^{O}": "\u00D4",
    "\\~{O}": "\u00D5",
    "\\\"{O}": "\u00D6",
    "\\texttimes": "\u00D7",
    "\\O ": "",
    "\\`{U}": "\u00D9",
    "\\'{U}": "\u00DA",
    "\\^{U}": "\u00DB",
    "\\\"{U}": "\u00DC",
    "\\'{Y}": "\u00DD",
    "\\TH": "\u00DE",
    "\\ss": "\u00DF",
    "\\`{a}": "\u00E0",
    "\\'{a}": "\u00E1",
    "\\^{a}": "\u00E2",
    "\\~{a}": "\u00E3",
    "\\\"{a}": "\u00E4",
    "\\aa": "\u00E5",
    "\\ae": "\u00E6",
    "\\c{c}": "\u00E7",
    "\\`{e}": "\u00E8",
    "\\'{e}": "\u00E9",
    "\\^{e}": "\u00EA",
    "\\\"{e}": "\u00EB",
    "\\`{\\i}": "\u00EC",
    "\\'{\\i}": "\u00ED",
    "\\^{\\i}": "\u00EE",
    "\\\"\\i ": "",
    "\\`{i}": "\u00EC",
    "\\'{i}": "\u00ED",
    "\\^{i}": "\u00EE",
    "\\\"i": "\u00EF",
    "\\dh": "\u00F0",
    "\\~{n}": "\u00F1",
    "\\~n": "\u00F1",
    "\\`{o}": "\u00F2",
    "\\'{o}": "\u00F3",
    "\\^{o}": "\u00F4",
    "\\~{o}": "\u00F5",
    "\\\"{o}": "\u00F6",
    "\\div": "\u00F7",
    "\\o": "\u00F8",
    "\\`{u}": "\u00F9",
    "\\'{u}": "\u00FA",
    "\\^{u}": "\u00FB",
    "\\\"{u}": "\u00FC",
    "\\'{y}": "\u00FD",
    "\\th": "\u00FE",
    "\\\"{y}": "\u00FF",
    "\\={A}": "\u0100",
    "\\={a}": "\u0101",
    "\\u{A}": "\u0102",
    "\\u{a}": "\u0103",
    "\\k{A}": "\u0104",
    "\\k{a}": "\u0105",
    "\\'{C}": "\u0106",
    "\\'{c}": "\u0107",
    "\\^{C}": "\u0108",
    "\\^{c}": "\u0109",
    "\\.{C}": "\u010A",
    "\\.{c}": "\u010B",
    "\\v{C}": "\u010C",
    "\\v{c}": "\u010D",
    "\\v{D}": "\u010E",
    "\\v{d}": "\u010F",
    "\\DJ": "\u0110",
    "\\dj": "\u0111",
    "\\={E}": "\u0112",
    "\\={e}": "\u0113",
    "\\u{E}": "\u0114",
    "\\u{e}": "\u0115",
    "\\.{E}": "\u0116",
    "\\.{e}": "\u0117",
    "\\k{E}": "\u0118",
    "\\k{e}": "\u0119",
    "\\v{E}": "\u011A",
    "\\v{e}": "\u011B",
    "\\^{G}": "\u011C",
    "\\^{g}": "\u011D",
    "\\u{G}": "\u011E",
    "\\u{g}": "\u011F",
    "\\.{G}": "\u0120",
    "\\.{g}": "\u0121",
    "\\c{G}": "\u0122",
    "\\c{g}": "\u0123",
    "\\^{H}": "\u0124",
    "\\^{h}": "\u0125",
    "\\fontencoding{LELA}\\selectfont\\char40": "\u0126",
    "\\Elzxh": "\u0127",
    "\\~{I}": "\u0128",
    "\\~{\\i}": "\u0129",
    "\\={I}": "\u012A",
    "\\={\\i}": "\u012B",
    "\\u{I}": "\u012C",
    "\\u{\\i}": "\u012D",
    "\\k{I}": "\u012E",
    "\\k{i}": "\u012F",
    "\\.{I}": "\u0130",
    "\\i ": "\u0131",
    "IJ": "\u0132",
    "ij": "\u0133",
    "\\^{J}": "\u0134",
    "\\^{\\j}": "\u0135",
    "\\c{K}": "\u0136",
    "\\c{k}": "\u0137",
    "{\\fontencoding{LELA}\\selectfont\\char91}": "\u0138",
    "\\'{L}": "\u0139",
    "\\'{l}": "\u013A",
    "\\c{L}": "\u013B",
    "\\c{l}": "\u013C",
    "\\v{L}": "\u013D",
    "\\v{l}": "\u013E",
    "{\\fontencoding{LELA}\\selectfont\\char201}": "\u013F",
    "{\\fontencoding{LELA}\\selectfont\\char202}": "\u0140",
    "\\L ": "",
    "\\l ": "",
    "\\'{N}": "\u0143",
    "\\'{n}": "\u0144",
    "\\c{N}": "\u0145",
    "\\c{n}": "\u0146",
    "\\v{N}": "\u0147",
    "\\v{n}": "\u0148",
    "'n": "\u0149",
    "\\NG": "\u014A",
    "\\ng": "\u014B",
    "\\={O}": "\u014C",
    "\\={o}": "\u014D",
    "\\u{O}": "\u014E",
    "\\u{o}": "\u014F",
    "\\H{O}": "\u0150",
    "\\H{o}": "\u0151",
    "\\OE": "\u0152",
    "\\oe": "\u0153",
    "\\'{R}": "\u0154",
    "\\'{r}": "\u0155",
    "\\c{R}": "\u0156",
    "\\c{r}": "\u0157",
    "\\v{R}": "\u0158",
    "\\v{r}": "\u0159",
    "\\'{S}": "\u015A",
    "\\'{s}": "\u015B",
    "\\^{S}": "\u015C",
    "\\^{s}": "\u015D",
    "\\c{S}": "\u015E",
    "\\c{s}": "\u015F",
    "\\v{S}": "\u0160",
    "\\v{s}": "\u0161",
    "\\c{T}": "\u0162",
    "\\c{t}": "\u0163",
    "\\v{T}": "\u0164",
    "\\v{t}": "\u0165",
    "{\\fontencoding{LELA}\\selectfont\\char47}": "\u0166",
    "{\\fontencoding{LELA}\\selectfont\\char63}": "\u0167",
    "\\~{U}": "\u0168",
    "\\~{u}": "\u0169",
    "\\={U}": "\u016A",
    "\\={u}": "\u016B",
    "\\u{U}": "\u016C",
    "\\u{u}": "\u016D",
    "\\r{U}": "\u016E",
    "\\r{u}": "\u016F",
    "\\H{U}": "\u0170",
    "\\H{u}": "\u0171",
    "\\k{U}": "\u0172",
    "\\k{u}": "\u0173",
    "\\^{W}": "\u0174",
    "\\^{w}": "\u0175",
    "\\^{Y}": "\u0176",
    "\\^{y}": "\u0177",
    "\\\"{Y}": "\u0178",
    "\\'{Z}": "\u0179",
    "\\'{z}": "\u017A",
    "\\.{Z}": "\u017B",
    "\\.{z}": "\u017C",
    "\\v{Z}": "\u017D",
    "\\v{z}": "\u017E",
    "\\texthvlig": "\u0195",
    "\\textnrleg": "\u019E",
    "\\eth": "\u01AA",
    "{\\fontencoding{LELA}\\selectfont\\char195}": "\u01BA",
    "\\textdoublepipe": "\u01C2",
    "\\'{g}": "\u01F5",
    "\\Elztrna": "\u0250",
    "\\Elztrnsa": "\u0252",
    "\\Elzopeno": "\u0254",
    "\\Elzrtld": "\u0256",
    "{\\fontencoding{LEIP}\\selectfont\\char61}": "\u0258",
    "\\Elzschwa": "\u0259",
    "\\varepsilon": "\u025B",
    "\\Elzpgamma": "\u0263",
    "\\Elzpbgam": "\u0264",
    "\\Elztrnh": "\u0265",
    "\\Elzbtdl": "\u026C",
    "\\Elzrtll": "\u026D",
    "\\Elztrnm": "\u026F",
    "\\Elztrnmlr": "\u0270",
    "\\Elzltlmr": "\u0271",
    "\\Elzltln": "\u0272",
    "\\Elzrtln": "\u0273",
    "\\Elzclomeg": "\u0277",
    "\\textphi": "\u0278",
    "\\Elztrnr": "\u0279",
    "\\Elztrnrl": "\u027A",
    "\\Elzrttrnr": "\u027B",
    "\\Elzrl": "\u027C",
    "\\Elzrtlr": "\u027D",
    "\\Elzfhr": "\u027E",
    "{\\fontencoding{LEIP}\\selectfont\\char202}": "\u027F",
    "\\Elzrtls": "\u0282",
    "\\Elzesh": "\u0283",
    "\\Elztrnt": "\u0287",
    "\\Elzrtlt": "\u0288",
    "\\Elzpupsil": "\u028A",
    "\\Elzpscrv": "\u028B",
    "\\Elzinvv": "\u028C",
    "\\Elzinvw": "\u028D",
    "\\Elztrny": "\u028E",
    "\\Elzrtlz": "\u0290",
    "\\Elzyogh": "\u0292",
    "\\Elzglst": "\u0294",
    "\\Elzreglst": "\u0295",
    "\\Elzinglst": "\u0296",
    "\\textturnk": "\u029E",
    "\\Elzdyogh": "\u02A4",
    "\\Elztesh": "\u02A7",
    "\\textasciicaron": "\u02C7",
    "\\Elzverts": "\u02C8",
    "\\Elzverti": "\u02CC",
    "\\Elzlmrk": "\u02D0",
    "\\Elzhlmrk": "\u02D1",
    "\\Elzsbrhr": "\u02D2",
    "\\Elzsblhr": "\u02D3",
    "\\Elzrais": "\u02D4",
    "\\Elzlow": "\u02D5",
    "\\textasciibreve": "\u02D8",
    "\\textperiodcentered": "\u02D9",
    "\\r{}": "\u02DA",
    "\\k{}": "\u02DB",
    "\\texttildelow": "\u02DC",
    "\\H{}": "\u02DD",
    "\\tone{55}": "\u02E5",
    "\\tone{44}": "\u02E6",
    "\\tone{33}": "\u02E7",
    "\\tone{22}": "\u02E8",
    "\\tone{11}": "\u02E9",
    "\\` ": "",
    "\\`": "",
    "\\' ": "",
    "\\'": "",
    "\\^ ": "",
    "\\^": "",
    "\\~ ": "",
    "\\~": "",
    "\\=": "\u0304",
    "\\u ": "",
    "\\u": "",
    "\\. ": "",
    "\\\" ": "",
    "\\\"": "",
    "\\em": "",
    "\\sc": "",
    "\\r ": "",
    "\\H ": "",
    "\\v ": "",
    "\\cyrchar\\C": "\u030F",
    "{\\fontencoding{LECO}\\selectfont\\char177}": "\u0311",
    "{\\fontencoding{LECO}\\selectfont\\char184}": "\u0318",
    "{\\fontencoding{LECO}\\selectfont\\char185}": "\u0319",
    "\\Elzpalh": "\u0321",
    "\\Elzrh": "\u0322",
    "\\c ": "",
    "\\k ": "",
    "\\Elzsbbrg": "\u032A",
    "{\\fontencoding{LECO}\\selectfont\\char203}": "\u032B",
    "{\\fontencoding{LECO}\\selectfont\\char207}": "\u032F",
    "\\Elzxl": "\u0335",
    "\\Elzbar": "\u0336",
    "{\\fontencoding{LECO}\\selectfont\\char215}": "\u0337",
    "{\\fontencoding{LECO}\\selectfont\\char216}": "\u0338",
    "{\\fontencoding{LECO}\\selectfont\\char218}": "\u033A",
    "{\\fontencoding{LECO}\\selectfont\\char219}": "\u033B",
    "{\\fontencoding{LECO}\\selectfont\\char220}": "\u033C",
    "{\\fontencoding{LECO}\\selectfont\\char221}": "\u033D",
    "{\\fontencoding{LECO}\\selectfont\\char225}": "\u0361",
    "\\'{A}": "\u0386",
    "\\'{E}": "\u0388",
    "\\'{H}": "\u0389",
    "\\'{}{I}": "\u038A",
    "\\'{}O": "\u038C",
    "\\mathrm{'Y}": "\u038E",
    "\\mathrm{'\\Omega}": "\u038F",
    "\\acute{\\ddot{\\iota}}": "\u0390",
    "\\Alpha": "\u0391",
    "\\Beta": "\u0392",
    "\\Gamma": "\u0393",
    "\\Delta": "\u0394",
    "\\Epsilon": "\u0395",
    "\\Zeta": "\u0396",
    "\\Eta": "\u0397",
    "\\Theta": "\u0398",
    "\\Iota": "\u0399",
    "\\Kappa": "\u039A",
    "\\Lambda": "\u039B",
    "\\Xi": "\u039E",
    "\\Pi": "\u03A0",
    "\\Rho": "\u03A1",
    "\\Sigma": "\u03A3",
    "\\Tau": "\u03A4",
    "\\Upsilon": "\u03A5",
    "\\Phi": "\u03A6",
    "\\Chi": "\u03A7",
    "\\Psi": "\u03A8",
    "\\Omega": "\u03A9",
    "\\mathrm{\\ddot{I}}": "\u03AA",
    "\\mathrm{\\ddot{Y}}": "\u03AB",
    "\u03AC": "\\'{$\\alpha$}",
    "\\acute{\\epsilon}": "\u03AD",
    "\\acute{\\eta}": "\u03AE",
    "\\acute{\\iota}": "\u03AF",
    "\\acute{\\ddot{\\upsilon}}": "\u03B0",
    "\\alpha": "\u03B1",
    "\\beta": "\u03B2",
    "\\gamma": "\u03B3",
    "\\delta": "\u03B4",
    "\\epsilon": "\u03B5",
    "\\zeta": "\u03B6",
    "\\eta": "\u03B7",
    "\\texttheta": "\u03B8",
    "\\iota": "\u03B9",
    "\\kappa": "\u03BA",
    "\\lambda": "\u03BB",
    "\\mu": "\u03BC",
    "\\nu": "\u03BD",
    "\\xi": "\u03BE",
    "\\pi": "\u03C0",
    "\\rho": "\u03C1",
    "\\varsigma": "\u03C2",
    "\\sigma": "\u03C3",
    "\\tau": "\u03C4",
    "\\upsilon": "\u03C5",
    "\\varphi": "\u03C6",
    "\\chi": "\u03C7",
    "\\psi": "\u03C8",
    "\\omega": "\u03C9",
    "\\ddot{\\iota}": "\u03CA",
    "\\ddot{\\upsilon}": "\u03CB",
    "\\'{o}": "\u03CC",
    "\\acute{\\upsilon}": "\u03CD",
    "\\acute{\\omega}": "\u03CE",
    "\\Pisymbol{ppi022}{87}": "\u03D0",
    "\\textvartheta": "\u03D1",
    "\\Upsilon": "\u03D2",
    "\\phi": "\u03D5",
    "\\varpi": "\u03D6",
    "\\Stigma": "\u03DA",
    "\\Digamma": "\u03DC",
    "\\digamma": "\u03DD",
    "\\Koppa": "\u03DE",
    "\\Sampi": "\u03E0",
    "\\varkappa": "\u03F0",
    "\\varrho": "\u03F1",
    "\\textTheta": "\u03F4",
    "\\backepsilon": "\u03F6",
    "\\cyrchar\\CYRYO": "\u0401",
    "\\cyrchar\\CYRDJE": "\u0402",
    "\\cyrchar{\\'\\CYRG}": "\u0403",
    "\\cyrchar\\CYRIE": "\u0404",
    "\\cyrchar\\CYRDZE": "\u0405",
    "\\cyrchar\\CYRII": "\u0406",
    "\\cyrchar\\CYRYI": "\u0407",
    "\\cyrchar\\CYRJE": "\u0408",
    "\\cyrchar\\CYRLJE": "\u0409",
    "\\cyrchar\\CYRNJE": "\u040A",
    "\\cyrchar\\CYRTSHE": "\u040B",
    "\\cyrchar{\\'\\CYRK}": "\u040C",
    "\\cyrchar\\CYRUSHRT": "\u040E",
    "\\cyrchar\\CYRDZHE": "\u040F",
    "\\cyrchar\\CYRA": "\u0410",
    "\\cyrchar\\CYRB": "\u0411",
    "\\cyrchar\\CYRV": "\u0412",
    "\\cyrchar\\CYRG": "\u0413",
    "\\cyrchar\\CYRD": "\u0414",
    "\\cyrchar\\CYRE": "\u0415",
    "\\cyrchar\\CYRZH": "\u0416",
    "\\cyrchar\\CYRZ": "\u0417",
    "\\cyrchar\\CYRI": "\u0418",
    "\\cyrchar\\CYRISHRT": "\u0419",
    "\\cyrchar\\CYRK": "\u041A",
    "\\cyrchar\\CYRL": "\u041B",
    "\\cyrchar\\CYRM": "\u041C",
    "\\cyrchar\\CYRN": "\u041D",
    "\\cyrchar\\CYRO": "\u041E",
    "\\cyrchar\\CYRP": "\u041F",
    "\\cyrchar\\CYRR": "\u0420",
    "\\cyrchar\\CYRS": "\u0421",
    "\\cyrchar\\CYRT": "\u0422",
    "\\cyrchar\\CYRU": "\u0423",
    "\\cyrchar\\CYRF": "\u0424",
    "\\cyrchar\\CYRH": "\u0425",
    "\\cyrchar\\CYRC": "\u0426",
    "\\cyrchar\\CYRCH": "\u0427",
    "\\cyrchar\\CYRSH": "\u0428",
    "\\cyrchar\\CYRSHCH": "\u0429",
    "\\cyrchar\\CYRHRDSN": "\u042A",
    "\\cyrchar\\CYRERY": "\u042B",
    "\\cyrchar\\CYRSFTSN": "\u042C",
    "\\cyrchar\\CYREREV": "\u042D",
    "\\cyrchar\\CYRYU": "\u042E",
    "\\cyrchar\\CYRYA": "\u042F",
    "\\cyrchar\\cyra": "\u0430",
    "\\cyrchar\\cyrb": "\u0431",
    "\\cyrchar\\cyrv": "\u0432",
    "\\cyrchar\\cyrg": "\u0433",
    "\\cyrchar\\cyrd": "\u0434",
    "\\cyrchar\\cyre": "\u0435",
    "\\cyrchar\\cyrzh": "\u0436",
    "\\cyrchar\\cyrz": "\u0437",
    "\\cyrchar\\cyri": "\u0438",
    "\\cyrchar\\cyrishrt": "\u0439",
    "\\cyrchar\\cyrk": "\u043A",
    "\\cyrchar\\cyrl": "\u043B",
    "\\cyrchar\\cyrm": "\u043C",
    "\\cyrchar\\cyrn": "\u043D",
    "\\cyrchar\\cyro": "\u043E",
    "\\cyrchar\\cyrp": "\u043F",
    "\\cyrchar\\cyrr": "\u0440",
    "\\cyrchar\\cyrs": "\u0441",
    "\\cyrchar\\cyrt": "\u0442",
    "\\cyrchar\\cyru": "\u0443",
    "\\cyrchar\\cyrf": "\u0444",
    "\\cyrchar\\cyrh": "\u0445",
    "\\cyrchar\\cyrc": "\u0446",
    "\\cyrchar\\cyrch": "\u0447",
    "\\cyrchar\\cyrsh": "\u0448",
    "\\cyrchar\\cyrshch": "\u0449",
    "\\cyrchar\\cyrhrdsn": "\u044A",
    "\\cyrchar\\cyrery": "\u044B",
    "\\cyrchar\\cyrsftsn": "\u044C",
    "\\cyrchar\\cyrerev": "\u044D",
    "\\cyrchar\\cyryu": "\u044E",
    "\\cyrchar\\cyrya": "\u044F",
    "\\cyrchar\\cyryo": "\u0451",
    "\\cyrchar\\cyrdje": "\u0452",
    "\\cyrchar{\\'\\cyrg}": "\u0453",
    "\\cyrchar\\cyrie": "\u0454",
    "\\cyrchar\\cyrdze": "\u0455",
    "\\cyrchar\\cyrii": "\u0456",
    "\\cyrchar\\cyryi": "\u0457",
    "\\cyrchar\\cyrje": "\u0458",
    "\\cyrchar\\cyrlje": "\u0459",
    "\\cyrchar\\cyrnje": "\u045A",
    "\\cyrchar\\cyrtshe": "\u045B",
    "\\cyrchar{\\'\\cyrk}": "\u045C",
    "\\cyrchar\\cyrushrt": "\u045E",
    "\\cyrchar\\cyrdzhe": "\u045F",
    "\\cyrchar\\CYROMEGA": "\u0460",
    "\\cyrchar\\cyromega": "\u0461",
    "\\cyrchar\\CYRYAT": "\u0462",
    "\\cyrchar\\CYRIOTE": "\u0464",
    "\\cyrchar\\cyriote": "\u0465",
    "\\cyrchar\\CYRLYUS": "\u0466",
    "\\cyrchar\\cyrlyus": "\u0467",
    "\\cyrchar\\CYRIOTLYUS": "\u0468",
    "\\cyrchar\\cyriotlyus": "\u0469",
    "\\cyrchar\\CYRBYUS": "\u046A",
    "\\cyrchar\\CYRIOTBYUS": "\u046C",
    "\\cyrchar\\cyriotbyus": "\u046D",
    "\\cyrchar\\CYRKSI": "\u046E",
    "\\cyrchar\\cyrksi": "\u046F",
    "\\cyrchar\\CYRPSI": "\u0470",
    "\\cyrchar\\cyrpsi": "\u0471",
    "\\cyrchar\\CYRFITA": "\u0472",
    "\\cyrchar\\CYRIZH": "\u0474",
    "\\cyrchar\\CYRUK": "\u0478",
    "\\cyrchar\\cyruk": "\u0479",
    "\\cyrchar\\CYROMEGARND": "\u047A",
    "\\cyrchar\\cyromegarnd": "\u047B",
    "\\cyrchar\\CYROMEGATITLO": "\u047C",
    "\\cyrchar\\cyromegatitlo": "\u047D",
    "\\cyrchar\\CYROT": "\u047E",
    "\\cyrchar\\cyrot": "\u047F",
    "\\cyrchar\\CYRKOPPA": "\u0480",
    "\\cyrchar\\cyrkoppa": "\u0481",
    "\\cyrchar\\cyrthousands": "\u0482",
    "\\cyrchar\\cyrhundredthousands": "\u0488",
    "\\cyrchar\\cyrmillions": "\u0489",
    "\\cyrchar\\CYRSEMISFTSN": "\u048C",
    "\\cyrchar\\cyrsemisftsn": "\u048D",
    "\\cyrchar\\CYRRTICK": "\u048E",
    "\\cyrchar\\cyrrtick": "\u048F",
    "\\cyrchar\\CYRGUP": "\u0490",
    "\\cyrchar\\cyrgup": "\u0491",
    "\\cyrchar\\CYRGHCRS": "\u0492",
    "\\cyrchar\\cyrghcrs": "\u0493",
    "\\cyrchar\\CYRGHK": "\u0494",
    "\\cyrchar\\cyrghk": "\u0495",
    "\\cyrchar\\CYRZHDSC": "\u0496",
    "\\cyrchar\\cyrzhdsc": "\u0497",
    "\\cyrchar\\CYRZDSC": "\u0498",
    "\\cyrchar\\cyrzdsc": "\u0499",
    "\\cyrchar\\CYRKDSC": "\u049A",
    "\\cyrchar\\cyrkdsc": "\u049B",
    "\\cyrchar\\CYRKVCRS": "\u049C",
    "\\cyrchar\\cyrkvcrs": "\u049D",
    "\\cyrchar\\CYRKHCRS": "\u049E",
    "\\cyrchar\\cyrkhcrs": "\u049F",
    "\\cyrchar\\CYRKBEAK": "\u04A0",
    "\\cyrchar\\cyrkbeak": "\u04A1",
    "\\cyrchar\\CYRNDSC": "\u04A2",
    "\\cyrchar\\cyrndsc": "\u04A3",
    "\\cyrchar\\CYRNG": "\u04A4",
    "\\cyrchar\\cyrng": "\u04A5",
    "\\cyrchar\\CYRPHK": "\u04A6",
    "\\cyrchar\\cyrphk": "\u04A7",
    "\\cyrchar\\CYRABHHA": "\u04A8",
    "\\cyrchar\\cyrabhha": "\u04A9",
    "\\cyrchar\\CYRSDSC": "\u04AA",
    "\\cyrchar\\cyrsdsc": "\u04AB",
    "\\cyrchar\\CYRTDSC": "\u04AC",
    "\\cyrchar\\cyrtdsc": "\u04AD",
    "\\cyrchar\\CYRY": "\u04AE",
    "\\cyrchar\\cyry": "\u04AF",
    "\\cyrchar\\CYRYHCRS": "\u04B0",
    "\\cyrchar\\cyryhcrs": "\u04B1",
    "\\cyrchar\\CYRHDSC": "\u04B2",
    "\\cyrchar\\cyrhdsc": "\u04B3",
    "\\cyrchar\\CYRTETSE": "\u04B4",
    "\\cyrchar\\cyrtetse": "\u04B5",
    "\\cyrchar\\CYRCHRDSC": "\u04B6",
    "\\cyrchar\\cyrchrdsc": "\u04B7",
    "\\cyrchar\\CYRCHVCRS": "\u04B8",
    "\\cyrchar\\cyrchvcrs": "\u04B9",
    "\\cyrchar\\CYRSHHA": "\u04BA",
    "\\cyrchar\\cyrshha": "\u04BB",
    "\\cyrchar\\CYRABHCH": "\u04BC",
    "\\cyrchar\\cyrabhch": "\u04BD",
    "\\cyrchar\\CYRABHCHDSC": "\u04BE",
    "\\cyrchar\\cyrabhchdsc": "\u04BF",
    "\\cyrchar\\CYRpalochka": "\u04C0",
    "\\cyrchar\\CYRKHK": "\u04C3",
    "\\cyrchar\\cyrkhk": "\u04C4",
    "\\cyrchar\\CYRNHK": "\u04C7",
    "\\cyrchar\\cyrnhk": "\u04C8",
    "\\cyrchar\\CYRCHLDSC": "\u04CB",
    "\\cyrchar\\cyrchldsc": "\u04CC",
    "\\cyrchar\\CYRAE": "\u04D4",
    "\\cyrchar\\cyrae": "\u04D5",
    "\\cyrchar\\CYRSCHWA": "\u04D8",
    "\\cyrchar\\cyrschwa": "\u04D9",
    "\\cyrchar\\CYRABHDZE": "\u04E0",
    "\\cyrchar\\cyrabhdze": "\u04E1",
    "\\cyrchar\\CYROTLD": "\u04E8",
    "\\cyrchar\\cyrotld": "\u04E9",
    "\\hspace{0.6em}": "\u2002",
    "\\hspace{1em}": "\u2003",
    "\\hspace{0.33em}": "\u2004",
    "\\hspace{0.25em}": "\u2005",
    "\\hspace{0.166em}": "\u2006",
    "\\hphantom{0}": "\u2007",
    "\u2008": "\\hphantom{,}",
    "\\hspace{0.167em}": "\u2009",
    "\u2009-0200A-0200A": "\\;",
    "\\mkern1mu": "\u200A",
    "\\textendash": "\u2013",
    "\\textemdash": "\u2014",
    "\\rule{1em}{1pt}": "\u2015",
    "\\Vert": "\u2016",
    "\\Elzreapos": "\u201B",
    "\\textquotedblleft": "\u201C",
    "\\textquotedblright": "\u201D",
    "\u201E": ",,",
    "\\textdagger": "\u2020",
    "\\textdaggerdbl": "\u2021",
    "\\textbullet": "\u2022",
    "..": "\u2025",
    "\\ldots": "\u2026",
    "\\textperthousand": "\u2030",
    "\\textpertenthousand": "\u2031",
    "{'}": "\u2032",
    "{''}": "\u2033",
    "{'''}": "\u2034",
    "\\backprime": "\u2035",
    "\\guilsinglleft": "\u2039",
    "\\guilsinglright": "\u203A",
    "''''": "\u2057",
    "\\mkern4mu": "\u205F",
    "\\nolinebreak": "\u2060",
    "\\ensuremath{\\Elzpes}": "\u20A7",
    "\\mbox{\\texteuro}": "\u20AC",
    "\\dddot": "\u20DB",
    "\\ddddot": "\u20DC",
    "\\mathbb{C}": "\u2102",
    "\\mathscr{g}": "\u210A",
    "\\mathscr{H}": "\u210B",
    "\\mathfrak{H}": "\u210C",
    "\\mathbb{H}": "\u210D",
    "\\hslash": "\u210F",
    "\\mathscr{I}": "\u2110",
    "\\mathfrak{I}": "\u2111",
    "\\mathscr{L}": "\u2112",
    "\\mathscr{l}": "\u2113",
    "\\mathbb{N}": "\u2115",
    "\\cyrchar\\textnumero": "\u2116",
    "\\wp": "\u2118",
    "\\mathbb{P}": "\u2119",
    "\\mathbb{Q}": "\u211A",
    "\\mathscr{R}": "\u211B",
    "\\mathfrak{R}": "\u211C",
    "\\mathbb{R}": "\u211D",
    "\\Elzxrat": "\u211E",
    "\\texttrademark": "\u2122",
    "\\mathbb{Z}": "\u2124",
    "\\Omega": "\u2126",
    "\\mho": "\u2127",
    "\\mathfrak{Z}": "\u2128",
    "\\ElsevierGlyph{2129}": "\u2129",
    "\\AA": "\u212B",
    "\\mathscr{B}": "\u212C",
    "\\mathfrak{C}": "\u212D",
    "\\mathscr{e}": "\u212F",
    "\\mathscr{E}": "\u2130",
    "\\mathscr{F}": "\u2131",
    "\\mathscr{M}": "\u2133",
    "\\mathscr{o}": "\u2134",
    "\\aleph": "\u2135",
    "\\beth": "\u2136",
    "\\gimel": "\u2137",
    "\\daleth": "\u2138",
    "\\textfrac{1}{3}": "\u2153",
    "\\textfrac{2}{3}": "\u2154",
    "\\textfrac{1}{5}": "\u2155",
    "\\textfrac{2}{5}": "\u2156",
    "\\textfrac{3}{5}": "\u2157",
    "\\textfrac{4}{5}": "\u2158",
    "\\textfrac{1}{6}": "\u2159",
    "\\textfrac{5}{6}": "\u215A",
    "\\textfrac{1}{8}": "\u215B",
    "\\textfrac{3}{8}": "\u215C",
    "\\textfrac{5}{8}": "\u215D",
    "\\textfrac{7}{8}": "\u215E",
    "\\leftarrow": "\u2190",
    "\\uparrow": "\u2191",
    "\\rightarrow": "\u2192",
    "\\downarrow": "\u2193",
    "\\leftrightarrow": "\u2194",
    "\\updownarrow": "\u2195",
    "\\nwarrow": "\u2196",
    "\\nearrow": "\u2197",
    "\\searrow": "\u2198",
    "\\swarrow": "\u2199",
    "\\nleftarrow": "\u219A",
    "\\nrightarrow": "\u219B",
    "\\arrowwaveright": "\u219C",
    "\\arrowwaveright": "\u219D",
    "\\twoheadleftarrow": "\u219E",
    "\\twoheadrightarrow": "\u21A0",
    "\\leftarrowtail": "\u21A2",
    "\\rightarrowtail": "\u21A3",
    "\\mapsto": "\u21A6",
    "\\hookleftarrow": "\u21A9",
    "\\hookrightarrow": "\u21AA",
    "\\looparrowleft": "\u21AB",
    "\\looparrowright": "\u21AC",
    "\\leftrightsquigarrow": "\u21AD",
    "\\nleftrightarrow": "\u21AE",
    "\\Lsh": "\u21B0",
    "\\Rsh": "\u21B1",
    "\\ElsevierGlyph{21B3}": "\u21B3",
    "\\curvearrowleft": "\u21B6",
    "\\curvearrowright": "\u21B7",
    "\\circlearrowleft": "\u21BA",
    "\\circlearrowright": "\u21BB",
    "\\leftharpoonup": "\u21BC",
    "\\leftharpoondown": "\u21BD",
    "\\upharpoonright": "\u21BE",
    "\\upharpoonleft": "\u21BF",
    "\\rightharpoonup": "\u21C0",
    "\\rightharpoondown": "\u21C1",
    "\\downharpoonright": "\u21C2",
    "\\downharpoonleft": "\u21C3",
    "\\rightleftarrows": "\u21C4",
    "\\dblarrowupdown": "\u21C5",
    "\\leftrightarrows": "\u21C6",
    "\\leftleftarrows": "\u21C7",
    "\\upuparrows": "\u21C8",
    "\\rightrightarrows": "\u21C9",
    "\\downdownarrows": "\u21CA",
    "\\leftrightharpoons": "\u21CB",
    "\\rightleftharpoons": "\u21CC",
    "\\nLeftarrow": "\u21CD",
    "\\nLeftrightarrow": "\u21CE",
    "\\nRightarrow": "\u21CF",
    "\\Leftarrow": "\u21D0",
    "\\Uparrow": "\u21D1",
    "\\Rightarrow": "\u21D2",
    "\\Downarrow": "\u21D3",
    "\\Leftrightarrow": "\u21D4",
    "\\Updownarrow": "\u21D5",
    "\\Lleftarrow": "\u21DA",
    "\\Rrightarrow": "\u21DB",
    "\\rightsquigarrow": "\u21DD",
    "\\DownArrowUpArrow": "\u21F5",
    "\\forall": "\u2200",
    "\\complement": "\u2201",
    "\\partial": "\u2202",
    "\\exists": "\u2203",
    "\\nexists": "\u2204",
    "\\varnothing": "\u2205",
    "\\nabla": "\u2207",
    "\\in": "\u2208",
    "\\not\\in": "\u2209",
    "\\ni": "\u220B",
    "\\not\\ni": "\u220C",
    "\\prod": "\u220F",
    "\\coprod": "\u2210",
    "\\sum": "\u2211",
    "\\mp": "\u2213",
    "\\dotplus": "\u2214",
    "\\setminus": "\u2216",
    "{_\\ast}": "\u2217",
    "\\circ": "\u2218",
    "\\bullet": "\u2219",
    "\\surd": "\u221A",
    "\\propto": "\u221D",
    "\\infty": "\u221E",
    "\\rightangle": "\u221F",
    "\\angle": "\u2220",
    "\\measuredangle": "\u2221",
    "\\sphericalangle": "\u2222",
    "\\mid": "\u2223",
    "\\nmid": "\u2224",
    "\\parallel": "\u2225",
    "\\nparallel": "\u2226",
    "\\wedge": "\u2227",
    "\\vee": "\u2228",
    "\\cap": "\u2229",
    "\\cup": "\u222A",
    "\\int": "\u222B",
    "\u222C": "\\int\\!\\int",
    "\u222D": "\\int\\!\\int\\!\\int",
    "\\oint": "\u222E",
    "\\surfintegral": "\u222F",
    "\\volintegral": "\u2230",
    "\\clwintegral": "\u2231",
    "\\ElsevierGlyph{2232}": "\u2232",
    "\\ElsevierGlyph{2233}": "\u2233",
    "\\therefore": "\u2234",
    "\\because": "\u2235",
    "\\Colon": "\u2237",
    "\\ElsevierGlyph{2238}": "\u2238",
    "\u223A": "\\mathbin{{:}\\!\\!{-}\\!\\!{:}}",
    "\\homothetic": "\u223B",
    "\\sim": "\u223C",
    "\\backsim": "\u223D",
    "\\lazysinv": "\u223E",
    "\\wr": "\u2240",
    "\\not\\sim": "\u2241",
    "\\ElsevierGlyph{2242}": "\u2242",
    "\u2242-00338": "\\NotEqualTilde",
    "\\simeq": "\u2243",
    "\\not\\simeq": "\u2244",
    "\\cong": "\u2245",
    "\\approxnotequal": "\u2246",
    "\\not\\cong": "\u2247",
    "\\approx": "\u2248",
    "\\not\\approx": "\u2249",
    "\\approxeq": "\u224A",
    "\\tildetrpl": "\u224B",
    "\u224B-00338": "\\not\\apid",
    "\\allequal": "\u224C",
    "\\asymp": "\u224D",
    "\\Bumpeq": "\u224E",
    "\u224E-00338": "\\NotHumpDownHump",
    "\\bumpeq": "\u224F",
    "\u224F-00338": "\\NotHumpEqual",
    "\\doteq": "\u2250",
    "\u2250-00338": "\\not\\doteq",
    "\\doteqdot": "\u2251",
    "\\fallingdotseq": "\u2252",
    "\\risingdotseq": "\u2253",
    "\u2254": ":=",
    "\u2255": "=:",
    "\\eqcirc": "\u2256",
    "\\circeq": "\u2257",
    "\\estimates": "\u2259",
    "\\ElsevierGlyph{225A}": "\u225A",
    "\\starequal": "\u225B",
    "\\triangleq": "\u225C",
    "\\ElsevierGlyph{225F}": "\u225F",
    "\\not=": "\u2260",
    "\\equiv": "\u2261",
    "\\not\\equiv": "\u2262",
    "\\leq": "\u2264",
    "\\geq": "\u2265",
    "\\leqq": "\u2266",
    "\\geqq": "\u2267",
    "\\lneqq": "\u2268",
    "\u2268-0FE00": "\\lvertneqq",
    "\\gneqq": "\u2269",
    "\u2269-0FE00": "\\gvertneqq",
    "\\ll": "\u226A",
    "\u226A-00338": "\\NotLessLess",
    "\\gg": "\u226B",
    "\u226B-00338": "\\NotGreaterGreater",
    "\\between": "\u226C",
    "\u226D": "\\not\\kern-0.3em\\times",
    "\u226E": "\\not&lt;",
    "\u226F": "\\not&gt;",
    "\\not\\leq": "\u2270",
    "\\not\\geq": "\u2271",
    "\\lessequivlnt": "\u2272",
    "\\greaterequivlnt": "\u2273",
    "\\ElsevierGlyph{2274}": "\u2274",
    "\\ElsevierGlyph{2275}": "\u2275",
    "\\lessgtr": "\u2276",
    "\\gtrless": "\u2277",
    "\\notlessgreater": "\u2278",
    "\\notgreaterless": "\u2279",
    "\\prec": "\u227A",
    "\\succ": "\u227B",
    "\\preccurlyeq": "\u227C",
    "\\succcurlyeq": "\u227D",
    "\\precapprox": "\u227E",
    "\u227E-00338": "\\NotPrecedesTilde",
    "\\succapprox": "\u227F",
    "\u227F-00338": "\\NotSucceedsTilde",
    "\\not\\prec": "\u2280",
    "\\not\\succ": "\u2281",
    "\\subset": "\u2282",
    "\\supset": "\u2283",
    "\\not\\subset": "\u2284",
    "\\not\\supset": "\u2285",
    "\\subseteq": "\u2286",
    "\\supseteq": "\u2287",
    "\\not\\subseteq": "\u2288",
    "\\not\\supseteq": "\u2289",
    "\\subsetneq": "\u228A",
    "\u228A-0FE00": "\\varsubsetneqq",
    "\\supsetneq": "\u228B",
    "\u228B-0FE00": "\\varsupsetneq",
    "\\uplus": "\u228E",
    "\\sqsubset": "\u228F",
    "\u228F-00338": "\\NotSquareSubset",
    "\\sqsupset": "\u2290",
    "\u2290-00338": "\\NotSquareSuperset",
    "\\sqsubseteq": "\u2291",
    "\\sqsupseteq": "\u2292",
    "\\sqcap": "\u2293",
    "\\sqcup": "\u2294",
    "\\oplus": "\u2295",
    "\\ominus": "\u2296",
    "\\otimes": "\u2297",
    "\\oslash": "\u2298",
    "\\odot": "\u2299",
    "\\circledcirc": "\u229A",
    "\\circledast": "\u229B",
    "\\circleddash": "\u229D",
    "\\boxplus": "\u229E",
    "\\boxminus": "\u229F",
    "\\boxtimes": "\u22A0",
    "\\boxdot": "\u22A1",
    "\\vdash": "\u22A2",
    "\\dashv": "\u22A3",
    "\\top": "\u22A4",
    "\\perp": "\u22A5",
    "\\truestate": "\u22A7",
    "\\forcesextra": "\u22A8",
    "\\Vdash": "\u22A9",
    "\\Vvdash": "\u22AA",
    "\\VDash": "\u22AB",
    "\\nvdash": "\u22AC",
    "\\nvDash": "\u22AD",
    "\\nVdash": "\u22AE",
    "\\nVDash": "\u22AF",
    "\\vartriangleleft": "\u22B2",
    "\\vartriangleright": "\u22B3",
    "\\trianglelefteq": "\u22B4",
    "\\trianglerighteq": "\u22B5",
    "\\original": "\u22B6",
    "\\image": "\u22B7",
    "\\multimap": "\u22B8",
    "\\hermitconjmatrix": "\u22B9",
    "\\intercal": "\u22BA",
    "\\veebar": "\u22BB",
    "\\rightanglearc": "\u22BE",
    "\\ElsevierGlyph{22C0}": "\u22C0",
    "\\ElsevierGlyph{22C1}": "\u22C1",
    "\\bigcap": "\u22C2",
    "\\bigcup": "\u22C3",
    "\\diamond": "\u22C4",
    "\\cdot": "\u22C5",
    "\\star": "\u22C6",
    "\\divideontimes": "\u22C7",
    "\\bowtie": "\u22C8",
    "\\ltimes": "\u22C9",
    "\\rtimes": "\u22CA",
    "\\leftthreetimes": "\u22CB",
    "\\rightthreetimes": "\u22CC",
    "\\backsimeq": "\u22CD",
    "\\curlyvee": "\u22CE",
    "\\curlywedge": "\u22CF",
    "\\Subset": "\u22D0",
    "\\Supset": "\u22D1",
    "\\Cap": "\u22D2",
    "\\Cup": "\u22D3",
    "\\pitchfork": "\u22D4",
    "\\lessdot": "\u22D6",
    "\\gtrdot": "\u22D7",
    "\\verymuchless": "\u22D8",
    "\\verymuchgreater": "\u22D9",
    "\\lesseqgtr": "\u22DA",
    "\\gtreqless": "\u22DB",
    "\\curlyeqprec": "\u22DE",
    "\\curlyeqsucc": "\u22DF",
    "\\not\\sqsubseteq": "\u22E2",
    "\\not\\sqsupseteq": "\u22E3",
    "\\Elzsqspne": "\u22E5",
    "\\lnsim": "\u22E6",
    "\\gnsim": "\u22E7",
    "\\precedesnotsimilar": "\u22E8",
    "\\succnsim": "\u22E9",
    "\\ntriangleleft": "\u22EA",
    "\\ntriangleright": "\u22EB",
    "\\ntrianglelefteq": "\u22EC",
    "\\ntrianglerighteq": "\u22ED",
    "\\vdots": "\u22EE",
    "\\cdots": "\u22EF",
    "\\upslopeellipsis": "\u22F0",
    "\\downslopeellipsis": "\u22F1",
    "\\barwedge": "\u2305",
    "\\perspcorrespond": "\u2306",
    "\\lceil": "\u2308",
    "\\rceil": "\u2309",
    "\\lfloor": "\u230A",
    "\\rfloor": "\u230B",
    "\\recorder": "\u2315",
    "\\mathchar\"\u2316": "2208",
    "\\ulcorner": "\u231C",
    "\\urcorner": "\u231D",
    "\\llcorner": "\u231E",
    "\\lrcorner": "\u231F",
    "\\frown": "\u2322",
    "\\smile": "\u2323",
    "\\langle": "\u2329",
    "\\rangle": "\u232A",
    "\\ElsevierGlyph{E838}": "\u233D",
    "\\Elzdlcorn": "\u23A3",
    "\\lmoustache": "\u23B0",
    "\\rmoustache": "\u23B1",
    "\\textvisiblespace": "\u2423",
    "\\ding{172}": "\u2460",
    "\\ding{173}": "\u2461",
    "\\ding{174}": "\u2462",
    "\\ding{175}": "\u2463",
    "\\ding{176}": "\u2464",
    "\\ding{177}": "\u2465",
    "\\ding{178}": "\u2466",
    "\\ding{179}": "\u2467",
    "\\ding{180}": "\u2468",
    "\\ding{181}": "\u2469",
    "\\circledS": "\u24C8",
    "\\Elzdshfnc": "\u2506",
    "\\Elzsqfnw": "\u2519",
    "\\diagup": "\u2571",
    "\\ding{110}": "\u25A0",
    "\\square": "\u25A1",
    "\\blacksquare": "\u25AA",
    "\\fbox{~~}": "\u25AD",
    "\\Elzvrecto": "\u25AF",
    "\\ElsevierGlyph{E381}": "\u25B1",
    "\\ding{115}": "\u25B2",
    "\\bigtriangleup": "\u25B3",
    "\\blacktriangle": "\u25B4",
    "\\vartriangle": "\u25B5",
    "\\blacktriangleright": "\u25B8",
    "\\triangleright": "\u25B9",
    "\\ding{116}": "\u25BC",
    "\\bigtriangledown": "\u25BD",
    "\\blacktriangledown": "\u25BE",
    "\\triangledown": "\u25BF",
    "\\blacktriangleleft": "\u25C2",
    "\\triangleleft": "\u25C3",
    "\\ding{117}": "\u25C6",
    "\\lozenge": "\u25CA",
    "\\bigcirc": "\u25CB",
    "\\ding{108}": "\u25CF",
    "\\Elzcirfl": "\u25D0",
    "\\Elzcirfr": "\u25D1",
    "\\Elzcirfb": "\u25D2",
    "\\ding{119}": "\u25D7",
    "\\Elzrvbull": "\u25D8",
    "\\Elzsqfl": "\u25E7",
    "\\Elzsqfr": "\u25E8",
    "\\Elzsqfse": "\u25EA",
    "\\bigcirc": "\u25EF",
    "\\ding{72}": "\u2605",
    "\\ding{73}": "\u2606",
    "\\ding{37}": "\u260E",
    "\\ding{42}": "\u261B",
    "\\ding{43}": "\u261E",
    "\\rightmoon": "\u263E",
    "\\mercury": "\u263F",
    "\\venus": "\u2640",
    "\\male": "\u2642",
    "\\jupiter": "\u2643",
    "\\saturn": "\u2644",
    "\\uranus": "\u2645",
    "\\neptune": "\u2646",
    "\\pluto": "\u2647",
    "\\aries": "\u2648",
    "\\taurus": "\u2649",
    "\\gemini": "\u264A",
    "\\cancer": "\u264B",
    "\\leo": "\u264C",
    "\\virgo": "\u264D",
    "\\libra": "\u264E",
    "\\scorpio": "\u264F",
    "\\sagittarius": "\u2650",
    "\\capricornus": "\u2651",
    "\\aquarius": "\u2652",
    "\\pisces": "\u2653",
    "\\ding{171}": "\u2660",
    "\\diamond": "\u2662",
    "\\ding{168}": "\u2663",
    "\\ding{170}": "\u2665",
    "\\ding{169}": "\u2666",
    "\\quarternote": "\u2669",
    "\\eighthnote": "\u266A",
    "\\flat": "\u266D",
    "\\natural": "\u266E",
    "\\sharp": "\u266F",
    "\\ding{33}": "\u2701",
    "\\ding{34}": "\u2702",
    "\\ding{35}": "\u2703",
    "\\ding{36}": "\u2704",
    "\\ding{38}": "\u2706",
    "\\ding{39}": "\u2707",
    "\\ding{40}": "\u2708",
    "\\ding{41}": "\u2709",
    "\\ding{44}": "\u270C",
    "\\ding{45}": "\u270D",
    "\\ding{46}": "\u270E",
    "\\ding{47}": "\u270F",
    "\\ding{48}": "\u2710",
    "\\ding{49}": "\u2711",
    "\\ding{50}": "\u2712",
    "\\ding{51}": "\u2713",
    "\\ding{52}": "\u2714",
    "\\ding{53}": "\u2715",
    "\\ding{54}": "\u2716",
    "\\ding{55}": "\u2717",
    "\\ding{56}": "\u2718",
    "\\ding{57}": "\u2719",
    "\\ding{58}": "\u271A",
    "\\ding{59}": "\u271B",
    "\\ding{60}": "\u271C",
    "\\ding{61}": "\u271D",
    "\\ding{62}": "\u271E",
    "\\ding{63}": "\u271F",
    "\\ding{64}": "\u2720",
    "\\ding{65}": "\u2721",
    "\\ding{66}": "\u2722",
    "\\ding{67}": "\u2723",
    "\\ding{68}": "\u2724",
    "\\ding{69}": "\u2725",
    "\\ding{70}": "\u2726",
    "\\ding{71}": "\u2727",
    "\\ding{73}": "\u2729",
    "\\ding{74}": "\u272A",
    "\\ding{75}": "\u272B",
    "\\ding{76}": "\u272C",
    "\\ding{77}": "\u272D",
    "\\ding{78}": "\u272E",
    "\\ding{79}": "\u272F",
    "\\ding{80}": "\u2730",
    "\\ding{81}": "\u2731",
    "\\ding{82}": "\u2732",
    "\\ding{83}": "\u2733",
    "\\ding{84}": "\u2734",
    "\\ding{85}": "\u2735",
    "\\ding{86}": "\u2736",
    "\\ding{87}": "\u2737",
    "\\ding{88}": "\u2738",
    "\\ding{89}": "\u2739",
    "\\ding{90}": "\u273A",
    "\\ding{91}": "\u273B",
    "\\ding{92}": "\u273C",
    "\\ding{93}": "\u273D",
    "\\ding{94}": "\u273E",
    "\\ding{95}": "\u273F",
    "\\ding{96}": "\u2740",
    "\\ding{97}": "\u2741",
    "\\ding{98}": "\u2742",
    "\\ding{99}": "\u2743",
    "\\ding{100}": "\u2744",
    "\\ding{101}": "\u2745",
    "\\ding{102}": "\u2746",
    "\\ding{103}": "\u2747",
    "\\ding{104}": "\u2748",
    "\\ding{105}": "\u2749",
    "\\ding{106}": "\u274A",
    "\\ding{107}": "\u274B",
    "\\ding{109}": "\u274D",
    "\\ding{111}": "\u274F",
    "\\ding{112}": "\u2750",
    "\\ding{113}": "\u2751",
    "\\ding{114}": "\u2752",
    "\\ding{118}": "\u2756",
    "\\ding{120}": "\u2758",
    "\\ding{121}": "\u2759",
    "\\ding{122}": "\u275A",
    "\\ding{123}": "\u275B",
    "\\ding{124}": "\u275C",
    "\\ding{125}": "\u275D",
    "\\ding{126}": "\u275E",
    "\\ding{161}": "\u2761",
    "\\ding{162}": "\u2762",
    "\\ding{163}": "\u2763",
    "\\ding{164}": "\u2764",
    "\\ding{165}": "\u2765",
    "\\ding{166}": "\u2766",
    "\\ding{167}": "\u2767",
    "\\ding{182}": "\u2776",
    "\\ding{183}": "\u2777",
    "\\ding{184}": "\u2778",
    "\\ding{185}": "\u2779",
    "\\ding{186}": "\u277A",
    "\\ding{187}": "\u277B",
    "\\ding{188}": "\u277C",
    "\\ding{189}": "\u277D",
    "\\ding{190}": "\u277E",
    "\\ding{191}": "\u277F",
    "\\ding{192}": "\u2780",
    "\\ding{193}": "\u2781",
    "\\ding{194}": "\u2782",
    "\\ding{195}": "\u2783",
    "\\ding{196}": "\u2784",
    "\\ding{197}": "\u2785",
    "\\ding{198}": "\u2786",
    "\\ding{199}": "\u2787",
    "\\ding{200}": "\u2788",
    "\\ding{201}": "\u2789",
    "\\ding{202}": "\u278A",
    "\\ding{203}": "\u278B",
    "\\ding{204}": "\u278C",
    "\\ding{205}": "\u278D",
    "\\ding{206}": "\u278E",
    "\\ding{207}": "\u278F",
    "\\ding{208}": "\u2790",
    "\\ding{209}": "\u2791",
    "\\ding{210}": "\u2792",
    "\\ding{211}": "\u2793",
    "\\ding{212}": "\u2794",
    "\\ding{216}": "\u2798",
    "\\ding{217}": "\u2799",
    "\\ding{218}": "\u279A",
    "\\ding{219}": "\u279B",
    "\\ding{220}": "\u279C",
    "\\ding{221}": "\u279D",
    "\\ding{222}": "\u279E",
    "\\ding{223}": "\u279F",
    "\\ding{224}": "\u27A0",
    "\\ding{225}": "\u27A1",
    "\\ding{226}": "\u27A2",
    "\\ding{227}": "\u27A3",
    "\\ding{228}": "\u27A4",
    "\\ding{229}": "\u27A5",
    "\\ding{230}": "\u27A6",
    "\\ding{231}": "\u27A7",
    "\\ding{232}": "\u27A8",
    "\\ding{233}": "\u27A9",
    "\\ding{234}": "\u27AA",
    "\\ding{235}": "\u27AB",
    "\\ding{236}": "\u27AC",
    "\\ding{237}": "\u27AD",
    "\\ding{238}": "\u27AE",
    "\\ding{239}": "\u27AF",
    "\\ding{241}": "\u27B1",
    "\\ding{242}": "\u27B2",
    "\\ding{243}": "\u27B3",
    "\\ding{244}": "\u27B4",
    "\\ding{245}": "\u27B5",
    "\\ding{246}": "\u27B6",
    "\\ding{247}": "\u27B7",
    "\\ding{248}": "\u27B8",
    "\\ding{249}": "\u27B9",
    "\\ding{250}": "\u27BA",
    "\\ding{251}": "\u27BB",
    "\\ding{252}": "\u27BC",
    "\\ding{253}": "\u27BD",
    "\\ding{254}": "\u27BE",
    "\\longleftarrow": "\u27F5",
    "\\longrightarrow": "\u27F6",
    "\\longleftrightarrow": "\u27F7",
    "\\Longleftarrow": "\u27F8",
    "\\Longrightarrow": "\u27F9",
    "\\Longleftrightarrow": "\u27FA",
    "\\longmapsto": "\u27FC",
    "\\sim\\joinrel\\leadsto": "\u27FF",
    "\\ElsevierGlyph{E212}": "\u2905",
    "\\UpArrowBar": "\u2912",
    "\\DownArrowBar": "\u2913",
    "\\ElsevierGlyph{E20C}": "\u2923",
    "\\ElsevierGlyph{E20D}": "\u2924",
    "\\ElsevierGlyph{E20B}": "\u2925",
    "\\ElsevierGlyph{E20A}": "\u2926",
    "\\ElsevierGlyph{E211}": "\u2927",
    "\\ElsevierGlyph{E20E}": "\u2928",
    "\\ElsevierGlyph{E20F}": "\u2929",
    "\\ElsevierGlyph{E210}": "\u292A",
    "\\ElsevierGlyph{E21C}": "\u2933",
    "\u2933-00338": "\\ElsevierGlyph{E21D}",
    "\\ElsevierGlyph{E21A}": "\u2936",
    "\\ElsevierGlyph{E219}": "\u2937",
    "\\Elolarr": "\u2940",
    "\\Elorarr": "\u2941",
    "\\ElzRlarr": "\u2942",
    "\\ElzrLarr": "\u2944",
    "\\Elzrarrx": "\u2947",
    "\\LeftRightVector": "\u294E",
    "\\RightUpDownVector": "\u294F",
    "\\DownLeftRightVector": "\u2950",
    "\\LeftUpDownVector": "\u2951",
    "\\LeftVectorBar": "\u2952",
    "\\RightVectorBar": "\u2953",
    "\\RightUpVectorBar": "\u2954",
    "\\RightDownVectorBar": "\u2955",
    "\\DownLeftVectorBar": "\u2956",
    "\\DownRightVectorBar": "\u2957",
    "\\LeftUpVectorBar": "\u2958",
    "\\LeftDownVectorBar": "\u2959",
    "\\LeftTeeVector": "\u295A",
    "\\RightTeeVector": "\u295B",
    "\\RightUpTeeVector": "\u295C",
    "\\RightDownTeeVector": "\u295D",
    "\\DownLeftTeeVector": "\u295E",
    "\\DownRightTeeVector": "\u295F",
    "\\LeftUpTeeVector": "\u2960",
    "\\LeftDownTeeVector": "\u2961",
    "\\UpEquilibrium": "\u296E",
    "\\ReverseUpEquilibrium": "\u296F",
    "\\RoundImplies": "\u2970",
    "\\ElsevierGlyph{E214}": "\u297C",
    "\\ElsevierGlyph{E215}": "\u297D",
    "\\Elztfnc": "\u2980",
    "\\ElsevierGlyph{3018}": "\u2985",
    "\\Elroang": "\u2986",
    "\u2993": "&lt;\\kern-0.58em(",
    "\\ElsevierGlyph{E291}": "\u2994",
    "\\Elzddfnc": "\u2999",
    "\\Angle": "\u299C",
    "\\Elzlpargt": "\u29A0",
    "\\ElsevierGlyph{E260}": "\u29B5",
    "\\ElsevierGlyph{E61B}": "\u29B6",
    "\\ElzLap": "\u29CA",
    "\\Elzdefas": "\u29CB",
    "\\LeftTriangleBar": "\u29CF",
    "\u29CF-00338": "\\NotLeftTriangleBar",
    "\\RightTriangleBar": "\u29D0",
    "\u29D0-00338": "\\NotRightTriangleBar",
    "\\ElsevierGlyph{E372}": "\u29DC",
    "\\blacklozenge": "\u29EB",
    "\\RuleDelayed": "\u29F4",
    "\\Elxuplus": "\u2A04",
    "\\ElzThr": "\u2A05",
    "\\Elxsqcup": "\u2A06",
    "\\ElzInf": "\u2A07",
    "\\ElzSup": "\u2A08",
    "\\ElzCint": "\u2A0D",
    "\\clockoint": "\u2A0F",
    "\\ElsevierGlyph{E395}": "\u2A10",
    "\\sqrint": "\u2A16",
    "\\ElsevierGlyph{E25A}": "\u2A25",
    "\\ElsevierGlyph{E25B}": "\u2A2A",
    "\\ElsevierGlyph{E25C}": "\u2A2D",
    "\\ElsevierGlyph{E25D}": "\u2A2E",
    "\\ElzTimes": "\u2A2F",
    "\\ElsevierGlyph{E25E}": "\u2A34",
    "\\ElsevierGlyph{E25E}": "\u2A35",
    "\\ElsevierGlyph{E259}": "\u2A3C",
    "\\amalg": "\u2A3F",
    "\\ElzAnd": "\u2A53",
    "\\ElzOr": "\u2A54",
    "\\ElsevierGlyph{E36E}": "\u2A55",
    "\\ElOr": "\u2A56",
    "\\perspcorrespond": "\u2A5E",
    "\\Elzminhat": "\u2A5F",
    "\\ElsevierGlyph{225A}": "\u2A63",
    "\u2A6E": "\\stackrel{*}{=}",
    "\\Equal": "\u2A75",
    "\\leqslant": "\u2A7D",
    "\u2A7D-00338": "\\nleqslant",
    "\\geqslant": "\u2A7E",
    "\u2A7E-00338": "\\ngeqslant",
    "\\lessapprox": "\u2A85",
    "\\gtrapprox": "\u2A86",
    "\\lneq": "\u2A87",
    "\\gneq": "\u2A88",
    "\\lnapprox": "\u2A89",
    "\\gnapprox": "\u2A8A",
    "\\lesseqqgtr": "\u2A8B",
    "\\gtreqqless": "\u2A8C",
    "\\eqslantless": "\u2A95",
    "\\eqslantgtr": "\u2A96",
    "\\Pisymbol{ppi020}{117}": "\u2A9D",
    "\\Pisymbol{ppi020}{105}": "\u2A9E",
    "\\NestedLessLess": "\u2AA1",
    "\u2AA1-00338": "\\NotNestedLessLess",
    "\\NestedGreaterGreater": "\u2AA2",
    "\u2AA2-00338": "\\NotNestedGreaterGreater",
    "\\preceq": "\u2AAF",
    "\u2AAF-00338": "\\not\\preceq",
    "\\succeq": "\u2AB0",
    "\u2AB0-00338": "\\not\\succeq",
    "\\precneqq": "\u2AB5",
    "\\succneqq": "\u2AB6",
    "\\precapprox": "\u2AB7",
    "\\succapprox": "\u2AB8",
    "\\precnapprox": "\u2AB9",
    "\\succnapprox": "\u2ABA",
    "\\subseteqq": "\u2AC5",
    "\u2AC5-00338": "\\nsubseteqq",
    "\\supseteqq": "\u2AC6",
    "\u2AC6-00338": "\\nsupseteqq",
    "\\subsetneqq": "\u2ACB",
    "\\supsetneqq": "\u2ACC",
    "\\ElsevierGlyph{E30D}": "\u2AEB",
    "\\Elztdcol": "\u2AF6",
    "\u2AFD": "{{/}\\!\\!{/}}",
    "\u2AFD-020E5": "{\\rlap{\\textbackslash}{{/}\\!\\!{/}}}",
    "\\ElsevierGlyph{300A}": "\u300A",
    "\\ElsevierGlyph{300B}": "\u300B",
    "\\ElsevierGlyph{3018}": "\u3018",
    "\\ElsevierGlyph{3019}": "\u3019",
    "\\openbracketleft": "\u301A",
    "\\openbracketright": "\u301B",
    "\\mathbf{A}": "\uD400",
    "\\mathbf{B}": "\uD401",
    "\\mathbf{C}": "\uD402",
    "\\mathbf{D}": "\uD403",
    "\\mathbf{E}": "\uD404",
    "\\mathbf{F}": "\uD405",
    "\\mathbf{G}": "\uD406",
    "\\mathbf{H}": "\uD407",
    "\\mathbf{I}": "\uD408",
    "\\mathbf{J}": "\uD409",
    "\\mathbf{K}": "\uD40A",
    "\\mathbf{L}": "\uD40B",
    "\\mathbf{M}": "\uD40C",
    "\\mathbf{N}": "\uD40D",
    "\\mathbf{O}": "\uD40E",
    "\\mathbf{P}": "\uD40F",
    "\\mathbf{Q}": "\uD410",
    "\\mathbf{R}": "\uD411",
    "\\mathbf{S}": "\uD412",
    "\\mathbf{T}": "\uD413",
    "\\mathbf{U}": "\uD414",
    "\\mathbf{V}": "\uD415",
    "\\mathbf{W}": "\uD416",
    "\\mathbf{X}": "\uD417",
    "\\mathbf{Y}": "\uD418",
    "\\mathbf{Z}": "\uD419",
    "\\mathbf{a}": "\uD41A",
    "\\mathbf{b}": "\uD41B",
    "\\mathbf{c}": "\uD41C",
    "\\mathbf{d}": "\uD41D",
    "\\mathbf{e}": "\uD41E",
    "\\mathbf{f}": "\uD41F",
    "\\mathbf{g}": "\uD420",
    "\\mathbf{h}": "\uD421",
    "\\mathbf{i}": "\uD422",
    "\\mathbf{j}": "\uD423",
    "\\mathbf{k}": "\uD424",
    "\\mathbf{l}": "\uD425",
    "\\mathbf{m}": "\uD426",
    "\\mathbf{n}": "\uD427",
    "\\mathbf{o}": "\uD428",
    "\\mathbf{p}": "\uD429",
    "\\mathbf{q}": "\uD42A",
    "\\mathbf{r}": "\uD42B",
    "\\mathbf{s}": "\uD42C",
    "\\mathbf{t}": "\uD42D",
    "\\mathbf{u}": "\uD42E",
    "\\mathbf{v}": "\uD42F",
    "\\mathbf{w}": "\uD430",
    "\\mathbf{x}": "\uD431",
    "\\mathbf{y}": "\uD432",
    "\\mathbf{z}": "\uD433",
    "\\mathsl{A}": "\uD434",
    "\\mathsl{B}": "\uD435",
    "\\mathsl{C}": "\uD436",
    "\\mathsl{D}": "\uD437",
    "\\mathsl{E}": "\uD438",
    "\\mathsl{F}": "\uD439",
    "\\mathsl{G}": "\uD43A",
    "\\mathsl{H}": "\uD43B",
    "\\mathsl{I}": "\uD43C",
    "\\mathsl{J}": "\uD43D",
    "\\mathsl{K}": "\uD43E",
    "\\mathsl{L}": "\uD43F",
    "\\mathsl{M}": "\uD440",
    "\\mathsl{N}": "\uD441",
    "\\mathsl{O}": "\uD442",
    "\\mathsl{P}": "\uD443",
    "\\mathsl{Q}": "\uD444",
    "\\mathsl{R}": "\uD445",
    "\\mathsl{S}": "\uD446",
    "\\mathsl{T}": "\uD447",
    "\\mathsl{U}": "\uD448",
    "\\mathsl{V}": "\uD449",
    "\\mathsl{W}": "\uD44A",
    "\\mathsl{X}": "\uD44B",
    "\\mathsl{Y}": "\uD44C",
    "\\mathsl{Z}": "\uD44D",
    "\\mathsl{a}": "\uD44E",
    "\\mathsl{b}": "\uD44F",
    "\\mathsl{c}": "\uD450",
    "\\mathsl{d}": "\uD451",
    "\\mathsl{e}": "\uD452",
    "\\mathsl{f}": "\uD453",
    "\\mathsl{g}": "\uD454",
    "\\mathsl{i}": "\uD456",
    "\\mathsl{j}": "\uD457",
    "\\mathsl{k}": "\uD458",
    "\\mathsl{l}": "\uD459",
    "\\mathsl{m}": "\uD45A",
    "\\mathsl{n}": "\uD45B",
    "\\mathsl{o}": "\uD45C",
    "\\mathsl{p}": "\uD45D",
    "\\mathsl{q}": "\uD45E",
    "\\mathsl{r}": "\uD45F",
    "\\mathsl{s}": "\uD460",
    "\\mathsl{t}": "\uD461",
    "\\mathsl{u}": "\uD462",
    "\\mathsl{v}": "\uD463",
    "\\mathsl{w}": "\uD464",
    "\\mathsl{x}": "\uD465",
    "\\mathsl{y}": "\uD466",
    "\\mathsl{z}": "\uD467",
    "\\mathbit{A}": "\uD468",
    "\\mathbit{B}": "\uD469",
    "\\mathbit{C}": "\uD46A",
    "\\mathbit{D}": "\uD46B",
    "\\mathbit{E}": "\uD46C",
    "\\mathbit{F}": "\uD46D",
    "\\mathbit{G}": "\uD46E",
    "\\mathbit{H}": "\uD46F",
    "\\mathbit{I}": "\uD470",
    "\\mathbit{J}": "\uD471",
    "\\mathbit{K}": "\uD472",
    "\\mathbit{L}": "\uD473",
    "\\mathbit{M}": "\uD474",
    "\\mathbit{N}": "\uD475",
    "\\mathbit{O}": "\uD476",
    "\\mathbit{P}": "\uD477",
    "\\mathbit{Q}": "\uD478",
    "\\mathbit{R}": "\uD479",
    "\\mathbit{S}": "\uD47A",
    "\\mathbit{T}": "\uD47B",
    "\\mathbit{U}": "\uD47C",
    "\\mathbit{V}": "\uD47D",
    "\\mathbit{W}": "\uD47E",
    "\\mathbit{X}": "\uD47F",
    "\\mathbit{Y}": "\uD480",
    "\\mathbit{Z}": "\uD481",
    "\\mathbit{a}": "\uD482",
    "\\mathbit{b}": "\uD483",
    "\\mathbit{c}": "\uD484",
    "\\mathbit{d}": "\uD485",
    "\\mathbit{e}": "\uD486",
    "\\mathbit{f}": "\uD487",
    "\\mathbit{g}": "\uD488",
    "\\mathbit{h}": "\uD489",
    "\\mathbit{i}": "\uD48A",
    "\\mathbit{j}": "\uD48B",
    "\\mathbit{k}": "\uD48C",
    "\\mathbit{l}": "\uD48D",
    "\\mathbit{m}": "\uD48E",
    "\\mathbit{n}": "\uD48F",
    "\\mathbit{o}": "\uD490",
    "\\mathbit{p}": "\uD491",
    "\\mathbit{q}": "\uD492",
    "\\mathbit{r}": "\uD493",
    "\\mathbit{s}": "\uD494",
    "\\mathbit{t}": "\uD495",
    "\\mathbit{u}": "\uD496",
    "\\mathbit{v}": "\uD497",
    "\\mathbit{w}": "\uD498",
    "\\mathbit{x}": "\uD499",
    "\\mathbit{y}": "\uD49A",
    "\\mathbit{z}": "\uD49B",
    "\\mathscr{A}": "\uD49C",
    "\\mathscr{C}": "\uD49E",
    "\\mathscr{D}": "\uD49F",
    "\\mathscr{G}": "\uD4A2",
    "\\mathscr{J}": "\uD4A5",
    "\\mathscr{K}": "\uD4A6",
    "\\mathscr{N}": "\uD4A9",
    "\\mathscr{O}": "\uD4AA",
    "\\mathscr{P}": "\uD4AB",
    "\\mathscr{Q}": "\uD4AC",
    "\\mathscr{S}": "\uD4AE",
    "\\mathscr{T}": "\uD4AF",
    "\\mathscr{U}": "\uD4B0",
    "\\mathscr{V}": "\uD4B1",
    "\\mathscr{W}": "\uD4B2",
    "\\mathscr{X}": "\uD4B3",
    "\\mathscr{Y}": "\uD4B4",
    "\\mathscr{Z}": "\uD4B5",
    "\\mathscr{a}": "\uD4B6",
    "\\mathscr{b}": "\uD4B7",
    "\\mathscr{c}": "\uD4B8",
    "\\mathscr{d}": "\uD4B9",
    "\\mathscr{f}": "\uD4BB",
    "\\mathscr{h}": "\uD4BD",
    "\\mathscr{i}": "\uD4BE",
    "\\mathscr{j}": "\uD4BF",
    "\\mathscr{k}": "\uD4C0",
    "\\mathscr{l}": "\uD4C1",
    "\\mathscr{m}": "\uD4C2",
    "\\mathscr{n}": "\uD4C3",
    "\\mathscr{p}": "\uD4C5",
    "\\mathscr{q}": "\uD4C6",
    "\\mathscr{r}": "\uD4C7",
    "\\mathscr{s}": "\uD4C8",
    "\\mathscr{t}": "\uD4C9",
    "\\mathscr{u}": "\uD4CA",
    "\\mathscr{v}": "\uD4CB",
    "\\mathscr{w}": "\uD4CC",
    "\\mathscr{x}": "\uD4CD",
    "\\mathscr{y}": "\uD4CE",
    "\\mathscr{z}": "\uD4CF",
    "\\mathmit{A}": "\uD4D0",
    "\\mathmit{B}": "\uD4D1",
    "\\mathmit{C}": "\uD4D2",
    "\\mathmit{D}": "\uD4D3",
    "\\mathmit{E}": "\uD4D4",
    "\\mathmit{F}": "\uD4D5",
    "\\mathmit{G}": "\uD4D6",
    "\\mathmit{H}": "\uD4D7",
    "\\mathmit{I}": "\uD4D8",
    "\\mathmit{J}": "\uD4D9",
    "\\mathmit{K}": "\uD4DA",
    "\\mathmit{L}": "\uD4DB",
    "\\mathmit{M}": "\uD4DC",
    "\\mathmit{N}": "\uD4DD",
    "\\mathmit{O}": "\uD4DE",
    "\\mathmit{P}": "\uD4DF",
    "\\mathmit{Q}": "\uD4E0",
    "\\mathmit{R}": "\uD4E1",
    "\\mathmit{S}": "\uD4E2",
    "\\mathmit{T}": "\uD4E3",
    "\\mathmit{U}": "\uD4E4",
    "\\mathmit{V}": "\uD4E5",
    "\\mathmit{W}": "\uD4E6",
    "\\mathmit{X}": "\uD4E7",
    "\\mathmit{Y}": "\uD4E8",
    "\\mathmit{Z}": "\uD4E9",
    "\\mathmit{a}": "\uD4EA",
    "\\mathmit{b}": "\uD4EB",
    "\\mathmit{c}": "\uD4EC",
    "\\mathmit{d}": "\uD4ED",
    "\\mathmit{e}": "\uD4EE",
    "\\mathmit{f}": "\uD4EF",
    "\\mathmit{g}": "\uD4F0",
    "\\mathmit{h}": "\uD4F1",
    "\\mathmit{i}": "\uD4F2",
    "\\mathmit{j}": "\uD4F3",
    "\\mathmit{k}": "\uD4F4",
    "\\mathmit{l}": "\uD4F5",
    "\\mathmit{m}": "\uD4F6",
    "\\mathmit{n}": "\uD4F7",
    "\\mathmit{o}": "\uD4F8",
    "\\mathmit{p}": "\uD4F9",
    "\\mathmit{q}": "\uD4FA",
    "\\mathmit{r}": "\uD4FB",
    "\\mathmit{s}": "\uD4FC",
    "\\mathmit{t}": "\uD4FD",
    "\\mathmit{u}": "\uD4FE",
    "\\mathmit{v}": "\uD4FF",
    "\\mathmit{w}": "\uD500",
    "\\mathmit{x}": "\uD501",
    "\\mathmit{y}": "\uD502",
    "\\mathmit{z}": "\uD503",
    "\\mathfrak{A}": "\uD504",
    "\\mathfrak{B}": "\uD505",
    "\\mathfrak{D}": "\uD507",
    "\\mathfrak{E}": "\uD508",
    "\\mathfrak{F}": "\uD509",
    "\\mathfrak{G}": "\uD50A",
    "\\mathfrak{J}": "\uD50D",
    "\\mathfrak{K}": "\uD50E",
    "\\mathfrak{L}": "\uD50F",
    "\\mathfrak{M}": "\uD510",
    "\\mathfrak{N}": "\uD511",
    "\\mathfrak{O}": "\uD512",
    "\\mathfrak{P}": "\uD513",
    "\\mathfrak{Q}": "\uD514",
    "\\mathfrak{S}": "\uD516",
    "\\mathfrak{T}": "\uD517",
    "\\mathfrak{U}": "\uD518",
    "\\mathfrak{V}": "\uD519",
    "\\mathfrak{W}": "\uD51A",
    "\\mathfrak{X}": "\uD51B",
    "\\mathfrak{Y}": "\uD51C",
    "\\mathfrak{a}": "\uD51E",
    "\\mathfrak{b}": "\uD51F",
    "\\mathfrak{c}": "\uD520",
    "\\mathfrak{d}": "\uD521",
    "\\mathfrak{e}": "\uD522",
    "\\mathfrak{f}": "\uD523",
    "\\mathfrak{g}": "\uD524",
    "\\mathfrak{h}": "\uD525",
    "\\mathfrak{i}": "\uD526",
    "\\mathfrak{j}": "\uD527",
    "\\mathfrak{k}": "\uD528",
    "\\mathfrak{l}": "\uD529",
    "\\mathfrak{m}": "\uD52A",
    "\\mathfrak{n}": "\uD52B",
    "\\mathfrak{o}": "\uD52C",
    "\\mathfrak{p}": "\uD52D",
    "\\mathfrak{q}": "\uD52E",
    "\\mathfrak{r}": "\uD52F",
    "\\mathfrak{s}": "\uD530",
    "\\mathfrak{t}": "\uD531",
    "\\mathfrak{u}": "\uD532",
    "\\mathfrak{v}": "\uD533",
    "\\mathfrak{w}": "\uD534",
    "\\mathfrak{x}": "\uD535",
    "\\mathfrak{y}": "\uD536",
    "\\mathfrak{z}": "\uD537",
    "\\mathbb{A}": "\uD538",
    "\\mathbb{B}": "\uD539",
    "\\mathbb{D}": "\uD53B",
    "\\mathbb{E}": "\uD53C",
    "\\mathbb{F}": "\uD53D",
    "\\mathbb{G}": "\uD53E",
    "\\mathbb{I}": "\uD540",
    "\\mathbb{J}": "\uD541",
    "\\mathbb{K}": "\uD542",
    "\\mathbb{L}": "\uD543",
    "\\mathbb{M}": "\uD544",
    "\\mathbb{O}": "\uD546",
    "\\mathbb{S}": "\uD54A",
    "\\mathbb{T}": "\uD54B",
    "\\mathbb{U}": "\uD54C",
    "\\mathbb{V}": "\uD54D",
    "\\mathbb{W}": "\uD54E",
    "\\mathbb{X}": "\uD54F",
    "\\mathbb{Y}": "\uD550",
    "\\mathbb{a}": "\uD552",
    "\\mathbb{b}": "\uD553",
    "\\mathbb{c}": "\uD554",
    "\\mathbb{d}": "\uD555",
    "\\mathbb{e}": "\uD556",
    "\\mathbb{f}": "\uD557",
    "\\mathbb{g}": "\uD558",
    "\\mathbb{h}": "\uD559",
    "\\mathbb{i}": "\uD55A",
    "\\mathbb{j}": "\uD55B",
    "\\mathbb{k}": "\uD55C",
    "\\mathbb{l}": "\uD55D",
    "\\mathbb{m}": "\uD55E",
    "\\mathbb{n}": "\uD55F",
    "\\mathbb{o}": "\uD560",
    "\\mathbb{p}": "\uD561",
    "\\mathbb{q}": "\uD562",
    "\\mathbb{r}": "\uD563",
    "\\mathbb{s}": "\uD564",
    "\\mathbb{t}": "\uD565",
    "\\mathbb{u}": "\uD566",
    "\\mathbb{v}": "\uD567",
    "\\mathbb{w}": "\uD568",
    "\\mathbb{x}": "\uD569",
    "\\mathbb{y}": "\uD56A",
    "\\mathbb{z}": "\uD56B",
    "\\mathslbb{A}": "\uD56C",
    "\\mathslbb{B}": "\uD56D",
    "\\mathslbb{C}": "\uD56E",
    "\\mathslbb{D}": "\uD56F",
    "\\mathslbb{E}": "\uD570",
    "\\mathslbb{F}": "\uD571",
    "\\mathslbb{G}": "\uD572",
    "\\mathslbb{H}": "\uD573",
    "\\mathslbb{I}": "\uD574",
    "\\mathslbb{J}": "\uD575",
    "\\mathslbb{K}": "\uD576",
    "\\mathslbb{L}": "\uD577",
    "\\mathslbb{M}": "\uD578",
    "\\mathslbb{N}": "\uD579",
    "\\mathslbb{O}": "\uD57A",
    "\\mathslbb{P}": "\uD57B",
    "\\mathslbb{Q}": "\uD57C",
    "\\mathslbb{R}": "\uD57D",
    "\\mathslbb{S}": "\uD57E",
    "\\mathslbb{T}": "\uD57F",
    "\\mathslbb{U}": "\uD580",
    "\\mathslbb{V}": "\uD581",
    "\\mathslbb{W}": "\uD582",
    "\\mathslbb{X}": "\uD583",
    "\\mathslbb{Y}": "\uD584",
    "\\mathslbb{Z}": "\uD585",
    "\\mathslbb{a}": "\uD586",
    "\\mathslbb{b}": "\uD587",
    "\\mathslbb{c}": "\uD588",
    "\\mathslbb{d}": "\uD589",
    "\\mathslbb{e}": "\uD58A",
    "\\mathslbb{f}": "\uD58B",
    "\\mathslbb{g}": "\uD58C",
    "\\mathslbb{h}": "\uD58D",
    "\\mathslbb{i}": "\uD58E",
    "\\mathslbb{j}": "\uD58F",
    "\\mathslbb{k}": "\uD590",
    "\\mathslbb{l}": "\uD591",
    "\\mathslbb{m}": "\uD592",
    "\\mathslbb{n}": "\uD593",
    "\\mathslbb{o}": "\uD594",
    "\\mathslbb{p}": "\uD595",
    "\\mathslbb{q}": "\uD596",
    "\\mathslbb{r}": "\uD597",
    "\\mathslbb{s}": "\uD598",
    "\\mathslbb{t}": "\uD599",
    "\\mathslbb{u}": "\uD59A",
    "\\mathslbb{v}": "\uD59B",
    "\\mathslbb{w}": "\uD59C",
    "\\mathslbb{x}": "\uD59D",
    "\\mathslbb{y}": "\uD59E",
    "\\mathslbb{z}": "\uD59F",
    "\\mathsf{A}": "\uD5A0",
    "\\mathsf{B}": "\uD5A1",
    "\\mathsf{C}": "\uD5A2",
    "\\mathsf{D}": "\uD5A3",
    "\\mathsf{E}": "\uD5A4",
    "\\mathsf{F}": "\uD5A5",
    "\\mathsf{G}": "\uD5A6",
    "\\mathsf{H}": "\uD5A7",
    "\\mathsf{I}": "\uD5A8",
    "\\mathsf{J}": "\uD5A9",
    "\\mathsf{K}": "\uD5AA",
    "\\mathsf{L}": "\uD5AB",
    "\\mathsf{M}": "\uD5AC",
    "\\mathsf{N}": "\uD5AD",
    "\\mathsf{O}": "\uD5AE",
    "\\mathsf{P}": "\uD5AF",
    "\\mathsf{Q}": "\uD5B0",
    "\\mathsf{R}": "\uD5B1",
    "\\mathsf{S}": "\uD5B2",
    "\\mathsf{T}": "\uD5B3",
    "\\mathsf{U}": "\uD5B4",
    "\\mathsf{V}": "\uD5B5",
    "\\mathsf{W}": "\uD5B6",
    "\\mathsf{X}": "\uD5B7",
    "\\mathsf{Y}": "\uD5B8",
    "\\mathsf{Z}": "\uD5B9",
    "\\mathsf{a}": "\uD5BA",
    "\\mathsf{b}": "\uD5BB",
    "\\mathsf{c}": "\uD5BC",
    "\\mathsf{d}": "\uD5BD",
    "\\mathsf{e}": "\uD5BE",
    "\\mathsf{f}": "\uD5BF",
    "\\mathsf{g}": "\uD5C0",
    "\\mathsf{h}": "\uD5C1",
    "\\mathsf{i}": "\uD5C2",
    "\\mathsf{j}": "\uD5C3",
    "\\mathsf{k}": "\uD5C4",
    "\\mathsf{l}": "\uD5C5",
    "\\mathsf{m}": "\uD5C6",
    "\\mathsf{n}": "\uD5C7",
    "\\mathsf{o}": "\uD5C8",
    "\\mathsf{p}": "\uD5C9",
    "\\mathsf{q}": "\uD5CA",
    "\\mathsf{r}": "\uD5CB",
    "\\mathsf{s}": "\uD5CC",
    "\\mathsf{t}": "\uD5CD",
    "\\mathsf{u}": "\uD5CE",
    "\\mathsf{v}": "\uD5CF",
    "\\mathsf{w}": "\uD5D0",
    "\\mathsf{x}": "\uD5D1",
    "\\mathsf{y}": "\uD5D2",
    "\\mathsf{z}": "\uD5D3",
    "\\mathsfbf{A}": "\uD5D4",
    "\\mathsfbf{B}": "\uD5D5",
    "\\mathsfbf{C}": "\uD5D6",
    "\\mathsfbf{D}": "\uD5D7",
    "\\mathsfbf{E}": "\uD5D8",
    "\\mathsfbf{F}": "\uD5D9",
    "\\mathsfbf{G}": "\uD5DA",
    "\\mathsfbf{H}": "\uD5DB",
    "\\mathsfbf{I}": "\uD5DC",
    "\\mathsfbf{J}": "\uD5DD",
    "\\mathsfbf{K}": "\uD5DE",
    "\\mathsfbf{L}": "\uD5DF",
    "\\mathsfbf{M}": "\uD5E0",
    "\\mathsfbf{N}": "\uD5E1",
    "\\mathsfbf{O}": "\uD5E2",
    "\\mathsfbf{P}": "\uD5E3",
    "\\mathsfbf{Q}": "\uD5E4",
    "\\mathsfbf{R}": "\uD5E5",
    "\\mathsfbf{S}": "\uD5E6",
    "\\mathsfbf{T}": "\uD5E7",
    "\\mathsfbf{U}": "\uD5E8",
    "\\mathsfbf{V}": "\uD5E9",
    "\\mathsfbf{W}": "\uD5EA",
    "\\mathsfbf{X}": "\uD5EB",
    "\\mathsfbf{Y}": "\uD5EC",
    "\\mathsfbf{Z}": "\uD5ED",
    "\\mathsfbf{a}": "\uD5EE",
    "\\mathsfbf{b}": "\uD5EF",
    "\\mathsfbf{c}": "\uD5F0",
    "\\mathsfbf{d}": "\uD5F1",
    "\\mathsfbf{e}": "\uD5F2",
    "\\mathsfbf{f}": "\uD5F3",
    "\\mathsfbf{g}": "\uD5F4",
    "\\mathsfbf{h}": "\uD5F5",
    "\\mathsfbf{i}": "\uD5F6",
    "\\mathsfbf{j}": "\uD5F7",
    "\\mathsfbf{k}": "\uD5F8",
    "\\mathsfbf{l}": "\uD5F9",
    "\\mathsfbf{m}": "\uD5FA",
    "\\mathsfbf{n}": "\uD5FB",
    "\\mathsfbf{o}": "\uD5FC",
    "\\mathsfbf{p}": "\uD5FD",
    "\\mathsfbf{q}": "\uD5FE",
    "\\mathsfbf{r}": "\uD5FF",
    "\\mathsfbf{s}": "\uD600",
    "\\mathsfbf{t}": "\uD601",
    "\\mathsfbf{u}": "\uD602",
    "\\mathsfbf{v}": "\uD603",
    "\\mathsfbf{w}": "\uD604",
    "\\mathsfbf{x}": "\uD605",
    "\\mathsfbf{y}": "\uD606",
    "\\mathsfbf{z}": "\uD607",
    "\\mathsfsl{A}": "\uD608",
    "\\mathsfsl{B}": "\uD609",
    "\\mathsfsl{C}": "\uD60A",
    "\\mathsfsl{D}": "\uD60B",
    "\\mathsfsl{E}": "\uD60C",
    "\\mathsfsl{F}": "\uD60D",
    "\\mathsfsl{G}": "\uD60E",
    "\\mathsfsl{H}": "\uD60F",
    "\\mathsfsl{I}": "\uD610",
    "\\mathsfsl{J}": "\uD611",
    "\\mathsfsl{K}": "\uD612",
    "\\mathsfsl{L}": "\uD613",
    "\\mathsfsl{M}": "\uD614",
    "\\mathsfsl{N}": "\uD615",
    "\\mathsfsl{O}": "\uD616",
    "\\mathsfsl{P}": "\uD617",
    "\\mathsfsl{Q}": "\uD618",
    "\\mathsfsl{R}": "\uD619",
    "\\mathsfsl{S}": "\uD61A",
    "\\mathsfsl{T}": "\uD61B",
    "\\mathsfsl{U}": "\uD61C",
    "\\mathsfsl{V}": "\uD61D",
    "\\mathsfsl{W}": "\uD61E",
    "\\mathsfsl{X}": "\uD61F",
    "\\mathsfsl{Y}": "\uD620",
    "\\mathsfsl{Z}": "\uD621",
    "\\mathsfsl{a}": "\uD622",
    "\\mathsfsl{b}": "\uD623",
    "\\mathsfsl{c}": "\uD624",
    "\\mathsfsl{d}": "\uD625",
    "\\mathsfsl{e}": "\uD626",
    "\\mathsfsl{f}": "\uD627",
    "\\mathsfsl{g}": "\uD628",
    "\\mathsfsl{h}": "\uD629",
    "\\mathsfsl{i}": "\uD62A",
    "\\mathsfsl{j}": "\uD62B",
    "\\mathsfsl{k}": "\uD62C",
    "\\mathsfsl{l}": "\uD62D",
    "\\mathsfsl{m}": "\uD62E",
    "\\mathsfsl{n}": "\uD62F",
    "\\mathsfsl{o}": "\uD630",
    "\\mathsfsl{p}": "\uD631",
    "\\mathsfsl{q}": "\uD632",
    "\\mathsfsl{r}": "\uD633",
    "\\mathsfsl{s}": "\uD634",
    "\\mathsfsl{t}": "\uD635",
    "\\mathsfsl{u}": "\uD636",
    "\\mathsfsl{v}": "\uD637",
    "\\mathsfsl{w}": "\uD638",
    "\\mathsfsl{x}": "\uD639",
    "\\mathsfsl{y}": "\uD63A",
    "\\mathsfsl{z}": "\uD63B",
    "\\mathsfbfsl{A}": "\uD63C",
    "\\mathsfbfsl{B}": "\uD63D",
    "\\mathsfbfsl{C}": "\uD63E",
    "\\mathsfbfsl{D}": "\uD63F",
    "\\mathsfbfsl{E}": "\uD640",
    "\\mathsfbfsl{F}": "\uD641",
    "\\mathsfbfsl{G}": "\uD642",
    "\\mathsfbfsl{H}": "\uD643",
    "\\mathsfbfsl{I}": "\uD644",
    "\\mathsfbfsl{J}": "\uD645",
    "\\mathsfbfsl{K}": "\uD646",
    "\\mathsfbfsl{L}": "\uD647",
    "\\mathsfbfsl{M}": "\uD648",
    "\\mathsfbfsl{N}": "\uD649",
    "\\mathsfbfsl{O}": "\uD64A",
    "\\mathsfbfsl{P}": "\uD64B",
    "\\mathsfbfsl{Q}": "\uD64C",
    "\\mathsfbfsl{R}": "\uD64D",
    "\\mathsfbfsl{S}": "\uD64E",
    "\\mathsfbfsl{T}": "\uD64F",
    "\\mathsfbfsl{U}": "\uD650",
    "\\mathsfbfsl{V}": "\uD651",
    "\\mathsfbfsl{W}": "\uD652",
    "\\mathsfbfsl{X}": "\uD653",
    "\\mathsfbfsl{Y}": "\uD654",
    "\\mathsfbfsl{Z}": "\uD655",
    "\\mathsfbfsl{a}": "\uD656",
    "\\mathsfbfsl{b}": "\uD657",
    "\\mathsfbfsl{c}": "\uD658",
    "\\mathsfbfsl{d}": "\uD659",
    "\\mathsfbfsl{e}": "\uD65A",
    "\\mathsfbfsl{f}": "\uD65B",
    "\\mathsfbfsl{g}": "\uD65C",
    "\\mathsfbfsl{h}": "\uD65D",
    "\\mathsfbfsl{i}": "\uD65E",
    "\\mathsfbfsl{j}": "\uD65F",
    "\\mathsfbfsl{k}": "\uD660",
    "\\mathsfbfsl{l}": "\uD661",
    "\\mathsfbfsl{m}": "\uD662",
    "\\mathsfbfsl{n}": "\uD663",
    "\\mathsfbfsl{o}": "\uD664",
    "\\mathsfbfsl{p}": "\uD665",
    "\\mathsfbfsl{q}": "\uD666",
    "\\mathsfbfsl{r}": "\uD667",
    "\\mathsfbfsl{s}": "\uD668",
    "\\mathsfbfsl{t}": "\uD669",
    "\\mathsfbfsl{u}": "\uD66A",
    "\\mathsfbfsl{v}": "\uD66B",
    "\\mathsfbfsl{w}": "\uD66C",
    "\\mathsfbfsl{x}": "\uD66D",
    "\\mathsfbfsl{y}": "\uD66E",
    "\\mathsfbfsl{z}": "\uD66F",
    "\\mathtt{A}": "\uD670",
    "\\mathtt{B}": "\uD671",
    "\\mathtt{C}": "\uD672",
    "\\mathtt{D}": "\uD673",
    "\\mathtt{E}": "\uD674",
    "\\mathtt{F}": "\uD675",
    "\\mathtt{G}": "\uD676",
    "\\mathtt{H}": "\uD677",
    "\\mathtt{I}": "\uD678",
    "\\mathtt{J}": "\uD679",
    "\\mathtt{K}": "\uD67A",
    "\\mathtt{L}": "\uD67B",
    "\\mathtt{M}": "\uD67C",
    "\\mathtt{N}": "\uD67D",
    "\\mathtt{O}": "\uD67E",
    "\\mathtt{P}": "\uD67F",
    "\\mathtt{Q}": "\uD680",
    "\\mathtt{R}": "\uD681",
    "\\mathtt{S}": "\uD682",
    "\\mathtt{T}": "\uD683",
    "\\mathtt{U}": "\uD684",
    "\\mathtt{V}": "\uD685",
    "\\mathtt{W}": "\uD686",
    "\\mathtt{X}": "\uD687",
    "\\mathtt{Y}": "\uD688",
    "\\mathtt{Z}": "\uD689",
    "\\mathtt{a}": "\uD68A",
    "\\mathtt{b}": "\uD68B",
    "\\mathtt{c}": "\uD68C",
    "\\mathtt{d}": "\uD68D",
    "\\mathtt{e}": "\uD68E",
    "\\mathtt{f}": "\uD68F",
    "\\mathtt{g}": "\uD690",
    "\\mathtt{h}": "\uD691",
    "\\mathtt{i}": "\uD692",
    "\\mathtt{j}": "\uD693",
    "\\mathtt{k}": "\uD694",
    "\\mathtt{l}": "\uD695",
    "\\mathtt{m}": "\uD696",
    "\\mathtt{n}": "\uD697",
    "\\mathtt{o}": "\uD698",
    "\\mathtt{p}": "\uD699",
    "\\mathtt{q}": "\uD69A",
    "\\mathtt{r}": "\uD69B",
    "\\mathtt{s}": "\uD69C",
    "\\mathtt{t}": "\uD69D",
    "\\mathtt{u}": "\uD69E",
    "\\mathtt{v}": "\uD69F",
    "\\mathtt{w}": "\uD6A0",
    "\\mathtt{x}": "\uD6A1",
    "\\mathtt{y}": "\uD6A2",
    "\\mathtt{z}": "\uD6A3",
    "\\mathbf{\\Alpha}": "\uD6A8",
    "\\mathbf{\\Beta}": "\uD6A9",
    "\\mathbf{\\Gamma}": "\uD6AA",
    "\\mathbf{\\Delta}": "\uD6AB",
    "\\mathbf{\\Epsilon}": "\uD6AC",
    "\\mathbf{\\Zeta}": "\uD6AD",
    "\\mathbf{\\Eta}": "\uD6AE",
    "\\mathbf{\\Theta}": "\uD6AF",
    "\\mathbf{\\Iota}": "\uD6B0",
    "\\mathbf{\\Kappa}": "\uD6B1",
    "\\mathbf{\\Lambda}": "\uD6B2",
    "\\mathbf{\\Xi}": "\uD6B5",
    "\\mathbf{\\Pi}": "\uD6B7",
    "\\mathbf{\\Rho}": "\uD6B8",
    "\\mathbf{\\vartheta}": "\uD6B9",
    "\\mathbf{\\Sigma}": "\uD6BA",
    "\\mathbf{\\Tau}": "\uD6BB",
    "\\mathbf{\\Upsilon}": "\uD6BC",
    "\\mathbf{\\Phi}": "\uD6BD",
    "\\mathbf{\\Chi}": "\uD6BE",
    "\\mathbf{\\Psi}": "\uD6BF",
    "\\mathbf{\\Omega}": "\uD6C0",
    "\\mathbf{\\nabla}": "\uD6C1",
    "\\mathbf{\\Alpha}": "\uD6C2",
    "\\mathbf{\\Beta}": "\uD6C3",
    "\\mathbf{\\Gamma}": "\uD6C4",
    "\\mathbf{\\Delta}": "\uD6C5",
    "\\mathbf{\\Epsilon}": "\uD6C6",
    "\\mathbf{\\Zeta}": "\uD6C7",
    "\\mathbf{\\Eta}": "\uD6C8",
    "\\mathbf{\\theta}": "\uD6C9",
    "\\mathbf{\\Iota}": "\uD6CA",
    "\\mathbf{\\Kappa}": "\uD6CB",
    "\\mathbf{\\Lambda}": "\uD6CC",
    "\\mathbf{\\Xi}": "\uD6CF",
    "\\mathbf{\\Pi}": "\uD6D1",
    "\\mathbf{\\Rho}": "\uD6D2",
    "\\mathbf{\\varsigma}": "\uD6D3",
    "\\mathbf{\\Sigma}": "\uD6D4",
    "\\mathbf{\\Tau}": "\uD6D5",
    "\\mathbf{\\Upsilon}": "\uD6D6",
    "\\mathbf{\\Phi}": "\uD6D7",
    "\\mathbf{\\Chi}": "\uD6D8",
    "\\mathbf{\\Psi}": "\uD6D9",
    "\\mathbf{\\Omega}": "\uD6DA",
    "\\partial": "\uD6DB",
    "\\in": "\uD6DC",
    "\\mathbf{\\vartheta}": "\uD6DD",
    "\\mathbf{\\varkappa}": "\uD6DE",
    "\\mathbf{\\phi}": "\uD6DF",
    "\\mathbf{\\varrho}": "\uD6E0",
    "\\mathbf{\\varpi}": "\uD6E1",
    "\\mathsl{\\Alpha}": "\uD6E2",
    "\\mathsl{\\Beta}": "\uD6E3",
    "\\mathsl{\\Gamma}": "\uD6E4",
    "\\mathsl{\\Delta}": "\uD6E5",
    "\\mathsl{\\Epsilon}": "\uD6E6",
    "\\mathsl{\\Zeta}": "\uD6E7",
    "\\mathsl{\\Eta}": "\uD6E8",
    "\\mathsl{\\Theta}": "\uD6E9",
    "\\mathsl{\\Iota}": "\uD6EA",
    "\\mathsl{\\Kappa}": "\uD6EB",
    "\\mathsl{\\Lambda}": "\uD6EC",
    "\\mathsl{\\Xi}": "\uD6EF",
    "\\mathsl{\\Pi}": "\uD6F1",
    "\\mathsl{\\Rho}": "\uD6F2",
    "\\mathsl{\\vartheta}": "\uD6F3",
    "\\mathsl{\\Sigma}": "\uD6F4",
    "\\mathsl{\\Tau}": "\uD6F5",
    "\\mathsl{\\Upsilon}": "\uD6F6",
    "\\mathsl{\\Phi}": "\uD6F7",
    "\\mathsl{\\Chi}": "\uD6F8",
    "\\mathsl{\\Psi}": "\uD6F9",
    "\\mathsl{\\Omega}": "\uD6FA",
    "\\mathsl{\\nabla}": "\uD6FB",
    "\\mathsl{\\Alpha}": "\uD6FC",
    "\\mathsl{\\Beta}": "\uD6FD",
    "\\mathsl{\\Gamma}": "\uD6FE",
    "\\mathsl{\\Delta}": "\uD6FF",
    "\\mathsl{\\Epsilon}": "\uD700",
    "\\mathsl{\\Zeta}": "\uD701",
    "\\mathsl{\\Eta}": "\uD702",
    "\\mathsl{\\Theta}": "\uD703",
    "\\mathsl{\\Iota}": "\uD704",
    "\\mathsl{\\Kappa}": "\uD705",
    "\\mathsl{\\Lambda}": "\uD706",
    "\\mathsl{\\Xi}": "\uD709",
    "\\mathsl{\\Pi}": "\uD70B",
    "\\mathsl{\\Rho}": "\uD70C",
    "\\mathsl{\\varsigma}": "\uD70D",
    "\\mathsl{\\Sigma}": "\uD70E",
    "\\mathsl{\\Tau}": "\uD70F",
    "\\mathsl{\\Upsilon}": "\uD710",
    "\\mathsl{\\Phi}": "\uD711",
    "\\mathsl{\\Chi}": "\uD712",
    "\\mathsl{\\Psi}": "\uD713",
    "\\mathsl{\\Omega}": "\uD714",
    "\\partial": "\uD715",
    "\\mathsl{\\vartheta}": "\uD717",
    "\\mathsl{\\varkappa}": "\uD718",
    "\\mathsl{\\phi}": "\uD719",
    "\\mathsl{\\varrho}": "\uD71A",
    "\\mathsl{\\varpi}": "\uD71B",
    "\\mathbit{\\Alpha}": "\uD71C",
    "\\mathbit{\\Beta}": "\uD71D",
    "\\mathbit{\\Gamma}": "\uD71E",
    "\\mathbit{\\Delta}": "\uD71F",
    "\\mathbit{\\Epsilon}": "\uD720",
    "\\mathbit{\\Zeta}": "\uD721",
    "\\mathbit{\\Eta}": "\uD722",
    "\\mathbit{\\Theta}": "\uD723",
    "\\mathbit{\\Iota}": "\uD724",
    "\\mathbit{\\Kappa}": "\uD725",
    "\\mathbit{\\Lambda}": "\uD726",
    "\\mathbit{\\Xi}": "\uD729",
    "\\mathbit{\\Pi}": "\uD72B",
    "\\mathbit{\\Rho}": "\uD72C",
    "\\mathbit{O}": "\uD72D",
    "\\mathbit{\\Sigma}": "\uD72E",
    "\\mathbit{\\Tau}": "\uD72F",
    "\\mathbit{\\Upsilon}": "\uD730",
    "\\mathbit{\\Phi}": "\uD731",
    "\\mathbit{\\Chi}": "\uD732",
    "\\mathbit{\\Psi}": "\uD733",
    "\\mathbit{\\Omega}": "\uD734",
    "\\mathbit{\\nabla}": "\uD735",
    "\\mathbit{\\Alpha}": "\uD736",
    "\\mathbit{\\Beta}": "\uD737",
    "\\mathbit{\\Gamma}": "\uD738",
    "\\mathbit{\\Delta}": "\uD739",
    "\\mathbit{\\Epsilon}": "\uD73A",
    "\\mathbit{\\Zeta}": "\uD73B",
    "\\mathbit{\\Eta}": "\uD73C",
    "\\mathbit{\\Theta}": "\uD73D",
    "\\mathbit{\\Iota}": "\uD73E",
    "\\mathbit{\\Kappa}": "\uD73F",
    "\\mathbit{\\Lambda}": "\uD740",
    "\\mathbit{\\Xi}": "\uD743",
    "\\mathbit{\\Pi}": "\uD745",
    "\\mathbit{\\Rho}": "\uD746",
    "\\mathbit{\\varsigma}": "\uD747",
    "\\mathbit{\\Sigma}": "\uD748",
    "\\mathbit{\\Tau}": "\uD749",
    "\\mathbit{\\Upsilon}": "\uD74A",
    "\\mathbit{\\Phi}": "\uD74B",
    "\\mathbit{\\Chi}": "\uD74C",
    "\\mathbit{\\Psi}": "\uD74D",
    "\\mathbit{\\Omega}": "\uD74E",
    "\\partial": "\uD74F",
    "\\mathbit{\\vartheta}": "\uD751",
    "\\mathbit{\\varkappa}": "\uD752",
    "\\mathbit{\\phi}": "\uD753",
    "\\mathbit{\\varrho}": "\uD754",
    "\\mathbit{\\varpi}": "\uD755",
    "\\mathsfbf{\\Alpha}": "\uD756",
    "\\mathsfbf{\\Beta}": "\uD757",
    "\\mathsfbf{\\Gamma}": "\uD758",
    "\\mathsfbf{\\Delta}": "\uD759",
    "\\mathsfbf{\\Epsilon}": "\uD75A",
    "\\mathsfbf{\\Zeta}": "\uD75B",
    "\\mathsfbf{\\Eta}": "\uD75C",
    "\\mathsfbf{\\Theta}": "\uD75D",
    "\\mathsfbf{\\Iota}": "\uD75E",
    "\\mathsfbf{\\Kappa}": "\uD75F",
    "\\mathsfbf{\\Lambda}": "\uD760",
    "\\mathsfbf{\\Xi}": "\uD763",
    "\\mathsfbf{\\Pi}": "\uD765",
    "\\mathsfbf{\\Rho}": "\uD766",
    "\\mathsfbf{\\vartheta}": "\uD767",
    "\\mathsfbf{\\Sigma}": "\uD768",
    "\\mathsfbf{\\Tau}": "\uD769",
    "\\mathsfbf{\\Upsilon}": "\uD76A",
    "\\mathsfbf{\\Phi}": "\uD76B",
    "\\mathsfbf{\\Chi}": "\uD76C",
    "\\mathsfbf{\\Psi}": "\uD76D",
    "\\mathsfbf{\\Omega}": "\uD76E",
    "\\mathsfbf{\\nabla}": "\uD76F",
    "\\mathsfbf{\\Alpha}": "\uD770",
    "\\mathsfbf{\\Beta}": "\uD771",
    "\\mathsfbf{\\Gamma}": "\uD772",
    "\\mathsfbf{\\Delta}": "\uD773",
    "\\mathsfbf{\\Epsilon}": "\uD774",
    "\\mathsfbf{\\Zeta}": "\uD775",
    "\\mathsfbf{\\Eta}": "\uD776",
    "\\mathsfbf{\\Theta}": "\uD777",
    "\\mathsfbf{\\Iota}": "\uD778",
    "\\mathsfbf{\\Kappa}": "\uD779",
    "\\mathsfbf{\\Lambda}": "\uD77A",
    "\\mathsfbf{\\Xi}": "\uD77D",
    "\\mathsfbf{\\Pi}": "\uD77F",
    "\\mathsfbf{\\Rho}": "\uD780",
    "\\mathsfbf{\\varsigma}": "\uD781",
    "\\mathsfbf{\\Sigma}": "\uD782",
    "\\mathsfbf{\\Tau}": "\uD783",
    "\\mathsfbf{\\Upsilon}": "\uD784",
    "\\mathsfbf{\\Phi}": "\uD785",
    "\\mathsfbf{\\Chi}": "\uD786",
    "\\mathsfbf{\\Psi}": "\uD787",
    "\\mathsfbf{\\Omega}": "\uD788",
    "\\partial": "\uD789",
    "\\mathsfbf{\\vartheta}": "\uD78B",
    "\\mathsfbf{\\varkappa}": "\uD78C",
    "\\mathsfbf{\\phi}": "\uD78D",
    "\\mathsfbf{\\varrho}": "\uD78E",
    "\\mathsfbf{\\varpi}": "\uD78F",
    "\\mathsfbfsl{\\Alpha}": "\uD790",
    "\\mathsfbfsl{\\Beta}": "\uD791",
    "\\mathsfbfsl{\\Gamma}": "\uD792",
    "\\mathsfbfsl{\\Delta}": "\uD793",
    "\\mathsfbfsl{\\Epsilon}": "\uD794",
    "\\mathsfbfsl{\\Zeta}": "\uD795",
    "\\mathsfbfsl{\\Eta}": "\uD796",
    "\\mathsfbfsl{\\vartheta}": "\uD797",
    "\\mathsfbfsl{\\Iota}": "\uD798",
    "\\mathsfbfsl{\\Kappa}": "\uD799",
    "\\mathsfbfsl{\\Lambda}": "\uD79A",
    "\\mathsfbfsl{\\Xi}": "\uD79D",
    "\\mathsfbfsl{\\Pi}": "\uD79F",
    "\\mathsfbfsl{\\Rho}": "\uD7A0",
    "\\mathsfbfsl{\\vartheta}": "\uD7A1",
    "\\mathsfbfsl{\\Sigma}": "\uD7A2",
    "\\mathsfbfsl{\\Tau}": "\uD7A3",
    "\\mathsfbfsl{\\Upsilon}": "\uD7A4",
    "\\mathsfbfsl{\\Phi}": "\uD7A5",
    "\\mathsfbfsl{\\Chi}": "\uD7A6",
    "\\mathsfbfsl{\\Psi}": "\uD7A7",
    "\\mathsfbfsl{\\Omega}": "\uD7A8",
    "\\mathsfbfsl{\\nabla}": "\uD7A9",
    "\\mathsfbfsl{\\Alpha}": "\uD7AA",
    "\\mathsfbfsl{\\Beta}": "\uD7AB",
    "\\mathsfbfsl{\\Gamma}": "\uD7AC",
    "\\mathsfbfsl{\\Delta}": "\uD7AD",
    "\\mathsfbfsl{\\Epsilon}": "\uD7AE",
    "\\mathsfbfsl{\\Zeta}": "\uD7AF",
    "\\mathsfbfsl{\\Eta}": "\uD7B0",
    "\\mathsfbfsl{\\vartheta}": "\uD7B1",
    "\\mathsfbfsl{\\Iota}": "\uD7B2",
    "\\mathsfbfsl{\\Kappa}": "\uD7B3",
    "\\mathsfbfsl{\\Lambda}": "\uD7B4",
    "\\mathsfbfsl{\\Xi}": "\uD7B7",
    "\\mathsfbfsl{\\Pi}": "\uD7B9",
    "\\mathsfbfsl{\\Rho}": "\uD7BA",
    "\\mathsfbfsl{\\varsigma}": "\uD7BB",
    "\\mathsfbfsl{\\Sigma}": "\uD7BC",
    "\\mathsfbfsl{\\Tau}": "\uD7BD",
    "\\mathsfbfsl{\\Upsilon}": "\uD7BE",
    "\\mathsfbfsl{\\Phi}": "\uD7BF",
    "\\mathsfbfsl{\\Chi}": "\uD7C0",
    "\\mathsfbfsl{\\Psi}": "\uD7C1",
    "\\mathsfbfsl{\\Omega}": "\uD7C2",
    "\\partial": "\uD7C3",
    "\\mathsfbfsl{\\vartheta}": "\uD7C5",
    "\\mathsfbfsl{\\varkappa}": "\uD7C6",
    "\\mathsfbfsl{\\phi}": "\uD7C7",
    "\\mathsfbfsl{\\varrho}": "\uD7C8",
    "\\mathsfbfsl{\\varpi}": "\uD7C9",
    "\\mathbf{0}": "\uD7CE",
    "\\mathbf{1}": "\uD7CF",
    "\\mathbf{2}": "\uD7D0",
    "\\mathbf{3}": "\uD7D1",
    "\\mathbf{4}": "\uD7D2",
    "\\mathbf{5}": "\uD7D3",
    "\\mathbf{6}": "\uD7D4",
    "\\mathbf{7}": "\uD7D5",
    "\\mathbf{8}": "\uD7D6",
    "\\mathbf{9}": "\uD7D7",
    "\\mathbb{0}": "\uD7D8",
    "\\mathbb{1}": "\uD7D9",
    "\\mathbb{2}": "\uD7DA",
    "\\mathbb{3}": "\uD7DB",
    "\\mathbb{4}": "\uD7DC",
    "\\mathbb{5}": "\uD7DD",
    "\\mathbb{6}": "\uD7DE",
    "\\mathbb{7}": "\uD7DF",
    "\\mathbb{8}": "\uD7E0",
    "\\mathbb{9}": "\uD7E1",
    "\\mathsf{0}": "\uD7E2",
    "\\mathsf{1}": "\uD7E3",
    "\\mathsf{2}": "\uD7E4",
    "\\mathsf{3}": "\uD7E5",
    "\\mathsf{4}": "\uD7E6",
    "\\mathsf{5}": "\uD7E7",
    "\\mathsf{6}": "\uD7E8",
    "\\mathsf{7}": "\uD7E9",
    "\\mathsf{8}": "\uD7EA",
    "\\mathsf{9}": "\uD7EB",
    "\\mathsfbf{0}": "\uD7EC",
    "\\mathsfbf{1}": "\uD7ED",
    "\\mathsfbf{2}": "\uD7EE",
    "\\mathsfbf{3}": "\uD7EF",
    "\\mathsfbf{4}": "\uD7F0",
    "\\mathsfbf{5}": "\uD7F1",
    "\\mathsfbf{6}": "\uD7F2",
    "\\mathsfbf{7}": "\uD7F3",
    "\\mathsfbf{8}": "\uD7F4",
    "\\mathsfbf{9}": "\uD7F5",
    "\\mathtt{0}": "\uD7F6",
    "\\mathtt{1}": "\uD7F7",
    "\\mathtt{2}": "\uD7F8",
    "\\mathtt{3}": "\uD7F9",
    "\\mathtt{4}": "\uD7FA",
    "\\mathtt{5}": "\uD7FB",
    "\\mathtt{6}": "\uD7FC",
    "\\mathtt{7}": "\uD7FD",
    "\\mathtt{8}": "\uD7FE",
    "\\mathtt{9}": "\uD7FF",
    "{\\o}": "\u00D8",
    "{\AA}": "\u212B"
};