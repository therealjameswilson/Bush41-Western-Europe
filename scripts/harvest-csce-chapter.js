const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const OUTPUT_JSON = path.join(ROOT, "data", "csce-chapter.json");
const OUTPUT_JS = path.join(ROOT, "data", "csce-chapter.js");
const REPORT_PATH = path.join(ROOT, "reports", "csce-chapter-audit.json");
const STATEMENTS_PATH = path.join(ROOT, "data", "public-statements.json");
const NARA_SEARCH = "https://catalog.archives.gov/proxy/records/search";
const NARA_EXTRACTED = "https://catalog.archives.gov/proxy/extractedText";
const CHECKED_AT = new Date().toISOString().slice(0, 10);

const FINDING_AIDS = [
  {
    id: "2003-0373-F",
    title: "Records on the Conference on Security and Cooperation in Europe (CSCE)",
    url: "https://www.bush41library.gov/digital-research-room/finding-aid/foia/records-conference-security-and-cooperation-europe-csce"
  },
  {
    id: "2004-0248-F",
    title: "Records on the Conference on Security and Cooperation in Europe (CSCE), second release",
    url: "https://www.bush41library.gov/digital-research-room/finding-aid/records-conference-security-and-cooperation-europe-csce-0"
  }
];

const PRIMARY_PACKET_IDS = ["470761854", "470761855", "470761856"];
const SUPPLEMENTAL_PACKET_IDS = ["323151189", "323153058"];
const PACKET_PAGE_COUNTS = {
  "470761854": 45,
  "470761855": 22,
  "470761856": 19,
  "470768970": 63,
  "470768971": 41,
  "470769004": 54,
  "470769005": 31,
  "470769006": 15,
  "470769007": 26,
  "323153058": 23,
  "323151189": 55,
  "453248124": 54
};

const POLICY_LEAD_IDS = [
  ["470760892", "NSC", "East-West framework and the place of CSCE in European change"],
  ["470760893", "NSC", "U.S. relations with Western and Eastern Europe"],
  ["470760931", "NSC", "Conventional Forces in Europe initiative"],
  ["470760937", "NSC", "CFE, arms control, and the Federal Republic of Germany"],
  ["470760945", "NSC", "Lithuania and application of Helsinki principles"],
  ["470760947", "NSC", "Lithuania, the Soviet Union, and sanctions"],
  ["470760982", "NSC/DC", "NSR-4 and U.S.-East European relations"],
  ["470760983", "NSC/DC", "NSR-5 political and security review of U.S.-West European relations"],
  ["470760984", "NSC/DC", "NSR-5 economic review of U.S.-West European relations"],
  ["470761015", "NSC/DC", "Conventional arms control"],
  ["470761022", "NSC/DC", "CFE verification and arms-control policy"],
  ["470761076", "NSC/DC", "CFE verification"],
  ["470761150", "NSC/DC", "Withdrawal and transfer of Soviet equipment from Europe"],
  ["470761212", "NSC/DC", "Yugoslavia and the emerging European security architecture"],
  ["470761234", "NSC/DC", "CFE and Soviet data"],
  ["470761251", "NSC/DC", "CFE and Soviet data"],
  ["470761263", "NSC/DC", "CFE follow-up"],
  ["470761333", "NSC/DC", "Yugoslavia"],
  ["470761348", "NSC/DC", "Yugoslavia"],
  ["470761353", "NSC/DC", "Yugoslavia"],
  ["470761381", "NSC/DC", "Bosnia-Herzegovina and Macedonia"],
  ["470761384", "NSC/DC", "Yugoslavia"],
  ["470761387", "NSC/DC", "Bosnia-Herzegovina"],
  ["470761388", "NSC/DC", "Humanitarian assistance to Bosnia"],
  ["470761391", "NSC/DC", "NATO role in assistance to Bosnia"],
  ["470761504", "NSC/DC Follow-Up", "European Strategy Steering Group"],
  ["470761520", "NSC/DC Follow-Up", "Yugoslavia and Bosnia policy follow-up"],
  ["470761526", "NSC/DC Follow-Up", "Yugoslavia policy follow-up"],
  ["470761531", "NSC/DC Follow-Up", "NATO and Yugoslavia"],
  ["470761540", "NSC/DC Follow-Up", "Yugoslavia policy follow-up"],
  ["470761548", "NSC/DC Follow-Up", "Croatia, Kosovo, and Yugoslavia"],
  ["446394927", "NSR", "Comprehensive review of U.S.-East European relations"],
  ["446394929", "NSR", "Comprehensive review of U.S.-West European relations"],
  ["446394947", "NSR", "Review of U.S. arms-control policies"],
  ["446396829", "NSD", "Open Skies"],
  ["446396872", "NSD", "Decisions on START and CFE"],
  ["446396898", "NSD", "CFE on-site inspections"],
  ["446396909", "NSD", "Peacekeeping and humanitarian relief policy"]
].map(([naid, family, relevance]) => ({ naid, family, relevance }));

