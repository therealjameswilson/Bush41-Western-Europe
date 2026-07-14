const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const ROOT = path.resolve(__dirname, "..");
const MEMCONS_PATH = path.join(ROOT, "data", "memcons.json");
const MEMCONS_JS_PATH = path.join(ROOT, "data", "memcons.js");
const REPORT_PATH = path.join(ROOT, "reports", "bush-library-current-index-audit.json");
const INDEX_URL =
  "https://www.bush41library.gov/digital-research-room/about-textual-collections/memcons-and-telcons";
const NARA_SEARCH = "https://catalog.archives.gov/proxy/records/search";
const CHECKED_AT = new Date().toISOString().slice(0, 10);
const DRY_RUN = process.argv.includes("--dry-run");

const CHAPTERS = {
  "United Kingdom": 1,
  France: 2,
  Italy: 3,
  Regional: 4,
  "Germany Reference": 5
};

const WESTERN_EUROPE = /\b(?:Austria|Belgium|Denmark|Finland|France|FRG|GDR|Germany|Greece|Holy See|Iceland|Ireland|Italy|Liechtenstein|Luxembourg|Malta|Monaco|Netherlands|Norway|Portugal|Spain|Sweden|Switzerland|United Kingdom|Great Britain|Vatican|European Commission|European Community|European Economic Community|EC|NATO)\b/i;
const LOCAL_DUPLICATES = {
  "local-1989-09-11-john-major-memcon": "1989-09-11-428080179",
  "local-1990-04-17-ruud-lubbers-telcon": "1990-04-17-428080643"
};
const MANUAL_CITATIONS = {
  "local-1991-02-21-francois-mitterrand-telcon": {
    naid: "470426525",
    dateLine: "Washington, February 21, 1991, 2:07-2:16 p.m.",
    title: "Memorandum of a Telephone Conversation",
    subjectLine: "Telcon with Francois Mitterrand, President of France on February 21, 1991",
    sourceNote:
      "Source: George H.W. Bush Library, Bush Presidential Records, National Security Council, Richard N. Haass Files, Working File, OA/ID CF01584-006, Iraq - February 1991 [4]. Secret. Portions remain classified.",
    classification: "Secret",
    releaseStatus: "Partial",
    pageCount: 3,
    foiaNumber: "1999-0099-F"
  },
  "local-1991-02-22-francois-mitterrand-telcon": {
    naid: "470426525",
    dateLine: "Washington, February 22, 1991, 9:11-9:35 a.m.",
    title: "Memorandum of a Telephone Conversation",
    subjectLine: "Telcon with Francois Mitterrand, President of France on February 22, 1991",
    sourceNote:
      "Source: George H.W. Bush Library, Bush Presidential Records, National Security Council, Richard N. Haass Files, Working File, OA/ID CF01584-006, Iraq - February 1991 [4]. Secret. Portions remain classified.",
    classification: "Secret",
    releaseStatus: "Partial",
    pageCount: 5,
    foiaNumber: "1999-0099-F"
  },
  "local-1992-09-28-helmut-kohl-telcon": {
    naid: "660161765",
    dateLine: "Air Force One, September 28, 1992, 1:32-1:39 p.m. EST",
    title: "Memorandum of a Telephone Conversation",
    subjectLine: "Telcon with Helmut Kohl, Chancellor of Germany on September 28, 1992",
    sourceNote:
      "Source: George H.W. Bush Library, Bush Presidential Records, Brent Scowcroft Collection, Presidential Correspondence Files, Presidential Telcon Files, OA/ID 91113-005, Presidential Telephone Calls - Memorandum of Conversations 7/10/92 - 11/5/92. Confidential.",
    classification: "Confidential",
    releaseStatus: "Full",
    pageCount: 2,
    foiaNumber: "2009-0741-MR"
  }
};
const CLASSIFICATION_OVERRIDES = {
  "1989-11-17-366551689-37": "Secret; Sensitive",
  "1990-08-09-366551693-64": "Secret",
  "1989-11-17-366551689-28": "Secret",
  "1992-05-11-366551683-35": "Confidential",
  "1989-11-30-366551689-84": "Confidential",
  "1989-11-25-366551689-46": "Confidential",
  "1989-11-25-366551689-45": "Confidential",
  "1989-11-27-366551689-60": "Confidential",
  "1991-04-20-366551699-65": "Secret",
  "1991-12-13-366551702-112": "Confidential",
  "1991-12-16-366551702-133": "Confidential",
  "1992-04-02-366551682-57": "Secret",
  "1992-05-28-366551683-66": "Secret",
  "1992-06-07-366551683-75": "Confidential",
  "1992-06-28-366551704-77": "Secret",
  "1992-07-09-366551684-85": "Secret",
  "1991-08-19-366551701-11": "Secret",
  "1991-08-26-366551701-63": "Confidential",
  "1991-08-27-366551701-74": "Confidential",
  "1992-03-21-366551682-33": "Secret",
  "1992-06-28-366551704-83": "Secret"
};
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"
];

function decodeHtml(value = "") {
  const entities = {
    "&amp;": "&",
    "&quot;": '"',
    "&#039;": "'",
    "&apos;": "'",
    "&lt;": "<",
    "&gt;": ">",
    "&nbsp;": " "
  };
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&(amp|quot|#039|apos|lt|gt|nbsp);/g, (entity) => entities[entity] || entity)
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/\s+/g, " ")
    .trim();
}

