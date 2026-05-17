# FRUS 1989-1992 Volume VIII Memcons and Telcons

A GitHub Pages website for housing declassified memoranda and telephone conversations relevant
to *Foreign Relations of the United States, 1989-1992, Volume VIII, Western Europe*.

The Office of the Historian currently lists this FRUS volume as **Being Researched**.
This repository is a companion finding aid for declassified Bush 41 memcons that
may help map the future volume's documentary base.

The site is designed around the metadata used by the George H. W. Bush
Presidential Library and the National Archives Catalog: date, type, participants,
country, release status, NAID, official PDF link, catalog link, FRUS volume, and
FRUS topic tags.

The current archive data lives in `data/memcons.json`, with a generated
`data/memcons.js` mirror so the page can also render when opened directly from
the filesystem. It combines extracted
Western Europe-relevant records from the Presidential Memcon Files section of
FOIA 2000-0429-F with deduped PDFs from the local Bush memcons extractor output.
Each record includes `pageCount`, calculated from the linked PDF scan.

## Chapter Arrangement

1. United Kingdom
2. France
3. Italy
4. Regional, for all other Western Europe countries

Records inside each chapter are arranged chronologically by `sortDate`.

The data shape lives in `data/memcons.schema.json`, with a small reference subset
in `data/memcons.sample.json`.

## Local PDF Ingest

Run the local importer after placing extractor PDFs on the same machine:

```bash
node scripts/ingest-local-pdfs.js /Users/jameswilson/bush-memcons-extractor/output/pdfs
```

The importer copies deduped Western Europe PDFs into `documents/`, appends matching
records to `data/memcons.json`, refreshes `data/memcons.js`, and writes a review report to
`reports/local-pdf-ingest.json`. It intentionally holds back oversized local
packets above 75 pages for manual review before publication.

## Source Anchors

- FRUS 1989-1992, Volume VIII, Western Europe: <https://history.state.gov/historicaldocuments/frus1989-92v08>
- Bush Library Memcons and Telcons index: <https://www.bush41library.gov/digital-research-room/about-textual-collections/memcons-and-telcons>
- FOIA 2000-0429-F finding aid: <https://www.bush41library.gov/digital-research-room/finding-aid/foia/records-memcons-and-telcons-january-1989-december-1991>
- National Archives Catalog: <https://catalog.archives.gov/>

## Local Preview

Run a local static server so the page can fetch `data/memcons.json`:

```bash
python3 -m http.server 4181
```

Then open <http://127.0.0.1:4181/>.

## Publish

This repository deploys through GitHub Pages with `.github/workflows/deploy-pages.yml`.

After the first push to `main`, open the repository settings on GitHub, go to **Pages**, and set the source to **GitHub Actions** if it is not already selected.