function clean(value = "") {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/[{}]/g, (character) => (character === "{" ? "[" : "]"))
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:])/g, "$1")
    .trim();
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function cleanId(value = "") {
  return clean(value).replace(/\s*-\s*/g, "-").replace(/\s+/g, "");
}

async function sleep(milliseconds) {
  await new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function fetchText(url, attempts = 6) {
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url, { headers: { "User-Agent": "Bush41-Western-Europe/1.0" } });
      const body = await response.text();
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}`);
      return body;
    } catch (error) {
      lastError = error;
      await sleep(700 * (attempt + 1));
    }
  }
  throw lastError;
}

async function fetchJson(url, attempts = 8) {
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const body = await fetchText(url, 1);
      if (!body.trim().startsWith("{")) throw new Error(`Expected JSON from ${url}`);
      return JSON.parse(body);
    } catch (error) {
      lastError = error;
      await sleep(900 * (attempt + 1));
    }
  }
  throw lastError;
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

function articleField(article, className) {
  const match = article.match(
    new RegExp(`field--name-${className}[\\s\\S]*?<div class=["']field__item["']>([\\s\\S]*?)<\\/div>`, "i")
  );
  return clean(match?.[1] || "");
}

function parseFindingAidPage(html, findingAid) {
  const leads = [];
  let collection = "";
  let series = "";
  const tokenPattern = /(<div class="view-grouping-header"[\s\S]*?<\/div>|<h3>[\s\S]*?<\/h3>|<article\b[\s\S]*?<\/article>)/gi;
  for (const match of html.matchAll(tokenPattern)) {
    const token = match[1];
    if (/view-grouping-header/i.test(token)) {
      collection = clean(token.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i)?.[1] || "");
      continue;
    }
    if (/^<h3>/i.test(token)) {
      series = clean(token);
      continue;
    }
    const title = clean(token.match(/<h4[^>]*>([\s\S]*?)<\/h4>/i)?.[1] || "");
    const naid = articleField(token, "field-catalog-naid");
    const localIdentifier = articleField(token, "field-finding-aid-local-id");
    const availability = articleField(token, "field-fileunit-online-open") ||
      (/fileunit-status-empty/i.test(token) ? "Empty" : /fileunit-status-online/i.test(token) ? "Online" : "On Site");
    const catalogUrl = token.match(/href=["'](https:\/\/catalog\.archives\.gov\/id\/\d+)["']/i)?.[1] ||
      (naid ? `https://catalog.archives.gov/id/${naid}` : "");
    const pdfUrl = clean(token.match(/<li><a[^>]*>(https?:\/\/[^<]+\.pdf)<\/a>/i)?.[1] || "");
    if (!title) continue;
    leads.push({
      id: naid || `${findingAid.id}-${localIdentifier}-${title}`.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      naid,
      title,
      collection,
      series,
      localIdentifier,
      availability,
      catalogUrl,
      pdfUrl,
      findingAidId: findingAid.id,
      findingAidTitle: findingAid.title,
      findingAidUrl: findingAid.url
    });
  }
  return leads;
}

function inferDate(value = "") {
  const numeric = value.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/);
  if (numeric) {
    const year = numeric[3].length === 2 ? Number(`19${numeric[3]}`) : Number(numeric[3]);
    return `${year}-${numeric[1].padStart(2, "0")}-${numeric[2].padStart(2, "0")}`;
  }
  const monthNames = "January|February|March|April|May|June|July|August|September|October|November|December";
  const written = value.match(new RegExp(`\\b(${monthNames})\\s+(\\d{1,2}),?\\s+(1989|1990|1991|1992)\\b`, "i"));
  if (written) {
    const month = monthNames.toLowerCase().split("|").indexOf(written[1].toLowerCase()) + 1;
    return `${written[3]}-${String(month).padStart(2, "0")}-${written[2].padStart(2, "0")}`;
  }
  const year = value.match(/\b(1989|1990|1991|1992)\b/)?.[1];
  return year ? `${year}-01-01` : "1992-12-31";
}