function cleanText(value = "") {
  return value
    .replace(/[{}]/g, (character) => (character === "{" ? "[" : "]"))
    .replace(/[ \t]+/g, " ")
    .replace(/\s+([,.;:])/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function parseIndexRows(html) {
  const rows = [];
  for (const rowMatch of html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const row = rowMatch[1];
    const cell = (name) => {
      const match = row.match(
        new RegExp(`<td\\b[^>]*headers=["']view-${name}-table-column["'][^>]*>([\\s\\S]*?)<\\/td>`, "i")
      );
      return decodeHtml(match?.[1] || "");
    };
    const values = {
      dateLabel: cell("date"),
      type: cell("type"),
      participantsLabel: cell("participants"),
      countryLabel: cell("country"),
      status: cell("status"),
      naid: cell("naid")
    };
    if (values.dateLabel && values.type && values.participantsLabel) rows.push(values);
  }
  return rows;
}

function parseIndexDate(value) {
  const match = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return "";
  return `${match[3]}-${match[1].padStart(2, "0")}-${match[2].padStart(2, "0")}`;
}

async function fetchText(url) {
  const response = await fetch(url, { headers: { "User-Agent": "Bush41-Western-Europe/1.0" } });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}`);
  return response.text();
}

async function fetchIndex() {
  const rows = [];
  for (let page = 0; page < 110; page += 1) {
    const pageRows = parseIndexRows(await fetchText(`${INDEX_URL}?page=${page}`));
    if (!pageRows.length) break;
    rows.push(...pageRows);
  }
  return rows.map((row) => ({ ...row, date: parseIndexDate(row.dateLabel) }));
}

async function mapLimit(values, limit, mapper) {
  const results = new Array(values.length);
  let cursor = 0;
  async function worker() {
    while (cursor < values.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await mapper(values[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, values.length) }, worker));
  return results;
}

async function fetchNaraRecord(naid) {
  const url = `${NARA_SEARCH}?naId=${encodeURIComponent(naid)}&includeExtractedText=true&includeOtherExtractedText=true`;
  let lastError;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    try {
      const response = await fetch(url, { headers: { "User-Agent": "Bush41-Western-Europe/1.0" } });
      const body = await response.text();
      if (!response.ok || !body.trim().startsWith("{")) {
        throw new Error(`${response.status} ${response.statusText}: non-JSON NARA response for ${naid}`);
      }
      const payload = JSON.parse(body);
      return payload?.body?.hits?.hits?.[0]?._source?.record || null;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 750 * (attempt + 1)));
    }
  }
  throw lastError;
}

function normalizedName(value = "") {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\b(?:president|prime minister|chancellor|king|pope|cardinal|secretary general|of|the|and)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function officialNameKeys(label = "") {
  return unique(
    label
      .split(/;|\band\b/i)
      .flatMap((part) => {
        const normalized = normalizedName(part);
        const commaLead = normalizedName(part.split(",")[0]);
        const words = normalized.split(" ");
        return [normalized, commaLead, words[words.length - 1]];
      })
      .filter((key) => key && key.length > 2)
  );
}

function recordHaystack(record) {
  return normalizedName(
    [record.title, record.subjectLine, ...(record.participants || []), ...(record.countries || [])].join(" ")
  );
}

function matchingScore(record, official) {
  if (record.date !== official.date || record.type !== official.type) return -1;
  const haystack = recordHaystack(record);
  const keys = officialNameKeys(official.participantsLabel);
  let score = keys.some((key) => haystack.includes(key)) ? 20 : 0;
  if (normalizedName(record.title || "").includes(normalizedName(official.participantsLabel))) score += 6;
  if ((record.countries || []).some((country) => official.countryLabel.includes(country))) score += 4;
  if (chapterFor(official.countryLabel).name === record.chapter?.name) score += 2;
  if (/local-/i.test(record.naid || "")) score += 1;
  return score;
}

function chapterFor(countryLabel = "") {
  const countries = countryLabel.split(/[,;]/).map((country) => country.trim()).filter(Boolean);
  const multiCountry = countries.length > 1;
  let name = "Regional";
  if (!multiCountry && /United Kingdom|Great Britain/i.test(countryLabel)) name = "United Kingdom";
  else if (!multiCountry && /France/i.test(countryLabel)) name = "France";
  else if (!multiCountry && /^Italy$/i.test(countryLabel.trim())) name = "Italy";
  else if (!multiCountry && /Germany|FRG|GDR/i.test(countryLabel)) name = "Germany Reference";
  return { number: CHAPTERS[name], name };
}

function normalizeStatus(status = "") {
  if (/^ful/i.test(status)) return "Full";
  if (/partial/i.test(status)) return "Partial";
  if (/denied|restricted\s*-\s*fully/i.test(status)) return "Denied";
  return status || "Unknown";
}

function classificationFromText(text = "") {
  const sample = text.slice(0, 14000);
  if (!sample.trim()) return "";
  if (/\bTOP SECRET\b/i.test(sample) || /\bTS\b/.test(sample.split("\n").slice(0, 35).join("\n"))) return "Top Secret";
  if (/\bSECRET\b/i.test(sample)) return "Secret";
  if (/\bCONFIDENTIAL\b/i.test(sample)) return "Confidential";
  if (/\bLIMITED OFFICIAL USE\b/i.test(sample)) return "Limited Official Use";
  if (/\bSENSITIVE\b/i.test(sample)) return "Sensitive";
  return "No classification marking";
}

function classificationFromCode(code = "") {
  const normalized = code.trim().toUpperCase();
  if (normalized === "TS") return "Top Secret";
  if (normalized === "S") return "Secret";
  if (normalized === "C") return "Confidential";
  return "No classification marking";
}

function localPdfText(record) {
  if (!record.pdfUrl || /^https?:/i.test(record.pdfUrl)) return "";
  const filePath = path.join(ROOT, record.pdfUrl);
  if (!fs.existsSync(filePath)) return "";
  const result = spawnSync("pdftotext", ["-f", "1", "-l", "5", filePath, "-"], {
    encoding: "utf8",
    maxBuffer: 4 * 1024 * 1024
  });
  return result.status === 0 ? result.stdout : "";
}

function stripTerminalReleaseLanguage(note = "") {
  return note
    .replace(/\s+(?:Declassified|Full release|Partial release|Release status not determined)\.\s*$/i, "")
    .replace(/\s+Not declassified\.\s+Approximate extent: \d+ pages?\.\s*$/i, "")
    .replace(/\s+Not declassified\.\s*$/i, "")
    .replace(/\s+Portions remain classified\.\s*$/i, "")
    .trim();
}

function releaseQualification(status, pageCount) {
  if (status === "Denied") {
    return `Not declassified.${pageCount ? ` Approximate extent: ${pageCount} ${pageCount === 1 ? "page" : "pages"}.` : ""}`;
  }
  if (status === "Partial") return "Portions remain classified.";
  return "";
}

function withClassification(sourceStem, classification, status, pageCount) {
  const stem = stripTerminalReleaseLanguage(sourceStem)
    .replace(
      /\s+(?:Top Secret|Secret|Confidential|Sensitive|Limited Official Use|No classification marking)(?:;\s*(?:Top Secret|Secret|Confidential|Sensitive|Limited Official Use))*\.\s*$/i,
      ""
    )
    .replace(/\s+$/, "");
  const classSentence = `${classification || "No classification marking"}.`;
  return cleanText(
    [stem, classSentence, releaseQualification(status, pageCount)].filter(Boolean).join(" ")
  );
}

function lines(text = "") {
  return text.split(/\r?\n/).map((line) => line.replace(/\s+/g, " ").trim());
}

function fieldAfter(textLines, label, stopLabels) {
  const index = textLines.findIndex((line) => new RegExp(`^${label}:?$`, "i").test(line));
  if (index === -1) return "";
  const values = [];
  for (let cursor = index + 1; cursor < textLines.length; cursor += 1) {
    const line = textLines[cursor];
    if (!line) continue;
    if (stopLabels.some((stop) => new RegExp(`^${stop}:?$`, "i").test(line))) break;
    if (/^(?:Document Partially Declassified|\(Copy of Document Follows\)|By .+ on \d)/i.test(line)) continue;
    values.push(line);
    if (values.length >= 3) break;
  }
  return cleanText(values.join(" "));
}

function parseWithdrawalSheet(text = "") {
  if (!/Withdrawal\/Redaction Sheet/i.test(text)) return null;
  const sheet = text.slice(text.search(/Withdrawal\/Redaction Sheet/i), text.search(/RESTRICTION CODES/i) > -1 ? text.search(/RESTRICTION CODES/i) : 10000);
  const textLines = lines(sheet);
  const extent = Number(sheet.match(/\((\d+)\s+pp\.\)/i)?.[1] || 0);
  const header = textLines.slice(0, 28);
  const restrictionIndex = header.findIndex((line) => /^\(b\)\(1\)$/i.test(line));
  const classCode = restrictionIndex > -1 ? header.slice(restrictionIndex + 1).find((line) => /^(?:TS|S|C)$/i.test(line)) || "" : "";
  const office = fieldAfter(textLines, "Office", ["Series", "Subseries", "WHORM Cat.", "File Location"]);
  const series = fieldAfter(textLines, "Series", ["Subseries", "WHORM Cat.", "File Location"]);
  const subseries = fieldAfter(textLines, "Subseries", ["WHORM Cat.", "File Location"]);
  const fileLocation = fieldAfter(textLines, "File Location", ["Date Closed", "OA/ID Number"]);
  const localIdentifier = fieldAfter(textLines, "OA/ID Number", ["FOIA/SYS Case #", "Appeal Case #"]);
  const foiaNumber = fieldAfter(textLines, "FOIA/SYS Case #", ["Appeal Case #", "Re-review Case #"]);
  const typeIndex = textLines.findIndex((line) => /\band Type$/i.test(line));
  const preCollection = typeIndex > -1 ? textLines.slice(typeIndex + 1, textLines.findIndex((line) => /^Collection:$/i.test(line))) : [];
  const dateLabel = preCollection.find((line) => /^(?:\d{1,2}\/\d{1,2}(?:\/\d{2,4})?|n\.d\.)$/i.test(line)) || "";
  const restrictionLine = preCollection.findIndex((line) => /^\(b\)\(1\)$/i.test(line));
  const titleLines = preCollection
    .filter((line, index) => index > 0 && line !== dateLabel && index !== restrictionLine && !/^(?:TS|S|C)$/i.test(line))
    .filter((line) => !/^(?:Points|Report)$/i.test(line));
  const title = cleanText(titleLines.join(" ").replace(/\s*\(\d+\s+pp\.\).*$/i, ""));
  const partial = /Document Partially Declassified|Released in Part|Copy of Document Follows/i.test(sheet);
  return {
    extent,
    classification: classificationFromCode(classCode),
    office,
    series,
    subseries,
    fileLocation,
    localIdentifier,
    foiaNumber,
    title,
    dateLabel,
    partial
  };
}

function normalizeOffice(office = "") {
  if (/Scowcroft/i.test(office)) return "Brent Scowcroft Collection";
  if (/National Security Council/i.test(office)) return "National Security Council";
  return cleanText(office);
}

function normalizeSeries(series = "") {
  if (/Telcons?, Presidential/i.test(series)) return "Presidential Telcon Files";
  if (/Memcons?, Presidential/i.test(series)) return "Presidential Memcon Files";
  if (/Haass, Richard/i.test(series)) return "Richard N. Haass Files";
  return cleanText(series);
}

function archivalStemFromWithdrawal(sheet) {
  const parts = [
    "George H.W. Bush Library",
    "Bush Presidential Records",
    normalizeOffice(sheet.office),
    normalizeSeries(sheet.series),
    cleanText(sheet.subseries),
    sheet.localIdentifier ? `OA/ID ${sheet.localIdentifier}` : "",
    cleanText(sheet.fileLocation)
  ];
  return `Source: ${unique(parts).join(", ")}.`;
}

function fileUnit(record) {
  return (record.ancestors || []).find((ancestor) => ancestor.levelOfDescription === "fileUnit");
}

function series(record) {
  return (record.ancestors || []).find((ancestor) => ancestor.levelOfDescription === "series");
}

function archivalStemFromNara(record, fileUnitRecord) {
  const seriesTitle = normalizeSeries(series(record)?.title || "");
  const folderId = fileUnitRecord?.localIdentifier || "";
  const folderTitle = cleanText(fileUnitRecord?.title || fileUnit(record)?.title || record.title || "");
  const parts = [
    "George H.W. Bush Library",
    "Bush Presidential Records",
    "National Security Council",
    seriesTitle,
    folderId ? `OA/ID ${folderId}` : "",
    folderTitle
  ];
  return `Source: ${unique(parts).join(", ")}.`;
}

function formatFullDate(date) {
  const [year, month, day] = date.split("-").map(Number);
  return `${MONTHS[month - 1]} ${day}, ${year}`;
}

function subjectFromText(text, fallback) {
  const match = text.match(/SUBJECT:\s*\n([\s\S]{1,320}?)(?=\n(?:PARTICIPANTS?|DATE,?\s*TIME|The President|MEMORANDUM))/i);
  return cleanText(match?.[1] || fallback);
}

function datelineFromText(text, date) {
  const textLines = lines(text);
  const dateText = formatFullDate(date);
  let dateLine = textLines.find((line) => line.includes(dateText)) || dateText;
  if (dateLine === dateText) {
    const shortDate = dateText.replace(`, ${date.slice(0, 4)}`, "");
    dateLine = textLines.find((line) => line.includes(shortDate) && /\d{1,2}:\d{2}/.test(line)) || dateText;
  }
  const placeIndex = textLines.findIndex((line) => /^AND PLACE:?$/i.test(line));
  const placeLine = placeIndex > -1 ? textLines.slice(placeIndex + 1).find(Boolean) || "" : "";
  let place = "";
  if (/Oval Office|White House|Washington/i.test(placeLine)) place = "Washington";
  else if (/Camp David/i.test(placeLine)) place = "Camp David";
  else {
    const knownPlace = placeLine.match(/\b(?:Paris|London|Rome|Brussels|Helsinki|Munich|Madrid|Kennebunkport|New York|Bermuda|The Hague|Dublin|Oslo|Lisbon|Copenhagen|Reykjavik|Valletta|Athens)\b/i)?.[0];
    if (knownPlace) place = knownPlace;
  }
  return cleanText(`${place ? `${place}, ` : ""}${dateLine}`).replace(/\s+The,\s+/g, ", ");
}

function displayParticipants(label = "") {
  return label
    .split(/;/)
    .map((name) => {
      const parts = name.split(",").map((part) => part.trim());
      return parts.length > 1 ? `${parts.slice(1).join(" ")} ${parts[0]}` : name.trim();
    })
    .filter(Boolean);
}

function countries(label = "") {
  return unique(label.split(/[,;]/).map((country) => country.trim()).filter(Boolean));
}

function digitalObject(record) {
  return (record.digitalObjects || []).find((object) => /pdf/i.test(`${object.objectType || ""} ${object.objectFilename || ""}`)) || record.digitalObjects?.[0];
}

function pdfPageCount(url) {
  if (!url) return 0;
  const tempPath = path.join(os.tmpdir(), `wer-${process.pid}-${Math.random().toString(16).slice(2)}.pdf`);
  try {
    const result = spawnSync("curl", ["-L", "-sS", "--max-time", "45", "-o", tempPath, url], { maxBuffer: 1024 * 1024 });
    if (result.status !== 0 || !fs.existsSync(tempPath)) return 0;
    const info = spawnSync("pdfinfo", [tempPath], { encoding: "utf8", maxBuffer: 1024 * 1024 });
    return Number(info.stdout.match(/^Pages:\s+(\d+)/m)?.[1] || 0);
  } finally {
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
  }
}

function naraContext(naraRecord, fileUnitRecords, status, existingPageCount = 0) {
  const object = digitalObject(naraRecord) || {};
  const text = object.extractedText || "";
  const sheet = parseWithdrawalSheet(text);
  const folder = fileUnitRecords.get(String(fileUnit(naraRecord)?.naId || ""));
  const classification = sheet?.classification || classificationFromText(text) || "No classification marking";
  const pageCount = sheet?.extent || existingPageCount || pdfPageCount(object.objectUrl);
  const sourceStem = sheet ? archivalStemFromWithdrawal(sheet) : archivalStemFromNara(naraRecord, folder);
  const sourceNote = withClassification(sourceStem, classification, status, pageCount);
  const provenanceStatus = sheet ? "withdrawal-sheet" : "nara-hierarchy";
  return { object, text, sheet, folder, classification, pageCount, sourceNote, provenanceStatus };
}

function provenanceNote(context, official, naraRecord, localCopy = "") {
  const details = [
    context.sourceNote,
    `Bush Library Memcons and Telcons index status: ${official.status || "not stated"}.`,
    `NARA Catalog ID ${official.naid}.`,
    context.sheet?.foiaNumber ? `Processed under FOIA ${context.sheet.foiaNumber}.` : "",
    context.object?.objectUrl ? `Digital object: ${context.object.objectUrl}.` : "",
    localCopy ? `Project working copy retained at ${localCopy}.` : "",
    `Catalog: https://catalog.archives.gov/id/${official.naid}.`
  ];
  return cleanText(details.filter(Boolean).join(" "));
}

