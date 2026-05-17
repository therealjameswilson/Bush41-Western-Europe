const childProcess = require("child_process");
const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const dataPath = path.join(repoRoot, "data", "memcons.json");
const dataScriptPath = path.join(repoRoot, "data", "memcons.js");
const documentsRoot = path.join(repoRoot, "documents");
const reportPath = path.join(repoRoot, "reports", "local-pdf-ingest.json");
const sourceRoot =
  process.argv[2] || "/Users/jameswilson/bush-memcons-extractor/output/pdfs";

const FRUS_VOLUME = {
  id: "frus1989-92v08",
  title: "Foreign Relations of the United States, 1989-1992, Volume VIII, Western Europe",
  url: "https://history.state.gov/historicaldocuments/frus1989-92v08",
  status: "Being Researched"
};

const SOURCE = {
  name: "Local Bush memcons extractor output",
  url: "https://github.com/therealjameswilson/Bush41-Western-Europe"
};

const PEOPLE = {
  Thatcher: ["United Kingdom", 1, "United Kingdom", "Margaret Thatcher", "United Kingdom bilateral relations"],
  Major: ["United Kingdom", 1, "United Kingdom", "John Major", "United Kingdom bilateral relations"],
  Hurd: ["United Kingdom", 1, "United Kingdom", "Douglas Hurd", "United Kingdom bilateral relations"],
  Mitterrand: ["France", 2, "France", "Francois Mitterrand", "France bilateral relations"],
  Dumas: ["France", 2, "France", "Roland Dumas", "France bilateral relations"],
  Andreotti: ["Italy", 3, "Italy", "Giulio Andreotti", "Italy bilateral relations"],
  Cossiga: ["Italy", 3, "Italy", "Francesco Cossiga", "Italy bilateral relations"],
  Kohl: ["Regional", 4, "Germany", "Helmut Kohl", "Germany and German unification"],
  Genscher: ["Regional", 4, "Germany", "Hans-Dietrich Genscher", "Germany and German unification"],
  Gonzalez: ["Regional", 4, "Spain", "Felipe Gonzalez", "Spain bilateral relations"],
  Delors: ["Regional", 4, "European Community", "Jacques Delors", "European Community diplomacy"],
  Lubbers: ["Regional", 4, "Netherlands", "Ruud Lubbers", "Netherlands bilateral relations"],
  Woerner: ["Regional", 4, "NATO", "Manfred Woerner", "NATO"],
  Worner: ["Regional", 4, "NATO", "Manfred Worner", "NATO"],
  Mitsotakis: ["Regional", 4, "Greece", "Constantine Mitsotakis", "Greece bilateral relations"],
  Brundtland: ["Regional", 4, "Norway", "Gro Harlem Brundtland", "Norway bilateral relations"],
  Schluter: ["Regional", 4, "Denmark", "Poul Schluter", "Denmark bilateral relations"],
  Schlueter: ["Regional", 4, "Denmark", "Poul Schluter", "Denmark bilateral relations"],
  Cavaco: ["Regional", 4, "Portugal", "Anibal Cavaco Silva", "Portugal bilateral relations"],
  Soares: ["Regional", 4, "Portugal", "Mario Soares", "Portugal bilateral relations"],
  Vranitzky: ["Regional", 4, "Austria", "Franz Vranitzky", "Austria bilateral relations"],
  Santer: ["Regional", 4, "Luxembourg", "Jacques Santer", "Luxembourg bilateral relations"],
  Martens: ["Regional", 4, "Belgium", "Wilfried Martens", "Belgium bilateral relations"]
};

function dateFromPrefix(prefix) {
  const year = Number(prefix.slice(0, 2));
  if (year < 89 || year > 92) return null;
  return `19${prefix.slice(0, 2)}-${prefix.slice(2, 4)}-${prefix.slice(4, 6)}`;
}