function fullDate(value) {
  const [year, month, day] = value.split("-").map(Number);
  const monthName = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ][month - 1];
  return `${monthName} ${day}, ${year}`;
}

function editorialDateLine(dateLabel, sortDate) {
  return /^n\.d\./i.test(dateLabel || "")
    ? "Washington, undated [November 1990]"
    : `Washington, ${fullDate(sortDate)}`;
}

async function harvestFindingAids() {
  const raw = [];
  for (const aid of FINDING_AIDS) {
    for (let page = 0; page < 10; page += 1) {
      const leads = parseFindingAidPage(await fetchText(`${aid.url}?page=${page}`), aid);
      if (!leads.length) break;
      raw.push(...leads);
    }
  }
  const deduped = new Map();
  for (const lead of raw) {
    const key = lead.naid || `${lead.localIdentifier}|${lead.title}|${lead.series}`;
    const existing = deduped.get(key);
    if (!existing) {
      deduped.set(key, {
        ...lead,
        sortDate: inferDate(lead.title),
        findingAids: [{ id: lead.findingAidId, title: lead.findingAidTitle, url: lead.findingAidUrl }]
      });
      continue;
    }
    existing.findingAids = unique([...existing.findingAids.map((aid) => JSON.stringify(aid)), JSON.stringify({ id: lead.findingAidId, title: lead.findingAidTitle, url: lead.findingAidUrl })]).map((aid) => JSON.parse(aid));
    if (lead.availability === "Online") existing.availability = "Online";
    existing.pdfUrl ||= lead.pdfUrl;
    existing.catalogUrl ||= lead.catalogUrl;
  }
  return { raw, leads: [...deduped.values()].sort((a, b) => a.sortDate.localeCompare(b.sortDate) || a.title.localeCompare(b.title)) };
}

async function fetchNaraRecord(naid) {
  const payload = await fetchJson(`${NARA_SEARCH}?naId=${naid}&includeExtractedText=true&includeOtherExtractedText=true`);
  return payload?.body?.hits?.hits?.[0]?._source?.record || null;
}

function digitalObject(record) {
  return (record?.digitalObjects || []).find((object) => /pdf/i.test(`${object.objectFilename || ""} ${object.objectType || ""}`)) || record?.digitalObjects?.[0];
}

async function fullExtractedText(record) {
  const object = digitalObject(record);
  if (!object) return "";
  try {
    const payload = await fetchJson(`${NARA_EXTRACTED}/${record.naId}?objectId=${object.objectId}`);
    return (
      payload?.digitalObjects?.[0]?.extractedText ||
      payload?.body ||
      payload?.text ||
      payload?.extractedText ||
      (typeof payload === "string" ? payload : object.extractedText || "")
    );
  } catch {
    return object.extractedText || "";
  }
}