function compilerRisks(status, sourceNote, pageCount) {
  return [
    status === "Denied" || status === "Partial" ? "declassification-review" : "",
    !/OA\/ID\s+[A-Z0-9-]+/i.test(sourceNote) ? "source-note-folder-id" : "",
    !pageCount ? "page-count-gap" : ""
  ].filter(Boolean);
}

function updateFromNara(record, official, naraRecord, context) {
  const localCopy = record.pdfUrl && !/^https?:/i.test(record.pdfUrl) ? record.pdfUrl : "";
  const objectUrl = context.object?.objectUrl || "";
  const merged = {
    ...record,
    date: official.date,
    sortDate: official.date,
    type: official.type,
    releaseStatus: normalizeStatus(official.status),
    naid: official.naid,
    catalogUrl: `https://catalog.archives.gov/id/${official.naid}`,
    officialPdfUrl: objectUrl,
    pdfUrl: localCopy || objectUrl || record.pdfUrl || "",
    source: {
      name: context.sheet ? "Bush Library withdrawal/redaction sheet" : "National Archives Catalog",
      url: INDEX_URL,
      series: normalizeSeries(series(naraRecord)?.title || context.sheet?.series || ""),
      objectUrl,
      objectFilename: context.object?.objectFilename || "",
      findingAidUrl: INDEX_URL
    },
    pageCount: context.pageCount || record.pageCount || 0,
    documentTitle: official.type === "Telcon" ? "Memorandum of a Telephone Conversation" : "Memorandum of Conversation",
    subjectLine: subjectFromText(context.text, naraRecord.title || record.subjectLine || record.title),
    dateLine: datelineFromText(context.text, official.date),
    sourceTitle: naraRecord.title || record.sourceTitle || record.title,
    sourceNote: context.sourceNote,
    provenanceStatus: context.provenanceStatus,
    provenanceNote: provenanceNote(context, official, naraRecord, localCopy),
    provenanceLinks: unique([
      `https://catalog.archives.gov/id/${official.naid}`,
      objectUrl,
      localCopy,
      INDEX_URL,
      ...(record.provenanceLinks || [])
    ]),
    compilerRisks: compilerRisks(normalizeStatus(official.status), context.sourceNote, context.pageCount),
    officialIndex: { ...official, checkedAt: CHECKED_AT, sourceUrl: INDEX_URL }
  };
  if (context.sheet?.foiaNumber) merged.foiaNumber = context.sheet.foiaNumber;
  if (context.sheet?.extent) merged.extentNote = `Approximate original extent: ${context.sheet.extent} ${context.sheet.extent === 1 ? "page" : "pages"}.`;
  return merged;
}

