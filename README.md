# Bush 41 Declassified Memcons

A GitHub Pages website for housing declassified memoranda of conversation between
President George H. W. Bush and foreign heads of state.

The site is designed around the metadata used by the George H. W. Bush
Presidential Library and the National Archives Catalog: date, type, participants,
country, release status, NAID, official PDF link, and catalog link.

The starter data shape lives in `data/memcons.schema.json`, with official-source
examples in `data/memcons.sample.json`.

## Source Anchors

- Bush Library Memcons and Telcons index: <https://www.bush41library.gov/digital-research-room/about-textual-collections/memcons-and-telcons>
- FOIA 2000-0429-F finding aid: <https://www.bush41library.gov/digital-research-room/finding-aid/foia/records-memcons-and-telcons-january-1989-december-1991>
- National Archives Catalog: <https://catalog.archives.gov/>

## Local Preview

Open `index.html` in a browser.

## Publish

This repository deploys through GitHub Pages with `.github/workflows/deploy-pages.yml`.

After the first push to `main`, open the repository settings on GitHub, go to **Pages**, and set the source to **GitHub Actions** if it is not already selected.
