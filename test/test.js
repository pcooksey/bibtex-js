import {
    Selector
} from 'testcafe';

fixture `Simple Tests`
    .page `http://localhost:8000/test/html/simple.html`;

test('Check Entries', async t => {
    const entry0 = await Selector('.bibtexentry');
    const entry1 = await Selector('.bibtexentry', {
        index: 1
    });
    const entry2 = await Selector('.bibtexentry', {
        index: 2
    });
    const entry3 = await Selector('.bibtexentry', {
        index: 3
    });
    const entry4 = await Selector('.bibtexentry', {
        index: 4
    });
    const entries = Selector('#bibtex_display').find('.bibtexentry').count;
    await t
        .expect(entry0).ok()
        .expect(entry2).ok()
        .expect(entries).ok()
        .expect(entries).eql(5)
        .expect(await entry0.find('.title', {
            index: 0
        }).innerText).eql('Programming languages')
        .expect(await entry0.find('.author', {
            index: 0
        }).innerText).eql('Sammet, J.E., and D. Hemmendinger')
        .expect(await entry0.find('.year', {
            index: 0
        }).innerText).eql('2003')
        .expect(await entry1.find('.title', {
            index: 1
        }).innerText).eql('Übersetzung objektorientierter Programmiersprachen: Konzepte, abstrakte Maschinen und Praktikum \\glqq Java Compiler\\grqq')
        .expect(await entry1.find('.author', {
            index: 1
        }).innerText).eql('Bauer, B., and R. Höllerer')
        .expect(await entry1.find('.year', {
            index: 1
        }).innerText).eql('1998')
        .expect(await entry2.find('.title', {
            index: 2
        }).innerText).eql('ANTLR: A predicated-LL (k) parser generator')
        .expect(await entry2.find('.author', {
            index: 2
        }).innerText).eql('Parr, T.J., and R.W. Quong')
        .expect(await entry2.find('.year', {
            index: 2
        }).innerText).eql('1995')
        .expect(await entry3.find('.title', {
            index: 3
        }).innerText).eql('Chomsky-Hierarchie --- Wikipedia, Die freie Enzyklopädie')
        .expect(await entry3.find('.author', {
            index: 3
        }).innerText).eql('Wikipedia')
        .expect(await entry3.find('.year', {
            index: 3
        }).innerText).eql('2003')
        .expect(await entry4.find('.title', {
            index: 4
        }).innerText).eql('The Definitive ANTLR Reference: Building Domain-Specific Languages')
        .expect(await entry4.find('.author', {
            index: 4
        }).innerText).eql('Terence Parr')
        .expect(await entry4.find('.year', {
            index: 4
        }).innerText).eql('2007');
});

test('Check URL links', async t => {
    const entry4 = await Selector('.bibtexentry', {
        index: 3
    });
    const url4 = await entry4.find('.url', {
        index: 0
    });
    const entry13 = await Selector('.bibtexentry', {
        index: 4
    });
    const url13 = await entry13.find('.url', {
        index: 0
    });

    await t
        .expect(url4.getAttribute('href')).eql('http://de.wikipedia.org/w/index.php?title=Chomsky-Hierarchie&oldid=71123007')
        .expect(url13.getAttribute('href')).eql('http://www.amazon.com/Definitive-ANTLR-Reference-Domain-Specific-Programmers/dp/0978739256%3FSubscriptionId%3D13CT5CVB80YFWJEPWS02%26tag%3Dws%26linkCode%3Dxm2%26camp%3D2025%26creative%3D165953%26creativeASIN%3D0978739256');
})


fixture `Sort Test`
    .page `http://localhost:8000/test/html/sort.html`;

test('Check Sort ASC String', async t => {
    const entries = Selector('#bibtex_display').find('.bibtexentry');
    const entriesCount = Selector('#bibtex_display').find('.bibtexentry').count;
    await t
        .expect(entries).ok()
        .expect(entriesCount).eql(5);

    for (var i = 1; i < 5; i++) {
        await t.expect(await entries.nth(i).find('.year').innerText).gte(await entries.nth(i - 1).find('.year').innerText);
    }

})



fixture `Group Test`
    .page `http://localhost:8000/test/html/group.html`;