function updateCitationSheetRecord(record, official, naraRecord, context) {
  const classification =
    CLASSIFICATION_OVERRIDES[record.id] ||
    classificationFromText(localPdfText(record)) ||
    (/No classification marking/i.test(context.classification || "") ? "" : context.classification) ||
    record.classification ||
    context.classification;
  const status = normalizeStatus(official.status);
  const sourceNote = withClassification(record.sourceNote, classification, status, record.pageCount || context.pageCount);
  const objectUrl = context.object?.objectUrl || "";
  const alternate = {
    naid: official.naid,
    catalogUrl: `https://catalog.archives.gov/id/${official.naid}`,
    pdfUrl: objectUrl,
    title: naraRecord.title,
    indexStatus: official.status,
    archivalSourceNote: context.sourceNote
  };
  const provenanceBase = (record.provenanceNote || sourceNote).split(/\s+Bush Library index duplicate:/i)[0];
  return {
    ...record,
    releaseStatus: status,
    sourceNote,
    classification,
    officialIndex: { ...official, checkedAt: CHECKED_AT, sourceUrl: INDEX_URL },
    relatedNaids: unique([...(record.relatedNaids || []), official.naid]),
    duplicateSources: [...(record.duplicateSources || []).filter((source) => source.naid !== official.naid), alternate],
    provenanceNote: cleanText(
      `${provenanceBase} Bush Library index duplicate: NARA Catalog ID ${official.naid}; ${naraRecord.title}.`
    ),
    provenanceLinks: unique([
      ...(record.provenanceLinks || []),
      `https://catalog.archives.gov/id/${official.naid}`,
      objectUrl,
      INDEX_URL
    ]),
    compilerRisks: compilerRisks(status, sourceNote, record.pageCount || context.pageCount)
  };
}

