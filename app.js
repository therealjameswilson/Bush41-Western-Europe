const CHAPTER_ORDER = ["United Kingdom", "France", "Italy", "Regional", "Germany Reference"];
const MAIN_VOLUME_CHAPTERS = CHAPTER_ORDER.filter((chapterName) => chapterName !== "Germany Reference");

const recordsRoot = document.querySelector("#records-root");
const totalRecords = document.querySelector("#total-records");
const totalPages = document.querySelector("#total-pages");
const searchInput = document.querySelector("#record-search");
const chapterFilter = document.querySelector("#chapter-filter");
const typeFilter = document.querySelector("#type-filter");
const releaseFilter = document.querySelector("#release-filter");
const compilerFilter = document.querySelector("#compiler-filter");
const recordsSummary = document.querySelector("#records-summary");
const clearFilters = document.querySelector("#clear-filters");
const compilerRoot = document.querySelector("#compiler-root");
const publicStatementsRoot = document.querySelector("#public-statements-root");
const publicStatementsCount = document.querySelector("#public-statements-count");
const publicStatementSearch = document.querySelector("#public-statement-search");
const publicStatementCountryFilter = document.querySelector("#public-statement-country-filter");
const publicStatementTypeFilter = document.querySelector("#public-statement-type-filter");
const publicStatementSourceFilter = document.querySelector("#public-statement-source-filter");
const publicStatementBasisFilter = document.querySelector("#public-statement-basis-filter");
const publicStatementClear = document.querySelector("#public-statement-clear");
const publicStatementSummary = document.querySelector("#public-statement-summary");
const compilerGapsRoot = document.querySelector("#compiler-gaps-root");
const csceRoot = document.querySelector("#csce-root");
const csceMetrics = document.querySelector("#csce-metrics");
const csceSearch = document.querySelector("#csce-search");
const csceSummary = document.querySelector("#csce-summary");
const csceCandidateCount = document.querySelector("#csce-candidate-count");

let allRecords = [];
let allPublicStatements = [];
let allCompilerGaps = [];
let allDailyDiaryReferences = { dates: {} };
let csceChapter = null;
let csceView = "documents";
let csceLeadLimit = 80;

const COMPILER_QUEUE_OPTIONS = [
  ["", "All compiler queues"],
  ["declassification", "Declassification ledger"],
  ["presidential", "Presidential conversations"],
  ["citation-sheet", "Source note gaps"],
  ["unpaged", "Page count gaps"],
  ["no-pdf", "PDF gaps"],
  ["local", "Project-only records"]
];

function chapterId(chapterName) {
  return `chapter-${chapterName.toLowerCase().replaceAll(" ", "-")}`;
}

function chapterHeading(chapterName) {
  if (chapterName === "Germany Reference") return "Reference: Germany";
  return `Chapter ${CHAPTER_ORDER.indexOf(chapterName) + 1}: ${chapterName}`;
}

function formatDate(dateString) {
  const date = new Date(`${dateString}T00:00:00Z`);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC"
  }).format(date);
}

function shortDate(dateString) {
  const date = new Date(`${dateString}T00:00:00Z`);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC"
  }).format(date);
}

function byChapterThenDate(a, b) {
  return (
    a.chapter.number - b.chapter.number ||
    a.sortDate.localeCompare(b.sortDate) ||
    a.title.localeCompare(b.title)
  );
}

function byDateThenChapter(a, b) {
  return (
    a.sortDate.localeCompare(b.sortDate) ||
    a.chapter.number - b.chapter.number ||
    a.title.localeCompare(b.title)
  );
}

function isReleasedDocument(record) {
  return /^(Declassified|Full|Partial|Unrestricted)$/i.test(record.releaseStatus || "");
}

function recordInChapter(record, chapterName) {
  return record.chapter?.name === chapterName || (record.referenceSections || []).includes(chapterName);
}

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function uniqueInOrder(values) {
  const seen = new Set();
  return values.filter((value) => {
    if (!value || seen.has(value)) return false;
    seen.add(value);
    return true;
  });
}

function setChapterCounts(records) {
  const mainVolumeRecords = records.filter((record) => MAIN_VOLUME_CHAPTERS.includes(record.chapter.name));
  const germanyReferenceRecords = records.filter((record) => recordInChapter(record, "Germany Reference"));
  const germanyRecords = document.querySelector("#germany-records");
  const germanyPages = document.querySelector("#germany-pages");

  totalRecords.textContent = mainVolumeRecords.length.toString();
  totalPages.textContent = mainVolumeRecords.reduce((sum, record) => sum + (record.pageCount || 0), 0).toString();
  if (germanyRecords) germanyRecords.textContent = germanyReferenceRecords.length.toString();
  if (germanyPages) {
    germanyPages.textContent = germanyReferenceRecords
      .reduce((sum, record) => sum + (record.pageCount || 0), 0)
      .toString();
  }

  for (const chapterName of CHAPTER_ORDER) {
    const chapterRecords = records.filter((record) => recordInChapter(record, chapterName));
    const countNode = document.querySelector(`[data-chapter-count="${chapterName}"]`);
    const pagesNode = document.querySelector(`[data-chapter-pages="${chapterName}"]`);
    const pageTotal = chapterRecords.reduce((sum, record) => sum + (record.pageCount || 0), 0);

    if (countNode) {
      countNode.textContent = chapterRecords.length.toString();
    }
    if (pagesNode) {
      pagesNode.textContent = pageTotal.toString();
    }
  }
}

function addOptions(select, values, label) {
  if (!select) return;
  const options = [new Option(label, ""), ...values.map((value) => new Option(value, value))];
  select.replaceChildren(...options);
}

function populateFilters(records) {
  addOptions(chapterFilter, CHAPTER_ORDER, "All chapters");
  addOptions(typeFilter, uniqueSorted(records.map((record) => record.type)), "All document types");
  addOptions(releaseFilter, uniqueSorted(records.map((record) => record.releaseStatus)), "All release statuses");
  if (compilerFilter) {
    compilerFilter.replaceChildren(
      ...COMPILER_QUEUE_OPTIONS.map(([value, label]) => new Option(label, value))
    );
  }
}

function assignCompilerNumbers(records) {
  const chapterCounts = new Map();
  for (const record of [...records].sort(byChapterThenDate)) {
    const chapterNumber = record.chapter.number;
    const chapterCount = (chapterCounts.get(record.chapter.name) || 0) + 1;
    chapterCounts.set(record.chapter.name, chapterCount);
    const prefix = record.chapter.name === "Germany Reference" ? "G" : String(chapterNumber);
    record.compilerNumber = `${prefix}.${String(chapterCount).padStart(3, "0")}`;
  }
  return records;
}

function assignPublicStatementNumbers(statements) {
  return [...statements]
    .sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title))
    .map((statement, index) => ({
      ...statement,
      referenceNumber: `PS ${String(index + 1).padStart(3, "0")}`
    }));
}

function releaseText(record) {
  return (record.releaseStatus || "").toLowerCase();
}

