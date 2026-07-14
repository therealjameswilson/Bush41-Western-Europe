window.COMPILER_GAPS = [
  {
    "id": "gap-local-citation-sheets",
    "priority": "Critical",
    "status": "Remediated",
    "title": "Reconcile project-only local extractor records against official citation sheets",
    "evidence": "0 records remain project-only. All 397 memcons and telcons now carry an OA/ID-based Source Note and separate working provenance.",
    "nextAction": "Keep project-only provenance at zero as newly discovered scans are ingested.",
    "targetCount": 0
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
    "status": "Remediated",
    "title": "Resolve unknown release status records",
    "evidence": "0 records retain an unknown release status: 322 are full, 47 partial, 17 denied, 10 declassified, and 1 is withheld under b(1).",
    "nextAction": "Recheck status against later Bush Library openings before final selection.",
    "targetCount": 0
  },
  {
    "id": "gap-broader-source-classes",
    "priority": "Medium",
    "status": "Partly remediated",
    "title": "Expand non-memcon source classes across every chapter",
    "evidence": "The CSCE chapter now stages 38 NSC, NSC/DC, follow-up, NSR, and NSD policy files. State central files, Baker files, embassy reporting, defense files, and intelligence/context files still need chapter-wide sweeps.",
    "nextAction": "Extend the source-family sweep beyond CSCE before treating any chapter as selection-complete.",
    "targetCount": 38
  }
];