function createRecord(official, naraRecord, context) {
  const sheetTitle = cleanText((context.sheet?.title || "").replace(/^Re:\s*/i, ""));
  const archivalTitle = sheetTitle || cleanText(naraRecord.title || "") || `${official.type}: ${official.participantsLabel}`;
  const subjectLine = subjectFromText(context.text, archivalTitle);
  const people = displayParticipants(official.participantsLabel);
  const participantText = context.text.slice(0, 5000);
  const participants = unique([
    /\bThe President\b|George (?:H\. )?W\. Bush/i.test(participantText) ? "George H. W. Bush" : "",
    ...people
  ]);
  const chapter = chapterFor(official.countryLabel);
  const status = normalizeStatus(official.status);
  return {
    id: `${official.date}-${official.naid}`,
    date: official.date,
    sortDate: official.date,
    type: official.type,
    title: archivalTitle,
    sourceTitle: archivalTitle,
    participants,
    countries: countries(official.countryLabel),
    chapter,
    releaseStatus: status,
    naid: official.naid,
    pdfUrl: context.object?.objectUrl || "",
    officialPdfUrl: context.object?.objectUrl || "",
    catalogUrl: `https://catalog.archives.gov/id/${official.naid}`,
    source: {
      name: context.sheet ? "Bush Library withdrawal/redaction sheet" : "National Archives Catalog",
      url: INDEX_URL,
      series: normalizeSeries(series(naraRecord)?.title || context.sheet?.series || ""),
      objectUrl: context.object?.objectUrl || "",
      objectFilename: context.object?.objectFilename || "",
      findingAidUrl: INDEX_URL
    },
    frusVolume: {
      id: "frus1989-92v08",
      title: "Foreign Relations of the United States, 1989-1992, Volume VIII, Western Europe",
      url: "https://history.state.gov/historicaldocuments/frus1989-92v08",
      status: "Being Researched"
    },
    frusTopics: ["Western Europe", "Presidential conversations"],
    topics: unique(["Western Europe", official.type, ...countries(official.countryLabel)]),
    pageCount: context.pageCount,
    documentTitle: official.type === "Telcon" ? "Memorandum of a Telephone Conversation" : "Memorandum of Conversation",
    subjectLine,
    dateLine: datelineFromText(context.text, official.date),
    sourceNote: context.sourceNote,
    provenanceStatus: context.provenanceStatus,
    provenanceNote: provenanceNote(context, official, naraRecord),
    provenanceLinks: unique([
      `https://catalog.archives.gov/id/${official.naid}`,
      context.object?.objectUrl,
      INDEX_URL
    ]),
    compilerRisks: compilerRisks(status, context.sourceNote, context.pageCount),
    officialIndex: { ...official, checkedAt: CHECKED_AT, sourceUrl: INDEX_URL },
    ...(context.sheet?.foiaNumber ? { foiaNumber: context.sheet.foiaNumber } : {}),
    ...(context.sheet?.extent
      ? { extentNote: `Approximate original extent: ${context.sheet.extent} ${context.sheet.extent === 1 ? "page" : "pages"}.` }
      : {})
  };
}