function hasCitationSheetSourceNote(record) {
  const note = record.sourceNote || "";
  if (isProjectOnly(record) || record.provenanceStatus === "project-only") return false;
  if (record.provenanceStatus === "citation-sheet") {
    return /^Source:/i.test(note) && /OA\/ID\s+[A-Z0-9-]+/i.test(note);
  }
  return Boolean(
    note.length > 40 &&
      /^Source:/i.test(note) &&
      !/Local Bush memcons extractor output|Project-only working copy|citation sheet reconciliation pending|citation sheet extraction pending|official catalog metadata requires manual reconciliation/i.test(note)
  );
}

function hasSourceNote(record) {
  if (hasCitationSheetSourceNote(record)) return true;
  if (record.provenanceStatus === "catalog-record") return /^Source:/i.test(record.sourceNote || "");
  return false;
}

function needsPageCount(record) {
  return !record.pageCount;
}

function needsPdf(record) {
  return !record.pdfUrl;
}

function isProjectOnly(record) {
  if (record.provenanceStatus === "citation-sheet" || record.provenancePages) return false;
  return (
    record.naid?.startsWith("local-") ||
    /local/i.test(record.source?.name || "") ||
    (!record.catalogUrl && Boolean(record.pdfUrl))
  );
}

function isDeclassificationQueue(record) {
  return /restricted|withheld|unknown|partial|denied|possibly|excised/.test(releaseText(record));
}

function isPresidentialConversation(record) {
  return (
    (record.participants || []).some((participant) => /George H\.? W\.? Bush|President Bush/i.test(participant)) ||
    /President Bush|George H\.? W\.? Bush/i.test(`${record.title || ""} ${record.subjectLine || ""}`)
  );
}

function matchesCompilerQueue(record, queue) {
  if (!queue) return true;
  if (queue === "declassification") return isDeclassificationQueue(record);
  if (queue === "presidential") return isPresidentialConversation(record);
  if (queue === "citation-sheet") return !hasCitationSheetSourceNote(record);
  if (queue === "unpaged") return needsPageCount(record);
  if (queue === "no-pdf") return needsPdf(record);
  if (queue === "local") return isProjectOnly(record);
  return true;
}

function compilerFlags(record) {
  return [
    isDeclassificationQueue(record) ? "Declassification review" : "",
    record.provenanceStatus === "catalog-record" ? "Catalog-only source" : "",
    !hasCitationSheetSourceNote(record) ? "Source note needed" : "",
    needsPageCount(record) ? "Page count gap" : "",
    needsPdf(record) ? "PDF gap" : "",
    isProjectOnly(record) ? "Project-only provenance" : ""
  ].filter(Boolean);
}

function normalizeSeriesName(series = "") {
  return series
    .replace(/^H-Files\s+-\s+/i, "H-Files, ")
    .replace(/National Security Council \(NSC\)\/Deputies Committee \(DC\)/i, "NSC/DC")
    .replace(/National Security Council \(NSC\) Meeting Files/i, "NSC Meetings Files")
    .replace(/National Security Review \(NSR\)/i, "NSR")
    .replace(/National Security Directive \(NSD\)/i, "NSD")
    .replace(/Intelligence File \(IF\)/i, "Intelligence File")
    .replace(/\s+Files\s+Files$/i, " Files")
    .trim();
}

function cleanFolderTitle(record) {
  const rawTitle = record.sourceTitle || record.documentTitle || record.title || "";
  const pieces = rawTitle
    .split(";")
    .map((piece) => piece.trim())
    .filter(Boolean)
    .filter((piece) => !/\.pdf$/i.test(piece))
    .filter((piece) => !/^source pages?\b/i.test(piece))
    .filter((piece) => piece !== record.localIdentifier);

  if (/^H-Files/i.test(rawTitle)) {
    return record.documentTitle || record.title || pieces[0] || "";
  }
  return pieces.join(", ") || record.documentTitle || record.title || "";
}

function sourcePageRange(record) {
  const source = record.source || {};
  if (source.sourcePages) return source.sourcePages;

  const sourceTitleMatch = (record.sourceTitle || "").match(/source pages?\s+([^;]+)/i);
  if (sourceTitleMatch) return sourceTitleMatch[1].trim();

  const sourceNoteMatch = (record.sourceNote || "").match(/source pages?\s+([0-9,\-\s]+)/i);
  return sourceNoteMatch ? sourceNoteMatch[1].trim() : "";
}

function oaId(record) {
  if (record.localIdentifier) return record.localIdentifier;
  const noteMatch = (record.sourceNote || "").match(/OA\/ID\s+([A-Z0-9-]+)/i);
  return noteMatch ? noteMatch[1] : "";
}

function frusRepository(record) {
  const sourceText = `${record.source?.name || ""} ${record.source?.series || ""} ${record.sourceNote || ""}`;
  if (/Brent Scowcroft|Scowcroft/i.test(sourceText)) {
    return "George H.W. Bush Library, Bush Presidential Records, Brent Scowcroft Collection";
  }
  if (/National Security Council|H-Files|NSC/i.test(sourceText)) {
    return "George H.W. Bush Library, Bush Presidential Records, National Security Council";
  }
  return record.source?.referenceUnit || record.source?.name || "Repository not yet identified";
}

function frusSeriesParts(record) {
  const source = record.source || {};
  const sourceText = `${source.name || ""} ${source.series || ""} ${record.sourceTitle || ""} ${record.type || ""}`;

  if (/Brent Scowcroft|Scowcroft/i.test(sourceText)) {
    const typeText = `${record.type || ""} ${record.title || ""}`;
    const isTelcon = /telcon|telephone/i.test(typeText);
    const isMemcon = !isTelcon && /memcon|meeting/i.test(typeText);
    return uniqueInOrder([
      "Presidential Correspondence Files",
      isTelcon ? "Presidential Telcon Files" : "",
      isMemcon ? "Presidential Memcon Files" : ""
    ]);
  }

  return uniqueInOrder([normalizeSeriesName(source.series)]);
}

function frusLocatorParts(record) {
  const source = record.source || {};
  const locator = [];
  const identifier = oaId(record);
  const folderTitle = cleanFolderTitle(record);
  const pages = sourcePageRange(record);

  if (identifier) locator.push(`OA/ID ${identifier}`);
  if (folderTitle) locator.push(folderTitle);
  if (pages) locator.push(`source pages ${pages}`);
  return locator;
}

function frusReleaseSentence(record) {
  const status = record.releaseStatus || "Release status not yet recorded";
  if (/declassified/i.test(status)) return "Declassified.";
  if (/full/i.test(status)) return "Full release.";
  if (/partial/i.test(status)) return `Partial release: ${status}.`;
  if (/restricted|withheld|denied|possibly|excised/i.test(status)) return `Access restriction: ${status}.`;
  if (/unknown/i.test(status)) return "Release status not determined.";
  return `${status}.`;
}

function frusExtentSentence(record) {
  if (!record.pageCount) return "";
  const extent = `${record.pageCount} ${record.pageCount === 1 ? "page" : "pages"}`;
  if (isDeclassificationQueue(record)) return `Approximate extent: ${extent}.`;
  return `Project PDF extent: ${extent}.`;
}

function foiaSentence(record) {
  const foias = uniqueInOrder([...(record.foiaNumbers || []), record.source?.foiaNumber]);
  return foias.length ? `FOIA: ${foias.join(", ")}.` : "";
}

