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

The current archive contains 397 unique memcon and telcon records. Its data lives in `data/memcons.json`, with a generated
`data/memcons.js` mirror so the page can also render when opened directly from
the filesystem. It combines extracted Western Europe-relevant records from the
Presidential Memcon Files section of FOIA 2000-0429-F, Brent Scowcroft Papers
presidential memcon and telcon files, and deduped PDFs from the local Bush
memcons extractor output.
Each record includes `pageCount`, counting only memorandum or
telephone-conversation text pages. Provenance sheets included in project PDFs
are tracked separately with `provenancePages`. All records now have an OA/ID-based
Source Note; none remain in project-only provenance.

The Public Papers reference section lives in `data/public-statements.json`, with
a generated `data/public-statements.js` mirror. It indexes George H. W. Bush
public statements from GovInfo's *Public Papers of the Presidents* collection
that are titled around Western Europe countries, leaders, NATO, the European
Community, CSCE, G-7 summitry, German unification, or related regional terms.
The harvester also uses bounded full-text matching for GovInfo granules and
GovInfo search results, while filtering out common false positives such as
domestic place names and body-only administrative matches.

## Chapter Arrangement

1. United Kingdom
2. France
3. Italy
4. Regional, for all other Western Europe countries
5. Reference: Germany, kept separate from the chapter sequence
6. Tentative chapter: The United States and the CSCE, 1989-1992

Records inside each chapter or reference section are arranged chronologically by
`sortDate`. The Germany reference section restores the Germany-specific records
from the earlier exclusion audit, including all identified Bush memcons and
telcons with Helmut Kohl, East German leader Lothar de Maiziere, and related
German officials found in the same source base. Twelve multilateral records in
the Regional chapter are cross-referenced into Germany without duplicating the
underlying document, producing 112 Germany reference entries. It also lists the withheld
January 23, 1992 Bush-Kohl telcon documented by the Scowcroft withdrawal sheet
and splits the two distinct February 13, 1990 Bush-Kohl telcons into separate
records. Local packets that contain only NSC cover/transmittal memoranda and
administrative markers are excluded from active counts.

The data shape lives in `data/memcons.schema.json`, with a small reference subset
in `data/memcons.sample.json`.

## Tentative CSCE Chapter

`data/csce-chapter.json` and its JavaScript mirror keep four evidence lanes
separate: 14 item-level candidate documents, 38 NSC/NSC-DC/follow-up/NSR/NSD
policy files, 365 deduplicated Bush Library finding-aid locators, and 49 matching
Public Papers references. Sixteen policy files have exact item extents transcribed
from withdrawal sheets; the remainder carry an explicit compiler planning range.
Folder-level locators do not receive Source Notes until an item has been reviewed.

Rebuild the current archival register with:

```bash
node scripts/reconcile-bush41-index.js
node scripts/harvest-csce-chapter.js
node scripts/audit-woerner-coverage.js
node scripts/validate-data.js
```

## Public Papers Reference

Run the GovInfo Public Papers harvester when the public-statement reference set
needs to be rebuilt:

```bash
node scripts/harvest-govinfo-public-statements.js
```

The script reads GovInfo document-in-context pages for the Bush 41 Public Papers
volumes and writes `data/public-statements.json`,
`data/public-statements.js`, and
`reports/govinfo-public-statements-audit.json`. GovInfo item-level granules and
GovInfo full-text search results are used where available. For scanned or
volume-only GovInfo packages, the record is anchored to the corresponding
GovInfo volume package and uses the American Presidency Project public-text
mirror only to identify the individual title and date pending GovInfo item-level
availability.

The reconciliation script keeps clean FRUS-style Source Notes separate from the
full working provenance trail and records current Bush Library index matches in
`reports/bush-library-current-index-audit.json`.

## Metadata Maintenance

Run the quality gate before publishing:

```bash
node scripts/validate-data.js
```

The validator writes `reports/data-quality-audit.json` and fails on duplicate
IDs, missing local PDFs, malformed title or date lines, URLs in Source Notes,
missing OA/IDs or classifications, Germany records without a reference placement,
CSCE evidence-lane leakage, and folder locators misrepresented as documents. It
also checks local PDF page totals against `pageCount + provenancePages` and both
JavaScript data mirrors against their JSON sources.

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
in the FRUS-style Source Note sentence. The quality gate enforces that separation.

## Local PDF Ingest

Run the local importer after placing extractor PDFs on the same machine:

```bash
node scripts/ingest-local-pdfs.js /Users/jameswilson/bush-memcons-extractor/output/pdfs
```

The importer copies deduped Western Europe PDFs into `documents/`, appends matching
records to `data/memcons.json`, refreshes `data/memcons.js`, and writes a review report to
`reports/local-pdf-ingest.json`. It intentionally holds back oversized local
packets above 75 pages for manual review before publication.
After any ingest, rerun `reconcile-bush41-index.js` and `validate-data.js` before publishing.

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
This is a historical restoration path. Follow it with the current reconciliation
and validation scripts so Source Notes and cross-references return to the active standard.

## Source Anchors

- FRUS 1989-1992, Volume VIII, Western Europe: <https://history.state.gov/historicaldocuments/frus1989-92v08>
- Bush Library Memcons and Telcons index: <https://www.bush41library.gov/digital-research-room/about-textual-collections/memcons-and-telcons>
- FOIA 2000-0429-F finding aid: <https://www.bush41library.gov/digital-research-room/finding-aid/foia/records-memcons-and-telcons-january-1989-december-1991>
- Brent Scowcroft Papers finding aid: <https://www.bush41library.gov/digital-research-room/finding-aid/brent-scowcroft-papers>
- National Archives Catalog: <https://catalog.archives.gov/>
- GovInfo Public Papers, George H. W. Bush: <https://www.govinfo.gov/app/collection/ppp/president-41_Bush,%20George%20H.%20W.>
- Bush Library CSCE finding aid, 2003-0373-F: <https://www.bush41library.gov/digital-research-room/finding-aid/foia/records-conference-security-and-cooperation-europe-csce>
- NARA NSC/DC Meetings series: <https://catalog.archives.gov/id/312294079>

## Local Preview

Run a local static server so the page can fetch `data/memcons.json`:

```bash
python3 -m http.server 8000
```

Then open <http://127.0.0.1:8000/>.

## Publish

This repository deploys through GitHub Pages with `.github/workflows/deploy-pages.yml`.

After the first push to `main`, open the repository settings on GitHub, go to **Pages**, and set the source to **GitHub Actions** if it is not already selected.
