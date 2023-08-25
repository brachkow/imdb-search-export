const { chromium } = require('playwright');
const fs = require('fs');

const SEARCH_URL =
  'https://www.imdb.com/search/title/?title_type=feature&user_rating=7.5,&runtime=,100&start=1';
const HEADER_SELECTOR = '.lister-item-header';
const YEAR_SELECTOR = '.lister-item-year';
const NAME_SELECTOR = 'a';
const PAGE_SIZE = 50;
const PAGES = 1;

(async () => {
  const browser = await chromium.launch(); // Or 'firefox' or 'webkit'.
  const context = await browser.newContext({ locale: 'en-US' });

  const pageStarts = [...Array(PAGES)].map(
    (_value, page) => 1 + page * PAGE_SIZE,
  );

  const movies = [];

  for (const start of pageStarts) {
    console.log(`Parsing page ${Math.floor(start / PAGE_SIZE) + 1}…`);
    const searchURL = new URL(SEARCH_URL);
    searchURL.searchParams.set('start', `${start}`);

    const page = await context.newPage();
    await page.goto(searchURL.toString(), {
      waitUntil: 'networkidle0',
    });

    const headerEls = await page.$$(HEADER_SELECTOR);

    for (const headerEl of headerEls) {
      const nameEl = await headerEl.$(NAME_SELECTOR);
      const yearEl = await headerEl.$(YEAR_SELECTOR);

      const title = await nameEl.innerText();
      const imdbID = (await nameEl.getAttribute('href'))
        .match(/tt\d+/gm)
        ?.join('');
      const year = (await yearEl.innerText()).match(/\d{4}/gm)?.join('');

      movies.push({
        Title: title,
        imdbID: imdbID,
        tmdbID: '', // Because letterboxd wants four fields
        Year: year,
      });
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  console.log('Generating CSV…');

  const csv = [
    Object.keys(movies[0]).join(','),
    ...movies.map((movie) => Object.values(movie).join(',')),
  ].join('\n');

  fs.writeFileSync('list.csv', csv);

  console.log('Export finished!');

  await browser.close();
})();