function duplicateProvenanceSentence(record) {
  const duplicates = record.source?.duplicateSources || [];
  if (!duplicates.length) return "";

  const provenance = duplicates
    .map((duplicate) =>
      uniqueInOrder([
        duplicate.sourceName,
        duplicate.series,
        duplicate.localIdentifier ? `OA/ID ${duplicate.localIdentifier}` : "",
        duplicate.sourceFile,
        duplicate.sourcePages ? `source pages ${duplicate.sourcePages}` : "",
        duplicate.naid ? `NAID ${duplicate.naid}` : ""
      ]).join(", ")
    )
    .filter(Boolean)
    .join("; ");

  return provenance ? `Deduped related provenance: ${provenance}.` : "";
}

function frusStyleSourcePathFromNote(note) {
  if (!/^Source:/i.test(note || "")) return "";

  const normalized = note
    .replace(/\s+/g, " ")
    .replace(/George H\.W\. Bush Presidential Records/g, "Bush Presidential Records")
    .replace(/Scowcroft,\s*Brent,\s*Collection/g, "Brent Scowcroft Collection")
    .replace(/--/g, " - ")
    .trim();

  const workingMetadataMarkers = [
    ". NAID ",
    ", NAID ",
    ". Full.",
    ". Full release.",
    ", Full,",
    ", Full.",
    ". Declassified.",
    ", Declassified,",
    ", Declassified.",
    ". Originally processed under FOIA",
    ", Originally processed under FOIA",
    ". The project PDF includes",
    ", The project PDF includes",
    ". Catalog:",
    ", Catalog:",
    ". Digital copy:",
    ", Digital copy:",
    ". Series:",
    ", Series:",
    ". Project PDF",
    ", project PDF",
    ". Access restricted:",
    ", Access restricted:"
  ];

  const end = workingMetadataMarkers.reduce((earliest, marker) => {
    const index = normalized.toLowerCase().indexOf(marker.toLowerCase());
    if (index === -1) return earliest;
    return earliest === -1 ? index : Math.min(earliest, index);
  }, -1);

  const sourcePath = (end === -1 ? normalized : normalized.slice(0, end))
    .replace(/[,.]\s*$/, "")
    .trim();

  return sourcePath ? `${sourcePath}.` : "";
}

function supplementalSourceNoteSentences(record) {
  const sentences = [];
  const classification = record.classification || record.securityClassification;

  if (classification) {
    sentences.push(`${classification}.`);
  }

  if (/withheld|restricted|denied|excised/i.test(record.releaseStatus || "")) {
    const extent = record.pageCount
      ? ` Approximate extent: ${record.pageCount} ${record.pageCount === 1 ? "page" : "pages"}.`
      : "";
    sentences.push(`Not declassified.${extent}`.trim());
  }

  return sentences;
}

function generateFrusSourceNote(record) {
  if (isProjectOnly(record) || record.provenanceStatus === "project-only") {
    return "Source: Citation sheet extraction pending. Use the full provenance trail below for temporary project-only identification.";
  }

  if (hasCitationSheetSourceNote(record)) {
    return record.sourceNote.replace(/\s+/g, " ").trim();
  }

  if (record.sourceNote && /Local Bush memcons extractor output|official catalog metadata requires manual reconciliation|citation sheet extraction pending/i.test(record.sourceNote)) {
    return "Source: Citation sheet extraction pending. Use the full provenance trail below for temporary project-only identification.";
  }

  const source = record.source || {};
  const sourcePath = uniqueInOrder([
    frusRepository(record),
    ...frusSeriesParts(record),
    ...frusLocatorParts(record).filter((part) => !/^source pages?\b/i.test(part))
  ]).join(", ");

  return [
    `Source: ${sourcePath || "Provenance pending"}.`,
    ...supplementalSourceNoteSentences(record)
  ]
    .filter(Boolean)
    .join(" ");
}

function sourceDisplay(record) {
  const sourceText = `${record.source?.name || ""} ${record.sourceNote || ""} ${record.type || ""}`;
  if (/Brent Scowcroft/i.test(sourceText)) {
    return `Brent Scowcroft Collection / ${isTelconDisplay(record) ? "Presidential Telcon Files" : "Presidential Memcons Files"}`;
  }
  if (isProjectOnly(record) || record.provenanceStatus === "project-only") {
    return "Project-only PDF / citation sheet pending";
  }
  if (record.provenanceStatus === "catalog-record") {
    return "National Security Council / catalog record";
  }
  return record.source?.series || record.source?.name || "Source series pending";
}

function isTelconDisplay(record) {
  return record.type === "Telcon" || /telephone|telcon/i.test(`${record.title || ""} ${record.documentTitle || ""}`);
}

function createMeta(record) {
  const meta = document.createElement("div");
  meta.className = "record-meta";

  for (const value of [
    record.type,
    record.countries?.filter((country) => country !== "United States").join(", "),
    record.pageCount ? `${record.pageCount} ${record.pageCount === 1 ? "page" : "pages"}` : "Pages pending",
    record.localIdentifier,
    record.naid?.startsWith("local-") ? "Local PDF" : `NAID ${record.naid}`,
    record.releaseStatus
  ]) {
    if (!value) continue;
    const item = document.createElement("span");
    item.textContent = value;
    meta.append(item);
  }

  return meta;
}

function createTopicList(record) {
  const topics = uniqueSorted([...(record.frusTopics || []), ...(record.topics || [])]).slice(0, 6);

  const list = document.createElement("div");
  list.className = "record-topics";
  for (const topic of topics) {
    const item = document.createElement("span");
    item.textContent = topic;
    list.append(item);
  }
  return list;
}

function createSourceNote(record) {
  const sourceNote = document.createElement("details");
  sourceNote.className = "record-source-note";

  const summary = document.createElement("summary");
  summary.textContent = "Source Note";

  const frusNote = document.createElement("p");
  frusNote.className = "record-frus-source-note";
  const sourceNoteText = generateFrusSourceNote(record);
  frusNote.textContent = sourceNoteText;

  const actions = document.createElement("div");
  actions.className = "record-copy-actions";
  actions.append(
    createCopyButton("Copy source note", sourceNoteText),
    createCopyButton(
      "Copy entry",
      `${record.documentTitle || record.title}\n\n${record.dateLine || formatDate(record.date)}\n\n1 ${sourceNoteText}`
    )
  );

  const provenanceLabel = document.createElement("p");
  provenanceLabel.className = "record-provenance-label";
  provenanceLabel.textContent = "Full provenance trail";

  const note = document.createElement("p");
  note.className = "record-provenance-text";
  note.textContent = record.provenanceNote || record.sourceNote || "Source: Provenance pending.";

  const dailyDiaryReference = record.suppressDailyDiary ? null : createDailyDiaryReference(record);
  sourceNote.append(summary, actions, frusNote);
  if (dailyDiaryReference) sourceNote.append(dailyDiaryReference);
  sourceNote.append(provenanceLabel, note);
  return sourceNote;
}

function createCopyButton(label, value) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "record-copy-button";
  button.textContent = label;
  button.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const area = document.createElement("textarea");
      area.value = value;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.left = "-9999px";
      document.body.append(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }
    const original = button.textContent;
    button.textContent = "Copied";
    window.setTimeout(() => {
      button.textContent = original;
    }, 1400);
  });
  return button;
}