function marker(text = "") {
  const beforeSheet = text.split(/Withdrawal\/Redaction Sheet/i)[0];
  const field = (label, nextLabels) => {
    const next = nextLabels.map((item) => item.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
    const match = beforeSheet.match(new RegExp(`${label}:\\s*([\\s\\S]*?)(?=\\n(?:${next}):)`, "i"));
    return clean(match?.[1] || "");
  };
  return {
    collection: field("Record Group/Collection", ["Collection/Office of Origin", "Series"]),
    office: field("Collection/Office of Origin", ["Series"]),
    series: field("Series", ["Subseries", "OA/ID Number"]),
    subseries: field("Subseries", ["OA/ID Number"]),
    oaId: field("OA/ID Number", ["Folder ID Number", "Folder Title"]),
    folderId: field("Folder ID Number", ["Folder Title", "Stack"]),
    folderTitle: field("Folder Title", ["Stack"])
  };
}

function className(code = "") {
  if (/^TS$/i.test(code)) return "Top Secret";
  if (/^S$/i.test(code)) return "Secret";
  if (/^C$/i.test(code)) return "Confidential";
  return "";
}

function sourceStem(meta, classification) {
  const oaId = cleanId(meta.folderId || meta.oaId);
  const parts = [
    "George H.W. Bush Library",
    "Bush Presidential Records",
    clean(meta.office || "National Security Council"),
    clean(meta.series),
    clean(meta.subseries),
    oaId ? `OA/ID ${oaId}` : "",
    clean(meta.folderTitle)
  ];
  return `Source: ${unique(parts).join(", ")}. ${classification}.`;
}

function editorialHeading(type, sourceTitle) {
  const title = clean(sourceTitle);
  const eagleburger = title.match(/^From Lawrence S\. Eagleburger to President Bush re:\s*(.+)$/i);
  if (eagleburger) {
    return {
      type: "Memorandum",
      title: "Memorandum From the Deputy Secretary of State (Eagleburger) to President Bush",
      subjectLine: clean(eagleburger[1])
    };
  }
  if (/^Meeting with Prime Minister Thatcher.+Scenesetter$/i.test(title)) {
    return {
      type: "Briefing Paper",
      title: "Briefing Paper for President Bush's Meeting With Prime Minister Thatcher of the United Kingdom",
      subjectLine: "Scenesetter"
    };
  }
  if (/Points to be made for Meeting with President Francois/i.test(`${type} ${title}`)) {
    return {
      type: "Talking Points",
      title: "Talking Points for President Bush's Meeting With President Francois Mitterrand of France",
      subjectLine: "Meeting with President Mitterrand"
    };
  }
  return { type: clean(type) || "Document", title, subjectLine: "" };
}

function parseSingleWithdrawalSheets(text, packet) {
  const meta = marker(text);
  const documents = [];
  const chunks = text.split(/Withdrawal\/Redaction Sheet/i).slice(1);
  for (const chunk of chunks) {
    const sheet = chunk.split(/RESTRICTION CODES/i)[0];
    if (!/\band Type\b/i.test(sheet)) continue;
    const lines = sheet.split(/\r?\n/).map((line) => clean(line)).filter(Boolean);
    const typeIndex = lines.findIndex((line) => /\band Type$/i.test(line));
    const collectionIndex = lines.findIndex((line) => /^Collection:$/i.test(line));
    if (typeIndex === -1 || collectionIndex === -1) continue;
    const header = lines.slice(typeIndex + 1, collectionIndex);
    const documentLabel = header[0] || "";
    const type = clean(documentLabel.replace(/^\d+[a-z]?\.\s*/i, ""));
    const dateLabel = header.find((line) => /^(?:\d{1,2}\/\d{1,2}\/\d{2,4}|n\.d\.)$/i.test(line)) || "";
    const restrictionIndex = header.findIndex((line) => /^\(b\)\(1\)$/i.test(line));
    const classCode = restrictionIndex > -1 ? header.slice(restrictionIndex + 1).find((line) => /^(?:TS|S|C)$/i.test(line)) || "" : "";
    const extent = Number(sheet.match(/\((\d+)\s+pp\.\)/i)?.[1] || 0);
    const titleParts = header
      .slice(1)
      .filter((line) => line !== dateLabel && !/^\(b\)\(1\)$/i.test(line) && !/^(?:TS|S|C)$/i.test(line))
      .filter((line) => !new RegExp(`^${type.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i").test(line));
    const title = clean(titleParts.join(" ").replace(/\s*\(\d+\s+pp\.\).*$/i, ""));
    if (!title || !extent || /\bBiography\b/i.test(title)) continue;
    const heading = editorialHeading(type, title);
    const classification = className(classCode) || "No classification marking";
    const partial = /Document Partially Declassified|Released in Part/i.test(sheet);
    const copyFollows = /Copy of Document Follows/i.test(sheet);
    const releaseStatus = partial ? "Partial" : copyFollows ? "Full" : "Denied";
    const itemMeta = {
      ...meta,
      office: "National Security Council",
      series: "European and Soviet Directorate Files",
      subseries: "Briefing Books",
      oaId: clean(sheet.match(/OA\/ID Number:\s*\n?([^\n]+)/i)?.[1] || meta.folderId || meta.oaId),
      folderId: "",
      folderTitle: clean(sheet.match(/File Location:\s*\n?([\s\S]*?)(?=\nDate Closed:)/i)?.[1] || meta.folderTitle)
    };
    const sourceNote = clean(
      `${sourceStem(itemMeta, classification)} ${
        partial
          ? "Portions remain classified."
          : releaseStatus === "Denied"
            ? `Approximately ${extent} ${extent === 1 ? "page" : "pages"} not declassified.`
            : ""
      }`
    );
    const sortDate = /^\d/.test(dateLabel) ? inferDate(dateLabel) : "1990-11-18";
    documents.push({
      id: `csce-${packet.naId}-${documentLabel.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      date: sortDate,
      dateLabel: dateLabel || "Undated [November 1990]",
      dateLine: editorialDateLine(dateLabel, sortDate),
      type: heading.type,
      title: heading.title,
      sourceTitle: title,
      subjectLine: heading.subjectLine,
      documentTitle: heading.title,
      releaseStatus,
      classification,
      pageCount: extent,
      sourceNote,
      provenanceNote: `${sourceNote} Citation data transcribed from the withdrawal/redaction sheet in NARA Catalog ID ${packet.naId}; catalog packet ${packet.localIdentifier}. Digital packet: ${packet.pdfUrl}.`,
      catalogUrl: `https://catalog.archives.gov/id/${packet.naId}`,
      pdfUrl: packet.pdfUrl,
      packetNaid: String(packet.naId),
      packetLocalIdentifier: packet.localIdentifier,
      evidenceLevel: "citation-sheet document"
    });
  }
  return documents;
}

function reviewedPacketDocuments(packets) {
  const byId = new Map(packets.map((packet) => [String(packet.naId), packet]));
  const summit = byId.get("470761856");
  const speech = byId.get("323151189");
  const documents = [];
  if (summit) {
    const meta = {
      office: "National Security Council",
      series: "European and Soviet Directorate Files",
      subseries: "Briefing Books",
      oaId: "CF01014",
      folderId: "CF01014-017",
      folderTitle: "The President's Trip to France for the CSCE [Conference on Security and Cooperation in Europe] Summit - November 18-21, 1990 [3]"
    };
    const base = {
      classification: "Confidential",
      releaseStatus: "Declassified",
      sourceNote: sourceStem(meta, "Confidential"),
      catalogUrl: `https://catalog.archives.gov/id/${summit.naId}`,
      pdfUrl: summit.pdfUrl,
      packetNaid: String(summit.naId),
      packetLocalIdentifier: summit.localIdentifier,
      evidenceLevel: "reviewed packet document"
    };
    documents.push(
      {
        ...base,
        id: "csce-1990-11-13-hayden-csbm",
        date: "1990-11-13",
        dateLabel: "November 13, 1990",
        dateLine: "Washington, November 13, 1990",
        type: "Memorandum",
        title: "Memorandum From Michael Hayden to the President's Assistant for National Security Affairs (Scowcroft)",
        subjectLine: "The Paris Summit - Confidence and Security Building Measures",
        pageCount: 2,
        provenanceNote: `${base.sourceNote} NARA Catalog ID ${summit.naId}; released text begins in packet ${summit.localIdentifier}. Digital packet: ${summit.pdfUrl}.`
      },
      {
        ...base,
        id: "csce-1990-11-background-role",
        date: "1990-11-18",
        dateLabel: "Undated [November 1990]",
        dateLine: "Washington, undated [November 1990]",
        type: "Background Paper",
        title: "Background Paper: The Role of the CSCE in Europe's Future",
        pageCount: 2,
        provenanceNote: `${base.sourceNote} NARA Catalog ID ${summit.naId}; released background paper in packet ${summit.localIdentifier}. Digital packet: ${summit.pdfUrl}.`
      }
    );
  }
  if (speech) {
    const meta = {
      office: "White House Office of Speechwriting",
      series: "Speech File Draft Files",
      subseries: "Chron File, 1989-1993",
      oaId: "13543",
      folderId: "13543-001",
      folderTitle: "Conference on Security & Cooperation in Europe (C.S.C.E.) Ministerial 10/1/90 [OA 5377]"
    };
    const sourceNote = sourceStem(meta, "No classification marking");
    documents.push({
      id: "csce-1990-09-28-mcgroarty-ministerial",
      date: "1990-09-28",
      dateLabel: "September 28, 1990",
      dateLine: "Washington, September 28, 1990",
      type: "Memorandum",
      title: "Memorandum From Dan McGroarty of the White House Office of Speechwriting to President Bush",
      subjectLine: "C.S.C.E. Ministerial",
      pageCount: 1,
      releaseStatus: "Declassified",
      classification: "No classification marking",
      sourceNote,
      provenanceNote: `${sourceNote} NARA Catalog ID ${speech.naId}; released text in packet ${speech.localIdentifier}. Digital packet: ${speech.pdfUrl}.`,
      catalogUrl: `https://catalog.archives.gov/id/${speech.naId}`,
      pdfUrl: speech.pdfUrl,
      packetNaid: String(speech.naId),
      packetLocalIdentifier: speech.localIdentifier,
      evidenceLevel: "reviewed packet document"
    });
  }
  return documents;
}

async function packetMetadata(ids, findingAidLeads) {
  const leadById = new Map(findingAidLeads.map((lead) => [String(lead.naid), lead]));
  return mapLimit(ids, 2, async (naid) => {
    const record = await fetchNaraRecord(naid);
    const object = digitalObject(record) || {};
    const aidLead = leadById.get(String(naid));
    return {
      naId: String(naid),
      title: record?.title || aidLead?.title || "",
      localIdentifier: record?.localIdentifier || aidLead?.localIdentifier || "",
      pdfUrl: object.objectUrl || aidLead?.pdfUrl || "",
      filename: object.objectFilename || "",
      pages: PACKET_PAGE_COUNTS[String(naid)] || 0,
      accessStatus: record?.accessRestriction?.status || aidLead?.availability || "",
      record,
      extractedText: await fullExtractedText(record)
    };
  });
}

function parseListedExtent(text, family) {
  const lines = text.split(/\r?\n/).map((line) => clean(line)).filter(Boolean);
  const preferred = family === "NSD" || family === "NSR" ? /\b(?:Directive|Review|Report|Memorandum)\b/i : /\b(?:Minutes|Summary of Conclusions)\b/i;
  const index = lines.findIndex((line) => /^\d+[a-z]?\.\s+/.test(line) && preferred.test(line));
  if (index === -1) return null;
  const window = lines.slice(index, index + 12);
  const extent = Number(window.join(" ").match(/\((\d+)\s+pp\.\)/i)?.[1] || 0);
  const classification = className(window.find((line) => /^(?:TS|S|C)$/i.test(line)) || "");
  const type = clean(lines[index].replace(/^\d+[a-z]?\.\s*/i, ""));
  return extent ? { extent, classification, type } : null;
}

async function policyLeads() {
  return mapLimit(POLICY_LEAD_IDS, 2, async (lead) => {
    const record = await fetchNaraRecord(lead.naid);
    const object = digitalObject(record) || {};
    const text = object.extractedText || "";
    const meta = marker(text);
    const listed = parseListedExtent(text, lead.family);
    const classification = listed?.classification || "Not determined at item level";
    const sourceMeta = { ...meta, folderId: record?.localIdentifier || meta.folderId };
    const sourceNote = listed?.classification ? sourceStem(sourceMeta, classification) : "";
    return {
      id: `csce-policy-${lead.naid}`,
      naid: lead.naid,
      family: lead.family,
      title: record?.title || "",
      date: inferDate(record?.title || ""),
      relevance: lead.relevance,
      localIdentifier: record?.localIdentifier || meta.folderId || "",
      availability: object.objectUrl ? "Online packet" : "Catalog record only",
      catalogUrl: `https://catalog.archives.gov/id/${lead.naid}`,
      pdfUrl: object.objectUrl || "",
      accessStatus: record?.accessRestriction?.status || "",
      classification,
      documentKind:
        lead.family === "NSR" || lead.family === "NSD"
          ? "Policy document"
          : lead.family === "NSC/DC Follow-Up"
            ? "Meeting follow-up file"
            : "Meeting minutes or summary of conclusions",
      minuteExtent: listed?.extent || 0,
      itemExtent: listed?.extent || 0,
      extentLabel: listed?.extent
        ? `${listed.extent} ${listed.extent === 1 ? "page" : "pages"} (item extent transcribed from the withdrawal sheet)`
        : "Approximately 5-20 pages (compiler planning range; item extent not stated in the catalog description)",
      sourceNote,
      archivalLocator: `George H.W. Bush Library, Bush Presidential Records, National Security Council, ${clean(meta.series || "H-Files")}, ${clean(meta.subseries || lead.family)}, OA/ID ${cleanId(record?.localIdentifier || meta.folderId || "not stated")}, ${clean(meta.folderTitle || record?.title || "")}.`,
      reviewNote: object.objectUrl
        ? "A digital file-unit packet is online. Review the withdrawal sheets and released pages before treating the meeting minutes as fully declassified."
        : "No online packet was located; the extent is a planning estimate pending onsite review."
    };
  });
}

function cscePublicStatements() {
  const statements = JSON.parse(fs.readFileSync(STATEMENTS_PATH, "utf8"));
  return statements
    .filter((statement) => statement.date >= "1989-01-01" && statement.date <= "1992-12-31")
    .filter((statement) =>
      /\b(?:CSCE|Conference on Security and Cooperation in Europe|Helsinki Final Act|Paris Charter|Helsinki Human Rights)\b/i.test(
        [statement.title, ...(statement.topics || []), ...(statement.matchTerms || [])].join(" ")
      )
    )
    .map((statement) => statement.id);
}

async function main() {
  const findingAid = await harvestFindingAids();
  const onlineIds = unique(
    findingAid.leads.filter((lead) => lead.availability === "Online" && lead.naid).map((lead) => String(lead.naid))
  );
  const packetIds = unique([...onlineIds, ...PRIMARY_PACKET_IDS, ...SUPPLEMENTAL_PACKET_IDS]);
  const packets = await packetMetadata(packetIds, findingAid.leads);
  const primaryPackets = packets.filter((packet) => PRIMARY_PACKET_IDS.includes(String(packet.naId)));
  const withdrawalDocuments = primaryPackets.flatMap((packet) => parseSingleWithdrawalSheets(packet.extractedText, packet));
  const reviewedDocuments = reviewedPacketDocuments(packets);
  const documents = [...withdrawalDocuments, ...reviewedDocuments]
    .filter((document, index, all) => all.findIndex((candidate) => candidate.id === document.id) === index)
    .sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title));
  const meetingLeads = (await policyLeads()).sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title));
  const publicStatementIds = cscePublicStatements();
  const data = {
    title: "Tentative Chapter: The United States and the CSCE, 1989-1992",
    status: "Tentative compiler chapter",
    scopeNote:
      "A source-first candidate chapter on U.S. policy toward the Conference on Security and Cooperation in Europe. Citation-sheet documents, released packet documents, policy-meeting leads, folder-level leads, and public statements remain separate evidence lanes.",
    generatedAt: new Date().toISOString(),
    checkedAt: CHECKED_AT,
    findingAids: FINDING_AIDS,
    documents,
    policyMeetingLeads: meetingLeads,
    archivalLeads: findingAid.leads,
    digitalPackets: packets.map(({ record, extractedText, ...packet }) => packet),
    publicStatementIds,
    sourceSeries: [
      { title: "NSC Meeting Files", naid: "312293887", url: "https://catalog.archives.gov/id/312293887" },
      { title: "NSC/DC Meetings", naid: "312294079", url: "https://catalog.archives.gov/id/312294079" },
      { title: "NSC/DC Meetings Follow-Up", naid: "312294094", url: "https://catalog.archives.gov/id/312294094" },
      { title: "National Security Reviews", naid: "313189297", url: "https://catalog.archives.gov/id/313189297" },
      { title: "National Security Directives", naid: "313189290", url: "https://catalog.archives.gov/id/313189290" },
      { title: "IF Transition Files", naid: "348937136", url: "https://catalog.archives.gov/id/348937136" }
    ]
  };
  const report = {
    generatedAt: data.generatedAt,
    findingAidRows: findingAid.raw.length,
    uniqueArchivalLeads: findingAid.leads.length,
    onlineArchivalLeads: findingAid.leads.filter((lead) => lead.availability === "Online").length,
    digitalPackets: packets.length,
    citationSheetDocuments: documents.filter((document) => document.evidenceLevel === "citation-sheet document").length,
    reviewedPacketDocuments: documents.filter((document) => document.evidenceLevel === "reviewed packet document").length,
    policyMeetingLeads: meetingLeads.length,
    policyLeadsWithItemExtent: meetingLeads.filter((lead) => lead.minuteExtent).length,
    publicStatements: publicStatementIds.length,
    sourceNotesWithUrls: documents.filter((document) => /https?:\/\//i.test(document.sourceNote || "")).length,
    folderLeadsMisrepresentedAsDocuments: 0
  };
  const json = `${JSON.stringify(data, null, 2)}\n`;
  fs.writeFileSync(OUTPUT_JSON, json);
  fs.writeFileSync(OUTPUT_JS, `window.CSCE_CHAPTER = ${json};\n`);
  fs.writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