function reconcileLocalCopies(records, naraRecords, negativeMarkers) {
  const byId = new Map(records.map((record) => [record.id, record]));
  const removed = new Set();

  for (const [localId, officialId] of Object.entries(LOCAL_DUPLICATES)) {
    const local = byId.get(localId);
    const official = byId.get(officialId);
    if (!local || !official) continue;
    const localCopyUrl = local.pdfUrl || "";
    const note = localCopyUrl ? ` A project working copy is retained at ${localCopyUrl}.` : "";
    byId.set(officialId, {
      ...official,
      localCopyUrl,
      provenanceNote: cleanText(`${official.provenanceNote || official.sourceNote}${note}`),
      provenanceLinks: unique([...(official.provenanceLinks || []), localCopyUrl])
    });
    removed.add(localId);
  }

  for (const [recordId, citation] of Object.entries(MANUAL_CITATIONS)) {
    const record = byId.get(recordId);
    const naraRecord = naraRecords.get(citation.naid);
    if (!record || !naraRecord) continue;
    const object = digitalObject(naraRecord) || {};
    const negativeMarker = negativeMarkers.find(
      (row) => row.date === record.date && officialNameKeys(row.participantsLabel).some((key) => recordHaystack(record).includes(key))
    );
    const indexExplanation = negativeMarker
      ? "The Bush Library presidential memcon/telcon index carries a negative marker for this date; the cited working-file copy preserves the document."
      : "This document was identified outside the presidential memcon/telcon index."
    byId.set(recordId, {
      ...record,
      naid: citation.naid,
      title: citation.title,
      sourceTitle: citation.subjectLine,
      subjectLine: citation.subjectLine,
      documentTitle: citation.title,
      dateLine: citation.dateLine,
      releaseStatus: citation.releaseStatus,
      classification: citation.classification,
      pageCount: citation.pageCount,
      catalogUrl: `https://catalog.archives.gov/id/${citation.naid}`,
      officialPdfUrl: object.objectUrl || "",
      sourceNote: citation.sourceNote,
      provenanceStatus: "citation-sheet",
      provenanceNote: cleanText(
        `${citation.sourceNote} Citation data were transcribed from the Bush Library citation or withdrawal sheet in NARA Catalog ID ${citation.naid}. ${indexExplanation} Project working copy: ${record.pdfUrl}.`
      ),
      provenanceLinks: unique([
        ...(record.provenanceLinks || []),
        `https://catalog.archives.gov/id/${citation.naid}`,
        object.objectUrl,
        record.pdfUrl,
        INDEX_URL
      ]),
      source: {
        name: "Bush Library citation or withdrawal sheet",
        url: `https://catalog.archives.gov/id/${citation.naid}`,
        series: citation.naid === "470426525" ? "Richard N. Haass Files, Working File" : "Presidential Correspondence Files, Presidential Telcon Files",
        objectUrl: object.objectUrl || "",
        objectFilename: object.objectFilename || "",
        findingAidUrl: INDEX_URL
      },
      foiaNumber: citation.foiaNumber,
      relatedNaids: unique([...(record.relatedNaids || []), citation.naid]),
      compilerRisks: compilerRisks(citation.releaseStatus, citation.sourceNote, citation.pageCount),
      ...(negativeMarker ? { officialIndex: { ...negativeMarker, checkedAt: CHECKED_AT, sourceUrl: INDEX_URL } } : {})
    });
  }

  return records
    .filter((record) => !removed.has(record.id))
    .map((record) => byId.get(record.id) || record)
    .map((record) => {
      const leaderText = [record.title, record.subjectLine, ...(record.participants || [])].filter(Boolean).join(" ");
      const germanLeader = /\b(?:Helmut Kohl|Kohl|Hans-Dietrich Genscher|Genscher|Lothar de Maizi[eè]re|de Maizi[eè]re|Hans Modrow|Modrow|Erich Honecker|Honecker|Egon Krenz|Krenz)\b/i.test(leaderText);
      return {
        ...record,
        dateLine: (record.dateLine || "").replace(/\s+The,\s+/g, ", "),
        ...(germanLeader && record.chapter?.name !== "Germany Reference"
          ? { referenceSections: unique([...(record.referenceSections || []), "Germany Reference"]) }
          : {})
      };
    });
}