function slug(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function pdfPages(filePath) {
  const output = childProcess.execFileSync("pdfinfo", [filePath], { encoding: "utf8" });
  const match = output.match(/^Pages:\s+(\d+)/m);
  return match ? Number(match[1]) : null;
}

function classifyFile(fileName) {
  const match = fileName.match(/^(\d{6})_BushAND([A-Za-z]+)_(Memcon|Telcon)(?:_(\d+))?\.pdf$/);
  if (!match) return null;

  const date = dateFromPrefix(match[1]);
  const personInfo = PEOPLE[match[2]];
  if (!date || !personInfo) return null;

  const [chapterName, chapterNumber, country, person, topic] = personInfo;
  const filePath = path.join(sourceRoot, fileName);
  const pageCount = pdfPages(filePath);
  const sequence = match[4] || "";

  return {
    fileName,
    filePath,
    date,
    type: match[3],
    counterpartKey: match[2],
    sequence,
    chapterName,
    chapterNumber,
    country,
    person,
    topic,
    pageCount,
    size: fs.statSync(filePath).size
  };
}

function existingMemconKeys(records) {
  const keys = new Set();
  for (const record of records) {
    if (record.type !== "Memcon") continue;
    const haystack = `${record.title} ${record.participants.join(" ")}`.toLowerCase();
    for (const key of Object.keys(PEOPLE)) {
      if (haystack.includes(key.toLowerCase())) {
        keys.add(`${record.date}|${key.toLowerCase()}|Memcon`);
      }
    }
  }
  return keys;
}

function selectCanonical(candidates) {
  const groups = new Map();
  for (const candidate of candidates) {
    const key = `${candidate.date}|${candidate.counterpartKey.toLowerCase()}|${candidate.type}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(candidate);
  }

  return [...groups.values()].map((group) => {
    group.sort((a, b) => {
      const unsequenced = Number(!b.sequence) - Number(!a.sequence);
      return unsequenced || b.pageCount - a.pageCount || b.size - a.size || a.fileName.localeCompare(b.fileName);
    });
    return group[0];
  });
}

function destinationFor(candidate) {
  const chapterSlug = slug(candidate.chapterName);
  const fileBase = `${candidate.date}-bush-${slug(candidate.person)}-${candidate.type.toLowerCase()}.pdf`;
  return {
    relativePath: `documents/${chapterSlug}/${fileBase}`,
    absolutePath: path.join(documentsRoot, chapterSlug, fileBase)
  };
}

function toRecord(candidate) {
  const destination = destinationFor(candidate);
  const titleType =
    candidate.type === "Telcon" ? "Telephone conversation" : "Meeting memorandum";

  return {
    id: `local-${candidate.date}-${slug(candidate.person)}-${candidate.type.toLowerCase()}`,
    date: candidate.date,
    sortDate: candidate.date,
    type: candidate.type,
    title: `${titleType}: President Bush and ${candidate.person}`,
    sourceTitle: candidate.fileName,
    participants: ["George H. W. Bush", candidate.person],
    countries: ["United States", candidate.country],
    chapter: {
      number: candidate.chapterNumber,
      name: candidate.chapterName
    },
    releaseStatus: "Unknown",
    naid: `local-${path.basename(candidate.fileName, ".pdf")}`,
    pdfUrl: destination.relativePath,
    catalogUrl: destination.relativePath,
    source: SOURCE,
    frusVolume: FRUS_VOLUME,
    frusTopics: ["Western Europe", candidate.topic],
    topics: ["Western Europe", candidate.topic],
    pageCount: candidate.pageCount,
    localOriginalFile: candidate.fileName,
    notes: "Deduped from the local Bush memcons extractor output; official catalog metadata still needs manual reconciliation."
  };
}

function writeRecordData(records) {
  const json = JSON.stringify(records, null, 2);
  fs.writeFileSync(dataPath, `${json}\n`);
  fs.writeFileSync(dataScriptPath, `window.MEMCON_RECORDS = ${json};\n`);
}

function main() {
  if (!fs.existsSync(sourceRoot)) {
    throw new Error(`Source folder does not exist: ${sourceRoot}`);
  }

  const records = JSON.parse(fs.readFileSync(dataPath, "utf8"));
  const sourceFiles = fs.readdirSync(sourceRoot).filter((file) => file.endsWith(".pdf"));
  const candidates = sourceFiles.map(classifyFile).filter(Boolean);
  const canonical = selectCanonical(candidates);
  const existingKeys = existingMemconKeys(records);
  const additions = canonical.filter((candidate) => {
    const key = `${candidate.date}|${candidate.counterpartKey.toLowerCase()}|${candidate.type}`;
    return !(candidate.type === "Memcon" && existingKeys.has(key));
  });

  const review = additions.filter((candidate) => candidate.pageCount > 75);
  const included = additions.filter((candidate) => candidate.pageCount <= 75);
  const existingIds = new Set(records.map((record) => record.id));
  const newRecords = [];

  for (const candidate of included) {
    const destination = destinationFor(candidate);
    fs.mkdirSync(path.dirname(destination.absolutePath), { recursive: true });
    fs.copyFileSync(candidate.filePath, destination.absolutePath);

    const record = toRecord(candidate);
    if (!existingIds.has(record.id)) newRecords.push(record);
  }

  const mergedRecords = [...records, ...newRecords].sort((a, b) => {
    return (
      a.chapter.number - b.chapter.number ||
      a.sortDate.localeCompare(b.sortDate) ||
      a.title.localeCompare(b.title)
    );
  });

  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  writeRecordData(mergedRecords);
  fs.writeFileSync(
    reportPath,
    `${JSON.stringify(
      {
        sourceRoot,
        sourcePdfCount: sourceFiles.length,
        westernEuropeCandidates: candidates.length,
        dedupedCandidates: canonical.length,
        addedRecords: newRecords.length,
        copiedPdfBytes: included.reduce((sum, candidate) => sum + candidate.size, 0),
        copiedPdfPages: included.reduce((sum, candidate) => sum + candidate.pageCount, 0),
        reviewRecords: review.map((candidate) => ({
          fileName: candidate.fileName,
          date: candidate.date,
          type: candidate.type,
          person: candidate.person,
          pageCount: candidate.pageCount,
          size: candidate.size,
          reason: "Held out because the local PDF is more than 75 pages and should be manually checked before publishing."
        }))
      },
      null,
      2
    )}\n`
  );

  console.log(`Added ${newRecords.length} records from ${sourceRoot}`);
  console.log(`Copied ${(included.reduce((sum, candidate) => sum + candidate.size, 0) / 1024 / 1024).toFixed(1)} MB of PDFs`);
  console.log(`Held ${review.length} oversized local packets for review`);
}

main();