test('Check Group ASC String', async t => {
    const entries = Selector('#bibtex_display').find('.bibtexentry');
    const entriesCount = Selector('#bibtex_display').find('.bibtexentry').count;
    const groups = Selector('.group');
    await t
        .expect(entries).ok()
        .expect(entriesCount).eql(5)
        .expect(groups.count).eql(4);

    for (var i = 1; i < 5; i++) {
        await t.expect(await entries.nth(i).find('.year').innerText).gte(await entries.nth(i - 1).find('.year').innerText);
    }

})

fixture `Individual bibtex keys`
    .page `http://localhost:8000/test/html/bibtexkeys.html`

test('Check Individual BibTeX Keys Test', async t => {
    const bibtexdisplay = Selector('.bibtex_display');
    const bibtexentries = Selector('.bibtexentry');

    // Check the total count of display and entries
    await t
        .expect(bibtexdisplay).ok()
        .expect(bibtexentries).ok()
        .expect(bibtexdisplay.count).eql(3)
        .expect(bibtexentries.count).eql(6);

    var counter = 0;
    var keys = ["sammet2003programming", "bauer1998ubersetzung", "parr1995antlr", "sammet2003programming", "wiki:chomskyh", "parr1995antlr"];

    // Check the number in each bibtex display
    var array = [2, 1, 3];
    for (var i = 0; i < 3; ++i) {
        var display = bibtexdisplay.nth(i).find('.bibtexentry')
        await t.expect(display.count).eql(array[i]);

        // Check if they are sorted
        for (var j = 1; j < array[i]; ++j) {
            const first = display.nth(j).find('.year');
            const second = display.nth(j - 1).find('.year');
            await t.expect(await first.innerText).lte(await second.innerText);
        }

        // Check that each entry has the corrent bibtexkey
        for (var j = 0; j < array[i]; ++j) {
            const key = display.nth(j).find('.bibtexkey');
            await t.expect(await key.innerText).eql(keys[counter]);
            counter++;
        }
    }

})

fixture `Academic Style Test`
    .page `http://localhost:8000/test/html/academicstyle.html`

test('Check academic style', async t => {
    const divs = Selector('#bibtex_display').child('div');
    const bibtexentries = Selector('.bibtexentry');

    //console.log(await divs);
    // Check the total count of display and entries
    await t
        .expect(divs).ok()
        .expect(bibtexentries).ok()
        .expect(divs.count).eql(3)
        .expect(bibtexentries.count).eql(5);

    var titles = ['refereed articles', 'books', 'other publications'];
    var count = [1, 3, 1];
    var bibtextypekey = ["@ARTICLE", "@BOOK", "@MISC"];

    // Check if the title is correct and it has the correct number of entries
    for (var i = 0; i < 3; ++i) {
        const subbibtexentries = divs.nth(i).find('.bibtexentry');
        await t
            .expect(divs.nth(i).getAttribute('id')).eql(titles[i])
            .expect(subbibtexentries.count).eql(count[i]);

        // Test that the entries are of the correct type
        const stringNode = subbibtexentries.withExactText(bibtextypekey[i]);
        await t.expect(stringNode.count).eql(count[i]);
    }
})

fixture `BibTexVar replacement test`
    .page `http://localhost:8000/test/html/bibtexVar.html`

test('Check class=bibtexVar', async t => {
    const entries = Selector('#bibtex_display').find('.bibtexentry');
    const entriesCount = Selector('#bibtex_display').find('.bibtexentry').count;
    await t
        .expect(entries).ok()
        .expect(entriesCount).eql(5);

    var years = ["2003", "1998", "1995", "2003", "2007"];
    var authors = ["Sammet, J.E. and Hemmendinger, D.",
        "Bauer, B. and Höllerer, R.",
        "Parr, T.J. and Quong, R.W.",
        "Wikipedia",
        "Terence Parr"
    ];

    for (var i = 1; i < 5; i++) {
        const entry = entries.nth(i);
        await t
            .expect(await entry.find('.bibtexVar').withAttribute('year', years[i]).count).eql(1)
            .expect(await entry.find('.bibtexVar').withAttribute('author', authors[i]).count).eql(1);
    }

})
