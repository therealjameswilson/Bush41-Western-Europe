# FRUS 1989-1992 Volume VIII Memcons

A GitHub Pages website for housing declassified memoranda of conversation relevant
to *Foreign Relations of the United States, 1989-1992, Volume VIII, Western Europe*.

The Office of the Historian currently lists this FRUS volume as **Being Researched**.
This repository is a companion finding aid for declassified Bush 41 memcons that
may help map the future volume's documentary base.

The site is designed around the metadata used by the George H. W. Bush
Presidential Library and the National Archives Catalog: date, type, participants,
country, release status, NAID, official PDF link, catalog link, FRUS volume, and
FRUS topic tags.

The starter data shape lives in `data/memcons.schema.json`, with official-source
examples in `data/memcons.sample.json`.

## Source Anchors

- FRUS 1989-1992, Volume VIII, Western Europe: <https://history.state.gov/historicaldocuments/frus1989-92v08>
- Bush Library Memcons and Telcons index: <https://www.bush41library.gov/digital-research-room/about-textual-collections/memcons-and-telcons>
- FOIA 2000-0429-F finding aid: <https://www.bush41library.gov/digital-research-room/finding-aid/foia/records-memcons-and-telcons-january-1989-december-1991>
- National Archives Catalog: <https://catalog.archives.gov/>

## Local Preview

Open `index.html` in a browser.

## Publish

This repository deploys through GitHub Pages with `.github/workflows/deploy-pages.yml`.

After the first push to `main`, open the repository settings on GitHub, go to **Pages**, and set the source to **GitHub Actions** if it is not already selected.