function createDailyDiaryReference(record) {
  const exactReferences = record.dailyDiaryReferences || [];
  if (exactReferences.length) return createExactDailyDiaryReference(exactReferences);

  const reference = allDailyDiaryReferences?.dates?.[record.date];
  if (!reference) return null;

  const wrapper = document.createElement("div");
  const label = document.createElement("p");
  label.className = "record-provenance-label";
  label.textContent = "Presidential Daily Diary cross-reference";

  const text = document.createElement("p");
  text.className = "record-provenance-text";
  text.append("Same-day scheduling reference: ");

  const items = [reference.diary, reference.backup].filter(Boolean);
  items.forEach((item, index) => {
    if (index) text.append("; ");
    const link = document.createElement("a");
    link.href = item.catalogUrl;
    link.rel = "noreferrer";
    link.target = "_blank";
    link.textContent = `${item.label} ${item.localId}${item.status ? ` (${item.status})` : ""}`;
    text.append(link);
  });

  text.append(". Use for chronology, time, location, attendees, and call status; not for substantive summaries.");
  wrapper.append(label, text);
  return wrapper;
}

function createExactDailyDiaryReference(references) {
  const wrapper = document.createElement("div");
  const label = document.createElement("p");
  label.className = "record-provenance-label";
  label.textContent = "Presidential Daily Diary cross-reference";

  const text = document.createElement("p");
  text.className = "record-provenance-text";
  text.append("Matched scheduling reference: ");

  references.forEach((item, index) => {
    if (index) text.append("; ");
    const link = document.createElement("a");
    link.href = item.pdfUrl || item.catalogUrl;
    link.rel = "noreferrer";
    link.target = "_blank";
    link.textContent = `${item.sourceType || "Daily Diary"} ${item.localIdentifier || item.naid}`;
    text.append(link);
    if (item.matchedTerms?.length) text.append(` (matches ${item.matchedTerms.slice(0, 6).join(", ")})`);
  });

  text.append(". Use for chronology, time, location, attendees, and call status; not for substantive summaries.");
  wrapper.append(label, text);
  return wrapper;
}

function createSubject(record) {
  const subject = document.createElement("p");
  subject.className = "record-subject";
  subject.textContent = record.subjectLine || record.title;
  return subject;
}

function createDateLine(record) {
  const line = document.createElement("p");
  line.className = "record-date-line";
  line.textContent = record.dateLine || formatDate(record.date);
  return line;
}

function createRecordRow(record) {
  const row = document.createElement("article");
  row.className = "record-row";

  const dateStack = document.createElement("div");
  dateStack.className = "record-date-stack";

  const compilerNumber = document.createElement("span");
  compilerNumber.className = "record-doc-number";
  compilerNumber.textContent = `Doc ${record.compilerNumber || "TBD"}`;

  const date = document.createElement("time");
  date.className = "record-date";
  date.dateTime = record.date;
  date.textContent = shortDate(record.date);
  dateStack.append(compilerNumber, date);

  const body = document.createElement("div");
  const title = document.createElement("a");
  title.className = "record-title";
  title.href = record.catalogUrl || record.pdfUrl;
  title.rel = "noreferrer";
  title.textContent = record.documentTitle || record.title;

  const sourceLine = document.createElement("p");
  sourceLine.className = "record-source-line";
  sourceLine.textContent = sourceDisplay(record);

  const flags = document.createElement("div");
  flags.className = "record-flags";
  for (const flag of compilerFlags(record)) {
    const item = document.createElement("span");
    item.textContent = flag;
    flags.append(item);
  }

  body.append(
    title,
    createDateLine(record),
    createSubject(record),
    sourceLine,
    createMeta(record),
    createTopicList(record),
    flags,
    createSourceNote(record)
  );

  const links = document.createElement("div");
  links.className = "record-links";

  if (record.catalogUrl && !record.naid?.startsWith("local-")) {
    const catalog = document.createElement("a");
    catalog.href = record.catalogUrl;
    catalog.rel = "noreferrer";
    catalog.textContent = "Catalog";
    links.append(catalog);
  }

  if (record.pdfUrl) {
    const pdf = document.createElement("a");
    pdf.href = record.pdfUrl;
    pdf.rel = "noreferrer";
    pdf.textContent = "Open PDF";
    links.append(pdf);

    const print = document.createElement("a");
    print.href = record.pdfUrl;
    print.rel = "noreferrer";
    print.target = "_blank";
    print.textContent = "Print PDF";
    links.append(print);
  }

  row.append(dateStack, body, links);
  return row;
}

