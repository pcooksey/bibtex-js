import {
    Selector
} from 'testcafe';

fixture `Simple Tests`
    .page `http://0.0.0.0:8000/test/html/simple.html`;

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
        }).innerText).eql('Sammet, J.E., and Hemmendinger, D.')
        .expect(await entry0.find('.year', {
            index: 0
        }).innerText).eql('2003')
        .expect(await entry1.find('.title', {
            index: 1
        }).innerText).eql('Übersetzung objektorientierter Programmiersprachen: Konzepte, abstrakte Maschinen und Praktikum \\glqq Java Compiler\\grqq')
        .expect(await entry1.find('.author', {
            index: 1
        }).innerText).eql('Bauer, B., and Höllerer, R.')
        .expect(await entry1.find('.year', {
            index: 1
        }).innerText).eql('1998')
        .expect(await entry2.find('.title', {
            index: 2
        }).innerText).eql('ANTLR: A predicated-LL (k) parser generator')
        .expect(await entry2.find('.author', {
            index: 2
        }).innerText).eql('Parr, T.J., and Quong, R.W.')
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
    .page `http://0.0.0.0:8000/test/html/sort.html`;

test('Check Sort ASC String', async t => {
    const entries = Selector('#bibtex_display').find('.bibtexentry');
    const entriesCount = Selector('#bibtex_display').find('.bibtexentry').count;
    await t
        .expect(entries).ok()
        .expect(entriesCount).eql(5);

    for (var i = 1; i < 5; i++) {
        await t.expect(await entries.nth(i).find('.year').innerText).lte(await entries.nth(i - 1).find('.year').innerText);
    }

})



fixture `Group Test`
    .page `http://0.0.0.0:8000/test/html/group.html`;

test('Check Group ASC String', async t => {
    const entries = Selector('#bibtex_display').find('.bibtexentry');
    const entriesCount = Selector('#bibtex_display').find('.bibtexentry').count;
    const groups = Selector('.group');
    await t
        .expect(entries).ok()
        .expect(entriesCount).eql(5)
        .expect(groups.count).eql(4);

    for (var i = 1; i < 5; i++) {
        await t.expect(await entries.nth(i).find('.year').innerText).lte(await entries.nth(i - 1).find('.year').innerText);
    }

})
