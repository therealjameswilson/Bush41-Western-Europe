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
the filesystem. It combines extracted Western Europe-relevant records from the
Presidential Memcon Files section of FOIA 2000-0429-F, Brent Scowcroft Papers
presidential memcon and telcon files, and deduped PDFs from the local Bush
memcons extractor output.
Each record includes `pageCount`, calculated from the linked PDF scan.

The Public Papers reference section lives in `data/public-statements.json`, with
a generated `data/public-statements.js` mirror. It indexes George H. W. Bush
public statements from GovInfo's *Public Papers of the Presidents* collection
that are titled around Western Europe countries, leaders, NATO, the European
Community, CSCE, G-7 summitry, German unification, or related regional terms.

## Chapter Arrangement

1. United Kingdom
2. France
3. Italy
4. Regional, for all other Western Europe countries
5. Reference: Germany, kept separate from the chapter sequence

Records inside each chapter or reference section are arranged chronologically by
`sortDate`. The Germany reference section restores the Germany-specific records
from the earlier exclusion audit, including all identified Bush memcons and
telcons with Helmut Kohl, East German leader Lothar de Maiziere, and related
German officials found in the same source base. It also lists the withheld
January 23, 1992 Bush-Kohl telcon documented by the Scowcroft withdrawal sheet
and splits the two distinct February 13, 1990 Bush-Kohl telcons into separate
records.

The data shape lives in `data/memcons.schema.json`, with a small reference subset
in `data/memcons.sample.json`.

## Public Papers Reference

Run the GovInfo Public Papers harvester when the public-statement reference set
needs to be rebuilt:

```bash
node scripts/harvest-govinfo-public-statements.js
```

The script reads GovInfo document-in-context pages for the Bush 41 Public Papers
volumes and writes `data/public-statements.json`,
`data/public-statements.js`, and
`reports/govinfo-public-statements-audit.json`. GovInfo item-level granules are
used where available. For scanned or volume-only GovInfo packages, the record is
anchored to the corresponding GovInfo volume package and uses the American
Presidency Project public-text mirror only to identify the individual title and
date pending GovInfo item-level availability.

## Source Note Standard

Source notes on the site should be drafted from the citation sheet/provenance
marker in the PDF packet, not from the catalog title alone. The archival chain
should follow the published FRUS pattern used in *Foreign Relations, 1989-1992,
Volume XXXI, START I, 1989-1991*: `Source: repository, records group,
collection or office of origin, series, subseries, OA/ID, folder title.` Add
classification, drafting, distribution, meeting-location, and textual-status
sentences only when those facts are visible in the document or citation sheet.

Working metadata such as NAID, catalog URL, digital-object filename, duplicate
source pages, and project-PDF extent should remain in the provenance trail, not
in the FRUS-style Source Note sentence. Records whose provenance still depends
only on local extractor output are treated as source-note gaps until their PDF
citation sheet has been reconciled.

## Local PDF Ingest

Run the local importer after placing extractor PDFs on the same machine:

```bash
node scripts/ingest-local-pdfs.js /Users/jameswilson/bush-memcons-extractor/output/pdfs
```

The importer copies deduped Western Europe PDFs into `documents/`, appends matching
records to `data/memcons.json`, refreshes `data/memcons.js`, and writes a review report to
`reports/local-pdf-ingest.json`. It intentionally holds back oversized local
packets above 75 pages for manual review before publication.

## Germany Reference Restore

Run the restoration script if the Germany reference set needs to be rebuilt from
the historical pre-exclusion data:

```bash
node scripts/restore-germany-reference.js
```

The script reads `reports/germany-regional-exclusion-audit.json`, restores the
excluded Germany records from historical git ref `1915d3d`, supplements the
Scowcroft-only February 13, 1990 and January 23, 1992 Kohl telcon records,
writes the Germany reference section to `data/memcons.json` and
`data/memcons.js`, restores the local Scowcroft PDF scans, and writes
`reports/germany-reference-restoration-audit.json`.

## Source Anchors

- FRUS 1989-1992, Volume VIII, Western Europe: <https://history.state.gov/historicaldocuments/frus1989-92v08>
- Bush Library Memcons and Telcons index: <https://www.bush41library.gov/digital-research-room/about-textual-collections/memcons-and-telcons>
- FOIA 2000-0429-F finding aid: <https://www.bush41library.gov/digital-research-room/finding-aid/foia/records-memcons-and-telcons-january-1989-december-1991>
- Brent Scowcroft Papers finding aid: <https://www.bush41library.gov/digital-research-room/finding-aid/brent-scowcroft-papers>
- National Archives Catalog: <https://catalog.archives.gov/>
- GovInfo Public Papers, George H. W. Bush: <https://www.govinfo.gov/app/collection/ppp/president-41_Bush,%20George%20H.%20W.>

## Local Preview

Run a local static server so the page can fetch `data/memcons.json`:

```bash
python3 -m http.server 4181
```

Then open <http://127.0.0.1:4181/>.

## Publish

This repository deploys through GitHub Pages with `.github/workflows/deploy-pages.yml`.

After the first push to `main`, open the repository settings on GitHub, go to **Pages**, and set the source to **GitHub Actions** if it is not already selected.