function byChapterDateTitle(a, b) {
  return a.chapter.number - b.chapter.number || a.date.localeCompare(b.date) || a.title.localeCompare(b.title);
}

async function main() {
  const records = JSON.parse(fs.readFileSync(MEMCONS_PATH, "utf8"));
  const rawIndex = await fetchIndex();
  const scopeRows = rawIndex.filter(
    (row) => row.date >= "1989-01-01" && row.date <= "1992-12-31" && WESTERN_EUROPE.test(row.countryLabel)
  );
  const exactByNaid = new Map();
  for (const record of records) {
    for (const value of unique([record.naid, ...(record.relatedNaids || [])])) {
      if (/^\d+$/.test(value || "")) exactByNaid.set(value, record);
    }
    for (const link of record.provenanceLinks || []) {
      const id = link.match(/(?:id\/|naId=)(\d{7,})/i)?.[1];
      if (id) exactByNaid.set(id, record);
    }
  }

  const rawNegativeMarkers = scopeRows.filter((row) => /^No\s+(?:Memcon|Telcon)$/i.test(row.type));
  const promotedRows = rawNegativeMarkers
    .filter((row) => exactByNaid.has(row.naid))
    .map((row) => {
      const record = exactByNaid.get(row.naid);
      return {
        ...row,
        type: record.type,
        status: row.status || record.releaseStatus || "Unknown",
        indexCorrection: `Index negative marker reconciled to surviving ${record.type.toLowerCase()} record.`
      };
    });
  const negativeMarkers = rawNegativeMarkers.filter((row) => !exactByNaid.has(row.naid));
  const substantive = [...scopeRows.filter((row) => /^(?:Memcon|Telcon)$/i.test(row.type)), ...promotedRows];
  const malformed = substantive.filter((row) => !/^\d+$/.test(row.naid) || row.naid === "0");
  const officialRows = substantive.filter((row) => /^\d+$/.test(row.naid) && row.naid !== "0");

  const assignments = new Map();
  const usedRecordIds = new Set();
  for (const official of officialRows) {
    const exact = exactByNaid.get(official.naid);
    if (exact && !usedRecordIds.has(exact.id)) {
      assignments.set(official.naid, exact.id);
      usedRecordIds.add(exact.id);
    }
  }
  const remainingOfficial = officialRows
    .filter((row) => !assignments.has(row.naid))
    .sort((a, b) => a.date.localeCompare(b.date) || a.type.localeCompare(b.type) || a.participantsLabel.localeCompare(b.participantsLabel) || a.naid.localeCompare(b.naid));
  for (const official of remainingOfficial) {
    const candidate = records
      .filter((record) => !usedRecordIds.has(record.id))
      .map((record) => ({ record, score: matchingScore(record, official) }))
      .filter(({ score }) => score >= 20)
      .sort((a, b) => b.score - a.score || a.record.id.localeCompare(b.record.id))[0]?.record;
    if (candidate) {
      assignments.set(official.naid, candidate.id);
      usedRecordIds.add(candidate.id);
    }
  }

  const naraNaids = unique([...officialRows.map((official) => official.naid), ...Object.values(MANUAL_CITATIONS).map((item) => item.naid)]);
  const naraPairs = await mapLimit(naraNaids, 4, async (naid) => [naid, await fetchNaraRecord(naid)]);
  const naraRecords = new Map(naraPairs.filter(([, record]) => record));
  const fileUnitIds = unique(
    [...naraRecords.values()].map((record) => String(fileUnit(record)?.naId || "")).filter(Boolean)
  );
  const fileUnitPairs = await mapLimit(fileUnitIds, 4, async (naid) => [naid, await fetchNaraRecord(naid)]);
  const fileUnitRecords = new Map(fileUnitPairs.filter(([, record]) => record));

  const officialByNaid = new Map(officialRows.map((row) => [row.naid, row]));
  const assignedByRecordId = new Map([...assignments.entries()].map(([naid, id]) => [id, naid]));
  const changed = [];
  const merged = records.map((record) => {
    const officialNaid = assignedByRecordId.get(record.id);
    if (!officialNaid) {
      if (record.provenanceStatus !== "citation-sheet") return record;
      const classification =
        CLASSIFICATION_OVERRIDES[record.id] || classificationFromText(localPdfText(record)) || record.classification;
      return { ...record, classification, sourceNote: withClassification(record.sourceNote, classification, normalizeStatus(record.releaseStatus), record.pageCount) };
    }
    const official = officialByNaid.get(officialNaid);
    const naraRecord = naraRecords.get(officialNaid);
    if (!naraRecord) return record;
    const context = naraContext(naraRecord, fileUnitRecords, normalizeStatus(official.status), record.pageCount);
    const authoritativeCitationSheet = record.provenanceStatus === "citation-sheet" && /^Source:.*OA\/ID/i.test(record.sourceNote || "");
    const updated = authoritativeCitationSheet
      ? updateCitationSheetRecord(record, official, naraRecord, context)
      : updateFromNara(record, official, naraRecord, context);
    changed.push({ id: record.id, officialNaid, mode: authoritativeCitationSheet ? "duplicate-provenance" : "reconciled" });
    return updated;
  });

  const additions = [];
  for (const official of officialRows.filter((row) => !assignments.has(row.naid))) {
    const naraRecord = naraRecords.get(official.naid);
    if (!naraRecord) continue;
    const context = naraContext(naraRecord, fileUnitRecords, normalizeStatus(official.status));
    additions.push(createRecord(official, naraRecord, context));
  }

  const finalRecords = reconcileLocalCopies([...merged, ...additions], naraRecords, negativeMarkers).sort(byChapterDateTitle);
  const unresolvedProjectOnly = finalRecords.filter((record) => record.provenanceStatus === "project-only");
  const report = {
    generatedAt: new Date().toISOString(),
    sources: {
      bushLibraryIndex: INDEX_URL,
      naraApi: NARA_SEARCH
    },
    totals: {
      indexRows: rawIndex.length,
      westernEuropeScopeRows: scopeRows.length,
      substantiveRows: substantive.length,
      validSubstantiveRows: officialRows.length,
      negativeMarkers: negativeMarkers.length,
      promotedNegativeMarkers: promotedRows.length,
      malformedRows: malformed.length,
      matchedExisting: assignments.size,
      recordsAdded: additions.length,
      recordsAfterMerge: finalRecords.length,
      unresolvedProjectOnly: unresolvedProjectOnly.length
    },
    byChapter: Object.fromEntries(
      Object.keys(CHAPTERS).map((chapter) => [
        chapter,
        {
          records: finalRecords.filter((record) => record.chapter.name === chapter).length,
          pages: finalRecords.filter((record) => record.chapter.name === chapter).reduce((sum, record) => sum + (record.pageCount || 0), 0)
        }
      ])
    ),
    referenceSections: {
      "Germany Reference": {
        records: finalRecords.filter(
          (record) => record.chapter.name === "Germany Reference" || (record.referenceSections || []).includes("Germany Reference")
        ).length,
        pages: finalRecords
          .filter(
            (record) => record.chapter.name === "Germany Reference" || (record.referenceSections || []).includes("Germany Reference")
          )
          .reduce((sum, record) => sum + (record.pageCount || 0), 0),
        crossReferences: finalRecords.filter((record) => (record.referenceSections || []).includes("Germany Reference")).length
      }
    },
    added: additions.map((record) => ({
      id: record.id,
      date: record.date,
      title: record.title,
      chapter: record.chapter.name,
      releaseStatus: record.releaseStatus,
      naid: record.naid,
      sourceNote: record.sourceNote
    })),
    reconciled: changed,
    promotedNegativeMarkers: promotedRows,
    classificationOverrides: Object.entries(CLASSIFICATION_OVERRIDES).map(([id, classification]) => ({ id, classification })),
    negativeMarkers,
    malformed,
    unresolvedProjectOnly: unresolvedProjectOnly.map((record) => record.id)
  };

  if (!DRY_RUN) {
    const json = `${JSON.stringify(finalRecords, null, 2)}\n`;
    fs.writeFileSync(MEMCONS_PATH, json);
    fs.writeFileSync(MEMCONS_JS_PATH, `window.MEMCONS = ${json};\n`);
    fs.writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
  }
  console.log(JSON.stringify(report.totals, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
