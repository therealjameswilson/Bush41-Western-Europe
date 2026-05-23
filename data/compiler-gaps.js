window.COMPILER_GAPS = [
  {
    "id": "gap-local-citation-sheets",
    "priority": "Critical",
    "status": "Partly remediated",
    "title": "Reconcile project-only local extractor records against official citation sheets",
    "evidence": "35 records remain marked citation-sheet extraction pending; clean Source Notes are separated from full provenance so they no longer masquerade as final FRUS citations.",
    "nextAction": "Use the PDF citation sheets or official catalog items to replace project-only provenance before final document selection.",
    "targetCount": 35
  },
  {
    "id": "gap-source-note-working-metadata",
    "priority": "High",
    "status": "Remediated",
    "title": "Keep URLs and project metadata out of FRUS-style Source Notes",
    "evidence": "0 displayed Source Notes still contain URLs; full URLs are retained in provenanceNote/provenanceLinks.",
    "nextAction": "Use sourceNote for FRUS-style citation text and provenanceNote/provenanceLinks for working metadata.",
    "targetCount": 0
  },
  {
    "id": "gap-public-papers-full-text",
    "priority": "High",
    "status": "Remediated",
    "title": "Broaden Public Papers beyond title-only selection",
    "evidence": "483 public-statement references are now staged, including 155 full-text matches and title matches. GovInfo granules and full-text search are preferred over APP volume references.",
    "nextAction": "Use the match-basis filter to separate high-precision title hits from broader full-text context.",
    "targetCount": 155
  },
  {
    "id": "gap-duplicate-disambiguation",
    "priority": "Medium",
    "status": "Remediated",
    "title": "Disambiguate same-day/same-title conversations",
    "evidence": "4 records now carry same-day duplicate disambiguation notes keyed to source pages.",
    "nextAction": "Use source-page cues when selecting or citing same-day calls.",
    "targetCount": 4
  },
  {
    "id": "gap-release-status-unknown",
    "priority": "Medium",
    "status": "Open",
    "title": "Resolve unknown release status records",
    "evidence": "35 records still have unknown release status, mostly because official catalog/citation metadata has not been reconciled.",
    "nextAction": "Resolve with Bush Library catalog records or citation sheets.",
    "targetCount": 35
  },
  {
    "id": "gap-broader-source-classes",
    "priority": "Medium",
    "status": "Open",
    "title": "Search non-memcon source classes before closing selection",
    "evidence": "The current site is strongest for memcons, telcons, Scowcroft, and Public Papers. State Department central files, Baker files, embassy reporting, defense files, and intelligence/context files are not yet systematically represented.",
    "nextAction": "Add source-family sweeps or explicit exclusion notes before treating the volume as source-complete.",
    "targetCount": 0
  }
];