function getSearchText(record) {
  return [
    record.title,
    record.documentTitle,
    record.subjectLine,
    record.dateLine,
    record.type,
    record.releaseStatus,
    record.compilerNumber,
    record.localIdentifier,
    record.naid,
    record.sourceTitle,
    record.sourceNote,
    record.provenanceNote,
    generateFrusSourceNote(record),
    record.source?.series,
    record.source?.name,
    ...(record.dailyDiaryReferences || []).flatMap((reference) => [
      reference.title,
      reference.sourceType,
      reference.naid,
      reference.localIdentifier,
      reference.note,
      ...(reference.matchedTerms || [])
    ]),
    ...(record.compilerRisks || []),
    ...(record.participants || []),
    ...(record.countries || []),
    ...(record.frusTopics || []),
    ...(record.topics || [])
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function filterRecords(records) {
  const query = searchInput?.value.trim().toLowerCase() || "";
  const chapter = chapterFilter?.value || "";
  const type = typeFilter?.value || "";
  const release = releaseFilter?.value || "";
  const compilerQueue = compilerFilter?.value || "";

  return records.filter((record) => {
    if (chapter && !recordInChapter(record, chapter)) return false;
    if (type && record.type !== type) return false;
    if (release && record.releaseStatus !== release) return false;
    if (!matchesCompilerQueue(record, compilerQueue)) return false;
    return !query || getSearchText(record).includes(query);
  });
}

function updateSummary(records) {
  if (!recordsSummary) return;
  const pages = records.reduce((sum, record) => sum + (record.pageCount || 0), 0);
  const queue = compilerFilter?.selectedOptions?.[0]?.textContent || "All compiler queues";
  recordsSummary.textContent = `Showing ${records.length} of ${allRecords.length} records / ${pages} pages in view / ${queue}`;
}

function createMetric(label, value, detail) {
  const card = document.createElement("article");
  card.className = "compiler-card";
  const valueNode = document.createElement("strong");
  valueNode.textContent = value;
  const labelNode = document.createElement("span");
  labelNode.textContent = label;
  const detailNode = document.createElement("p");
  detailNode.textContent = detail;
  card.append(valueNode, labelNode, detailNode);
  return card;
}

function countBy(records, getter) {
  const counts = new Map();
  for (const record of records) {
    const key = getter(record) || "Unspecified";
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

function queueButton(queue, label, count) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "compiler-queue";
  button.textContent = `${label} (${count})`;
  button.addEventListener("click", () => {
    if (compilerFilter) compilerFilter.value = queue;
    updateRecordsView();
    document.querySelector("#records")?.scrollIntoView({ block: "start" });
  });
  return button;
}

function createLedgerList(records) {
  const list = document.createElement("ol");
  list.className = "compiler-ledger-list";
  for (const record of records.slice(0, 8)) {
    const item = document.createElement("li");
    item.textContent = `Doc ${record.compilerNumber}: ${record.dateLine || formatDate(record.date)} - ${record.documentTitle || record.title} (${record.releaseStatus}; ${record.pageCount || "?"} ${record.pageCount === 1 ? "page" : "pages"})`;
    list.append(item);
  }
  if (!records.length) {
    const item = document.createElement("li");
    item.textContent = "No records currently require declassification queue attention.";
    list.append(item);
  }
  return list;
}

function renderCompilerDesk(records) {
  if (!compilerRoot) return;
  const pages = records.reduce((sum, record) => sum + (record.pageCount || 0), 0);
  const sourceReady = records.filter(hasSourceNote).length;
  const sheetDerived = records.filter((record) => /^(?:citation-sheet|withdrawal-sheet)$/i.test(record.provenanceStatus || "")).length;
  const declassification = records.filter(isDeclassificationQueue);
  const presidential = records.filter(isPresidentialConversation);
  const citationSheetGaps = records.filter((record) => !hasCitationSheetSourceNote(record));
  const pageGaps = records.filter(needsPageCount);
  const pdfGaps = records.filter(needsPdf);
  const projectOnly = records.filter(isProjectOnly);
  const sorted = [...records].sort(byChapterThenDate);
  const dateSpan = sorted.length
    ? `${formatDate(sorted[0].date)} to ${formatDate(sorted[sorted.length - 1].date)}`
    : "No dated records";

  const metrics = document.createElement("div");
  metrics.className = "compiler-metrics";
  metrics.append(
    createMetric("Candidate documents", records.length.toString(), "Numbered for compiler citation by chapter sequence."),
    createMetric("Document pages", pages.toString(), "Measured or estimated pages visible in the working set."),
    createMetric("FRUS-style Source Notes", `${sourceReady}/${records.length}`, "Repository, record group, series, OA/ID, folder, and classification are exposed for review."),
    createMetric("Sheet-derived provenance", `${sheetDerived}/${records.length}`, "Records checked directly against a citation or withdrawal sheet."),
    createMetric("Date span", dateSpan, "Chronological control uses meeting or document date.")
  );

  const queues = document.createElement("div");
  queues.className = "compiler-panel";
  const queuesTitle = document.createElement("h3");
  queuesTitle.textContent = "Compiler Queues";
  const queueList = document.createElement("div");
  queueList.className = "compiler-queues";
  queueList.append(
    queueButton("declassification", "Declassification ledger", declassification.length),
    queueButton("presidential", "Presidential conversations", presidential.length),
    queueButton("citation-sheet", "Source note gaps", citationSheetGaps.length),
    queueButton("unpaged", "Page count gaps", pageGaps.length),
    queueButton("no-pdf", "PDF gaps", pdfGaps.length),
    queueButton("local", "Project-only records", projectOnly.length)
  );
  queues.append(queuesTitle, queueList);

  const sourcePanel = document.createElement("div");
  sourcePanel.className = "compiler-panel";
  const sourceTitle = document.createElement("h3");
  sourceTitle.textContent = "Source Mix";
  const sourceList = document.createElement("ol");
  sourceList.className = "compiler-ledger-list";
  for (const [source, count] of countBy(records, (record) => record.source?.series || record.source?.name).slice(0, 6)) {
    const item = document.createElement("li");
    item.textContent = `${source}: ${count}`;
    sourceList.append(item);
  }
  sourcePanel.append(sourceTitle, sourceList);

  const ledger = document.createElement("div");
  ledger.className = "compiler-panel compiler-panel-wide";
  const ledgerTitle = document.createElement("h3");
  ledgerTitle.textContent = "Withheld, Partial, and Restricted Ledger";
  ledger.append(ledgerTitle, createLedgerList(declassification.sort(byChapterThenDate)));

  compilerRoot.replaceChildren(metrics, queues, sourcePanel, ledger);
}

function renderCompilerGaps(gaps) {
  if (!compilerGapsRoot) return;
  compilerGapsRoot.replaceChildren();
  if (!gaps.length) {
    const empty = document.createElement("p");
    empty.className = "empty-chapter";
    empty.textContent = "No compiler gaps are currently staged.";
    compilerGapsRoot.append(empty);
    return;
  }

  const metrics = document.createElement("div");
  metrics.className = "compiler-metrics";
  metrics.append(
    createMetric("Gap items", gaps.length.toString(), "Tracked compiler-risk issues."),
    createMetric(
      "Open",
      gaps.filter((gap) => /open|partly/i.test(gap.status || "")).length.toString(),
      "Items needing more source work."
    ),
    createMetric(
      "Remediated",
      gaps.filter((gap) => /remediated/i.test(gap.status || "")).length.toString(),
      "Items improved in the current dataset."
    ),
    createMetric(
      "Critical or high",
      gaps.filter((gap) => ["Critical", "High"].includes(gap.priority)).length.toString(),
      "Highest-priority compiler risks."
    )
  );

  const list = document.createElement("div");
  list.className = "gap-list";
  for (const gap of gaps) {
    const card = document.createElement("article");
    card.className = "gap-card";
    const title = document.createElement("h3");
    title.textContent = gap.title;
    const meta = document.createElement("div");
    meta.className = "record-meta";
    for (const value of [gap.priority, gap.status, gap.targetCount != null ? `${gap.targetCount} targets` : ""]) {
      if (!value) continue;
      const item = document.createElement("span");
      item.textContent = value;
      meta.append(item);
    }
    const evidence = document.createElement("p");
    evidence.textContent = gap.evidence;
    const action = document.createElement("p");
    action.className = "record-provenance-text";
    action.textContent = gap.nextAction;
    card.append(title, meta, evidence, action);
    list.append(card);
  }

  compilerGapsRoot.append(metrics, list);
}

function renderRecords(records) {
  const sorted = [...records].sort(byDateThenChapter);
  const selectedChapter = chapterFilter?.value || "";
  const releasedRecords = sorted.filter(isReleasedDocument);
  const reviewRecords = sorted.filter((record) => !isReleasedDocument(record));
  recordsRoot.replaceChildren();

  if (!sorted.length) {
    const empty = document.createElement("p");
    empty.className = "empty-chapter";
    empty.textContent = "No records match the current search or filters.";
    recordsRoot.append(empty);
    return;
  }

  const groups = [
    {
      id: selectedChapter ? chapterId(selectedChapter) : "declassified-chronology",
      heading: selectedChapter
        ? `${chapterHeading(selectedChapter)}: Declassified and Released Chronology`
        : "Declassified and Released Chronology",
      records: releasedRecords
    },
    {
      id: selectedChapter ? `${chapterId(selectedChapter)}-review` : "restricted-review-chronology",
      heading: selectedChapter
        ? `${chapterHeading(selectedChapter)}: Restricted and Pending Review`
        : "Restricted and Pending Review",
      records: reviewRecords
    }
  ];

  for (const group of groups) {
    if (!group.records.length) continue;
    const section = document.createElement("section");
    section.className = "record-chapter record-chronology";
    section.id = group.id;

    const header = document.createElement("div");
    header.className = "record-chapter-header";

    const heading = document.createElement("h3");
    heading.textContent = group.heading;

    const count = document.createElement("p");
    count.className = "record-count";
    const pageTotal = group.records.reduce((sum, record) => sum + (record.pageCount || 0), 0);
    const dateSpan = `${formatDate(group.records[0].date)} to ${formatDate(group.records[group.records.length - 1].date)}`;
    count.textContent = `${group.records.length} records / ${pageTotal} pages / ${dateSpan}`;
    header.append(heading, count);

    const list = document.createElement("div");
    list.className = "record-list";
    for (const record of group.records) {
      list.append(createRecordRow(record));
    }

    section.append(header, list);
    recordsRoot.append(section);
  }
}

function prioritizeChronologySection() {
  const hero = document.querySelector(".hero");
  const recordsSection = document.querySelector("#records");
  if (hero && recordsSection) hero.after(recordsSection);

  const title = document.querySelector("#records-title");
  if (title) title.textContent = "Declassified Document Chronology";

  const intro = document.querySelector("#records .records-intro");
  if (intro) {
    intro.textContent =
      "The working chronology now leads the page: released and declassified documents appear first in date order across chapters, followed by withheld or unknown-release records.";
  }

  const primary = document.querySelector(".hero-actions .primary");
  if (primary) {
    primary.href = "#records";
    primary.textContent = "Open Chronology";
  }
}

function csceDocumentRecord(record, index) {
  return {
    ...record,
    sortDate: record.date,
    compilerNumber: `C.${String(index + 1).padStart(3, "0")}`,
    chapter: {
      number: csceChapter?.chapter?.number || 5,
      name: csceChapter?.chapter?.shortName || "CSCE"
    },
    countries: ["CSCE"],
    frusTopics: ["CSCE", "European security"],
    topics: [record.evidenceLevel, record.packetLocalIdentifier].filter(Boolean),
    naid: record.packetNaid,
    provenanceStatus: record.evidenceLevel === "citation-sheet document" ? "citation-sheet" : "nara-hierarchy",
    source: {
      name: "George H.W. Bush Library",
      series: record.evidenceLevel === "citation-sheet document" ? "Citation-sheet document" : "Reviewed digital packet"
    },
    compilerRisks: /Partial|Denied/i.test(record.releaseStatus || "") ? ["declassification-review"] : [],
    suppressDailyDiary: true
  };
}

function csceSearchText(record) {
  return JSON.stringify(record).toLowerCase();
}

function csceLink(label, href) {
  if (!href) return null;
  const link = document.createElement("a");
  link.href = href;
  link.rel = "noreferrer";
  link.target = "_blank";
  link.textContent = label;
  return link;
}

function createCscePolicyRow(lead) {
  const row = document.createElement("article");
  row.className = "record-row csce-policy-row";

  const dateStack = document.createElement("div");
  dateStack.className = "record-date-stack";
  const family = document.createElement("span");
  family.className = "record-doc-number";
  family.textContent = lead.family;
  const date = document.createElement("time");
  date.className = "record-date";
  date.dateTime = lead.date;
  date.textContent = shortDate(lead.date);
  dateStack.append(family, date);

  const body = document.createElement("div");
  const title = document.createElement("a");
  title.className = "record-title";
  title.href = lead.catalogUrl;
  title.rel = "noreferrer";
  title.target = "_blank";
  title.textContent = lead.title;

  const kind = document.createElement("p");
  kind.className = "record-source-line";
  kind.textContent = lead.documentKind;

  const relevance = document.createElement("p");
  relevance.className = "record-subject";
  relevance.textContent = lead.relevance;

  const meta = document.createElement("div");
  meta.className = "record-meta";
  for (const value of [
    lead.availability,
    lead.localIdentifier ? `OA/ID ${lead.localIdentifier.replace(/\s*-\s*/g, "-")}` : "",
    lead.itemExtent ? `${lead.itemExtent} ${lead.itemExtent === 1 ? "page" : "pages"} listed` : "Approx. 5-20 pages",
    lead.classification
  ]) {
    if (!value) continue;
    const item = document.createElement("span");
    item.textContent = value;
    meta.append(item);
  }

  const details = document.createElement("details");
  details.className = "record-source-note";
  const summary = document.createElement("summary");
  summary.textContent = lead.sourceNote ? "Item Source Note and review status" : "Archival locator and review status";
  details.append(summary);
  if (lead.sourceNote) {
    const source = document.createElement("p");
    source.className = "record-frus-source-note";
    source.textContent = lead.sourceNote;
    details.append(createCopyButton("Copy source note", lead.sourceNote), source);
  }
  const locator = document.createElement("p");
  locator.className = "record-provenance-text";
  locator.textContent = lead.archivalLocator;
  const review = document.createElement("p");
  review.className = "record-provenance-text";
  review.textContent = `${lead.extentLabel}. ${lead.reviewNote}`;
  details.append(locator, review);
  body.append(title, kind, relevance, meta, details);

  const links = document.createElement("div");
  links.className = "record-links";
  for (const link of [csceLink("Catalog", lead.catalogUrl), csceLink("File packet", lead.pdfUrl)]) {
    if (link) links.append(link);
  }
  row.append(dateStack, body, links);
  return row;
}

function createCsceLeadRow(lead) {
  const row = document.createElement("article");
  row.className = "record-row csce-lead-row";

  const dateStack = document.createElement("div");
  dateStack.className = "record-date-stack";
  const leadLabel = document.createElement("span");
  leadLabel.className = "record-doc-number";
  leadLabel.textContent = "Lead";
  const status = document.createElement("span");
  status.className = "record-date lead-status";
  status.textContent = lead.availability || "On site";
  dateStack.append(leadLabel, status);

  const body = document.createElement("div");
  const title = document.createElement("a");
  title.className = "record-title";
  title.href = lead.catalogUrl || lead.findingAids?.[0]?.url || "#sources";
  title.rel = "noreferrer";
  title.target = "_blank";
  title.textContent = lead.title;
  const sourceLine = document.createElement("p");
  sourceLine.className = "record-source-line";
  sourceLine.textContent = [lead.collection, lead.series].filter(Boolean).join(" / ");
  const meta = document.createElement("div");
  meta.className = "record-meta";
  for (const value of [lead.localIdentifier ? `OA/ID ${lead.localIdentifier}` : "", lead.naid ? `NAID ${lead.naid}` : ""]) {
    if (!value) continue;
    const item = document.createElement("span");
    item.textContent = value;
    meta.append(item);
  }
  const note = document.createElement("p");
  note.className = "record-provenance-text csce-lead-note";
  note.textContent = "Folder-level locator. Inspect the file and its citation or withdrawal sheet before drafting a Source Note.";
  body.append(title, sourceLine, meta, note);

  const links = document.createElement("div");
  links.className = "record-links";
  for (const link of [
    csceLink("Catalog", lead.catalogUrl),
    csceLink("PDF", lead.pdfUrl),
    csceLink("Finding aid", lead.findingAids?.[0]?.url)
  ]) {
    if (link) links.append(link);
  }
  row.append(dateStack, body, links);
  return row;
}

function renderCsceMetrics() {
  if (!csceChapter || !csceMetrics) return;
  const exactExtents = csceChapter.policyMeetingLeads.filter((lead) => lead.itemExtent).length;
  const chapterPages = csceChapter.documents.reduce((sum, document) => sum + (document.pageCount || 0), 0);
  const releasedDocuments = csceChapter.documents.filter((document) => isReleasedDocument(document)).length;
  const withheldDocuments = csceChapter.documents.filter((document) => document.releaseStatus === "Denied").length;
  csceMetrics.replaceChildren(
    createMetric(
      "Chapter documents",
      csceChapter.documents.length.toString(),
      `${releasedDocuments} released or partial texts and ${withheldDocuments} item-level withheld entries.`
    ),
    createMetric("Policy files", csceChapter.policyMeetingLeads.length.toString(), "NSC, Deputies Committee, follow-up, NSR, and NSD records."),
    createMetric("Exact item extents", exactExtents.toString(), "Page counts transcribed from withdrawal sheets."),
    createMetric("Archival locators", csceChapter.archivalLeads.length.toString(), "Deduplicated rows from two Bush Library CSCE finding aids."),
    createMetric("Public statements", csceChapter.publicStatementIds.length.toString(), "Matching presidential statements in the Public Papers register.")
  );
  if (csceCandidateCount) csceCandidateCount.textContent = csceChapter.documents.length.toString();
  const chapterCount = document.querySelector("[data-csce-chapter-count]");
  const chapterPageCount = document.querySelector("[data-csce-chapter-pages]");
  if (chapterCount) chapterCount.textContent = csceChapter.documents.length.toString();
  if (chapterPageCount) chapterPageCount.textContent = chapterPages.toString();
}

function updateCsceView() {
  if (!csceChapter || !csceRoot) return;
  const query = csceSearch?.value.trim().toLowerCase() || "";
  csceRoot.replaceChildren();

  if (csceView === "documents") {
    const records = csceChapter.documents
      .map(csceDocumentRecord)
      .filter((record) => !query || csceSearchText(record).includes(query));
    csceSummary.textContent = `Showing ${records.length} of ${csceChapter.documents.length} chapter documents in chronological order`;
    for (const record of records) csceRoot.append(createRecordRow(record));
    if (!records.length) csceRoot.append(emptyCsceResult());
    return;
  }

  if (csceView === "meetings") {
    const records = csceChapter.policyMeetingLeads.filter((record) => !query || csceSearchText(record).includes(query));
    const exact = records.filter((record) => record.itemExtent).length;
    csceSummary.textContent = `Showing ${records.length} of ${csceChapter.policyMeetingLeads.length} policy files / ${exact} with item-level extents`;
    for (const record of records) csceRoot.append(createCscePolicyRow(record));
    if (!records.length) csceRoot.append(emptyCsceResult());
    return;
  }

  if (csceView === "leads") {
    const matches = csceChapter.archivalLeads.filter((record) => !query || csceSearchText(record).includes(query));
    const visible = matches.slice(0, csceLeadLimit);
    csceSummary.textContent = `Showing ${visible.length} of ${matches.length} matching archival locators (${csceChapter.archivalLeads.length} total)`;
    for (const record of visible) csceRoot.append(createCsceLeadRow(record));
    if (visible.length < matches.length) {
      const more = document.createElement("button");
      more.type = "button";
      more.className = "csce-load-more";
      more.textContent = `Show ${Math.min(80, matches.length - visible.length)} more`;
      more.addEventListener("click", () => {
        csceLeadLimit += 80;
        updateCsceView();
      });
      csceRoot.append(more);
    }
    if (!visible.length) csceRoot.append(emptyCsceResult());
    return;
  }

  const idSet = new Set(csceChapter.publicStatementIds);
  const statements = allPublicStatements
    .filter((statement) => idSet.has(statement.id))
    .filter((statement) => !query || publicStatementSearchText(statement).includes(query));
  csceSummary.textContent = `Showing ${statements.length} of ${csceChapter.publicStatementIds.length} CSCE-related Public Papers references`;
  for (const statement of statements) csceRoot.append(createPublicStatementRow(statement));
  if (!statements.length) csceRoot.append(emptyCsceResult());
}

function emptyCsceResult() {
  const empty = document.createElement("p");
  empty.className = "empty-chapter";
  empty.textContent = "No records match this chapter search.";
  return empty;
}

function enableCsceControls() {
  for (const button of document.querySelectorAll("[data-csce-view]")) {
    button.addEventListener("click", () => {
      csceView = button.dataset.csceView;
      csceLeadLimit = 80;
      for (const tab of document.querySelectorAll("[data-csce-view]")) {
        tab.setAttribute("aria-selected", String(tab === button));
      }
      updateCsceView();
    });
  }
  csceSearch?.addEventListener("input", () => {
    csceLeadLimit = 80;
    updateCsceView();
  });
}

function publicStatementSearchText(statement) {
  return [
    statement.referenceNumber,
    statement.title,
    statement.type,
    statement.sourcePackage,
    statement.sourcePackageLabel,
    statement.sourceKind,
    statement.selectionBasis,
    statement.sourceNote,
    statement.notes,
    ...(statement.countries || []),
    ...(statement.leaders || []),
    ...(statement.topics || []),
    ...(statement.matchTerms || [])
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function populatePublicStatementFilters(statements) {
  addOptions(
    publicStatementCountryFilter,
    uniqueSorted(statements.flatMap((statement) => statement.countries || [])),
    "All countries"
  );
  addOptions(
    publicStatementTypeFilter,
    uniqueSorted(statements.map((statement) => statement.type)),
    "All statement types"
  );
  addOptions(
    publicStatementSourceFilter,
    uniqueSorted(statements.map((statement) => statement.sourceKind)),
    "All source levels"
  );
  addOptions(
    publicStatementBasisFilter,
    uniqueSorted(statements.map((statement) => statement.selectionBasis)),
    "All match bases"
  );
}

function filterPublicStatements(statements) {
  const query = publicStatementSearch?.value.trim().toLowerCase() || "";
  const country = publicStatementCountryFilter?.value || "";
  const type = publicStatementTypeFilter?.value || "";
  const source = publicStatementSourceFilter?.value || "";
  const basis = publicStatementBasisFilter?.value || "";

  return statements.filter((statement) => {
    if (country && !(statement.countries || []).includes(country)) return false;
    if (type && statement.type !== type) return false;
    if (source && statement.sourceKind !== source) return false;
    if (basis && statement.selectionBasis !== basis) return false;
    return !query || publicStatementSearchText(statement).includes(query);
  });
}

function createPublicStatementRow(statement) {
  const row = document.createElement("article");
  row.className = "record-row public-statement-row";

  const dateStack = document.createElement("div");
  dateStack.className = "record-date-stack";

  const number = document.createElement("span");
  number.className = "record-doc-number";
  number.textContent = statement.referenceNumber;

  const date = document.createElement("time");
  date.className = "record-date";
  date.dateTime = statement.date;
  date.textContent = shortDate(statement.date);
  dateStack.append(number, date);

  const body = document.createElement("div");
  const title = document.createElement("a");
  title.className = "record-title";
  title.href = statement.govinfoUrl || statement.detailsUrl || statement.packageUrl || statement.appUrl;
  title.rel = "noreferrer";
  title.textContent = statement.title;

  const sourceLine = document.createElement("p");
  sourceLine.className = "record-source-line";
  sourceLine.textContent = `${statement.sourcePackageLabel || statement.sourcePackage} / ${statement.sourceKind}`;

  const meta = document.createElement("div");
  meta.className = "record-meta";
  for (const value of [
    statement.type,
    statement.countries?.join(", "),
    statement.leaders?.slice(0, 3).join(", "),
    statement.selectionBasis ? `${statement.selectionBasis} match` : "",
    statement.sourcePackage
  ]) {
    if (!value) continue;
    const item = document.createElement("span");
    item.textContent = value;
    meta.append(item);
  }

  const topics = document.createElement("div");
  topics.className = "record-topics";
  for (const topic of uniqueSorted([...(statement.topics || []), ...(statement.matchTerms || [])]).slice(0, 7)) {
    const item = document.createElement("span");
    item.textContent = topic;
    topics.append(item);
  }

  const sourceNote = document.createElement("details");
  sourceNote.className = "record-source-note";
  const sourceSummary = document.createElement("summary");
  sourceSummary.textContent = "Public Papers source note";
  const sourceText = document.createElement("p");
  sourceText.className = "record-frus-source-note";
  sourceText.textContent = statement.sourceNote;
  const note = document.createElement("p");
  note.className = "record-provenance-text";
  note.textContent = statement.notes || "Public Papers reference record.";
  sourceNote.append(sourceSummary, sourceText, note);

  body.append(title, sourceLine, meta, topics, sourceNote);

  const links = document.createElement("div");
  links.className = "record-links";
  for (const [label, url] of [
    ["GovInfo", statement.govinfoUrl || statement.packageUrl],
    ["Text", statement.textUrl],
    ["PDF", statement.pdfUrl],
    ["APP mirror", statement.appUrl],
    ["Volume", statement.packageUrl]
  ]) {
    if (!url) continue;
    const link = document.createElement("a");
    link.href = url;
    link.rel = "noreferrer";
    link.textContent = label;
    links.append(link);
  }

  row.append(dateStack, body, links);
  return row;
}

function updatePublicStatementSummary(statements) {
  if (publicStatementsCount) publicStatementsCount.textContent = allPublicStatements.length.toString();
  if (!publicStatementSummary) return;
  publicStatementSummary.textContent = `Showing ${statements.length} of ${allPublicStatements.length} Public Papers references`;
}

function renderPublicStatements(statements) {
  if (!publicStatementsRoot) return;
  publicStatementsRoot.replaceChildren();
  if (!statements.length) {
    const empty = document.createElement("p");
    empty.className = "empty-chapter";
    empty.textContent = "No public statements match the current filters.";
    publicStatementsRoot.append(empty);
    return;
  }
  for (const statement of [...statements].sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title))) {
    publicStatementsRoot.append(createPublicStatementRow(statement));
  }
}

function updatePublicStatementsView() {
  const filtered = filterPublicStatements(allPublicStatements);
  updatePublicStatementSummary(filtered);
  renderPublicStatements(filtered);
}

function enablePublicStatementFilters() {
  for (const control of [
    publicStatementSearch,
    publicStatementCountryFilter,
    publicStatementTypeFilter,
    publicStatementSourceFilter,
    publicStatementBasisFilter
  ]) {
    control?.addEventListener("input", updatePublicStatementsView);
    control?.addEventListener("change", updatePublicStatementsView);
  }

  publicStatementClear?.addEventListener("click", () => {
    if (publicStatementSearch) publicStatementSearch.value = "";
    if (publicStatementCountryFilter) publicStatementCountryFilter.value = "";
    if (publicStatementTypeFilter) publicStatementTypeFilter.value = "";
    if (publicStatementSourceFilter) publicStatementSourceFilter.value = "";
    if (publicStatementBasisFilter) publicStatementBasisFilter.value = "";
    updatePublicStatementsView();
    publicStatementSearch?.focus();
  });
}

function updateRecordsView() {
  const filtered = filterRecords(allRecords);
  updateSummary(filtered);
  renderRecords(filtered);
  renderCompilerDesk(allRecords);
}

function enableFilters() {
  for (const control of [searchInput, chapterFilter, typeFilter, releaseFilter, compilerFilter]) {
    control?.addEventListener("input", updateRecordsView);
    control?.addEventListener("change", updateRecordsView);
  }

  clearFilters?.addEventListener("click", () => {
    if (searchInput) searchInput.value = "";
    if (chapterFilter) chapterFilter.value = "";
    if (typeFilter) typeFilter.value = "";
    if (releaseFilter) releaseFilter.value = "";
    if (compilerFilter) compilerFilter.value = "";
    updateRecordsView();
    searchInput?.focus();
  });
}

function enableChapterCards() {
  for (const card of document.querySelectorAll(".chapter-card")) {
    card.addEventListener("click", (event) => {
      const targetId = card.getAttribute("href");
      if (!targetId?.startsWith("#")) return;

      const isStandaloneChapter = card.dataset.standaloneChapter === "true";
      if (chapterFilter && !isStandaloneChapter) {
        chapterFilter.value = card.dataset.chapterName || card.querySelector("h3")?.textContent || "";
      }
      event.preventDefault();
      history.pushState(null, "", targetId);
      if (!isStandaloneChapter) updateRecordsView();
      document.querySelector(targetId)?.scrollIntoView({ block: "start" });
    });
  }
}

async function init() {
  try {
    allRecords = assignCompilerNumbers(window.MEMCONS || window.MEMCON_RECORDS || (await loadRecords()));
    allPublicStatements = assignPublicStatementNumbers(window.PUBLIC_STATEMENTS || (await loadPublicStatements()));
    allCompilerGaps = window.COMPILER_GAPS || (await loadCompilerGaps());
    allDailyDiaryReferences = window.DAILY_DIARY_REFERENCES || (await loadDailyDiaryReferences());
    csceChapter = window.CSCE_CHAPTER || (await loadCsceChapter());
    prioritizeChronologySection();
    setChapterCounts(allRecords);
    populateFilters(allRecords);
    populatePublicStatementFilters(allPublicStatements);
    enableFilters();
    enablePublicStatementFilters();
    enableChapterCards();
    enableCsceControls();
    updateRecordsView();
    updatePublicStatementsView();
    renderCompilerGaps(allCompilerGaps);
    renderCsceMetrics();
    updateCsceView();
    if (window.location.hash) {
      document.querySelector(window.location.hash)?.scrollIntoView();
    }
  } catch (error) {
    recordsRoot.innerHTML =
      '<p class="error">The memcon records could not be loaded. Try opening this site through a local server or GitHub Pages.</p>';
  }
}

async function loadRecords() {
  const response = await fetch("data/memcons.json");
  if (!response.ok) throw new Error(`Could not load records: ${response.status}`);
  return response.json();
}

async function loadPublicStatements() {
  const response = await fetch("data/public-statements.json");
  if (!response.ok) throw new Error(`Could not load public statements: ${response.status}`);
  return response.json();
}

async function loadCompilerGaps() {
  const response = await fetch("data/compiler-gaps.json");
  if (!response.ok) return [];
  return response.json();
}

async function loadDailyDiaryReferences() {
  const response = await fetch("data/daily-diary-references.json");
  if (!response.ok) return { dates: {} };
  return response.json();
}

async function loadCsceChapter() {
  const response = await fetch("data/csce-chapter.json");
  if (!response.ok) return null;
  return response.json();
}

init();
