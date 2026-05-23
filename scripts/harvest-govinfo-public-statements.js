const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const DATA_PATH = path.join(ROOT, "data", "public-statements.json");
const DATA_JS_PATH = path.join(ROOT, "data", "public-statements.js");
const REPORT_PATH = path.join(ROOT, "reports", "govinfo-public-statements-audit.json");
const GOVINFO_SEARCH_URL = "https://www.govinfo.gov/wssearch/search";

const GOVINFO_PACKAGES = [
  ["PPP-1989-book1", "1989-01-20", "1989-06-30", "1989, Book I"],
  ["PPP-1989-book2", "1989-07-01", "1989-12-31", "1989, Book II"],
  ["PPP-1990-book1", "1990-01-01", "1990-06-30", "1990, Book I"],
  ["PPP-1990-book2", "1990-07-01", "1990-12-31", "1990, Book II"],
  ["PPP-1991-book1", "1991-01-01", "1991-06-30", "1991, Book I"],
  ["PPP-1991-book2", "1991-07-01", "1991-12-31", "1991, Book II"],
  ["PPP-1992-book1", "1992-01-01", "1992-07-31", "1992, Book I"],
  ["PPP-1992-book2", "1992-08-01", "1993-01-20", "1992-93, Book II"]
].map(([id, start, end, label]) => ({
  id,
  start,
  end,
  label,
  packageUrl: `https://www.govinfo.gov/app/details/${id}`,
  contextUrl: `https://www.govinfo.gov/app/details/${id}/context`
}));

const COUNTRY_TERMS = [
  ["United Kingdom", /\b(united kingdom|great britain|britain|british|scotland|wales|london(?!,\s*kentucky)|thatcher|hurd)\b/i],
  ["France", /\b(france|french|paris|mitterrand|dumas|rocard)\b/i],
  ["Italy", /\b(italy|italian|rome|andreotti|cossiga|giuliano amato|prime minister amato)\b/i],
  ["Germany", /\b(germany|german|federal republic of germany|west germany|east germany|gdr|bonn|berlin|mainz|kohl|genscher|de maiziere|diepgen)\b/i],
  ["Belgium", /\b(belgium|belgian|brussels|martens)\b/i],
  ["Netherlands", /\b(netherlands|dutch|the hague|amsterdam|lubbers)\b/i],
  ["Luxembourg", /\b(luxembourg|santer)\b/i],
  ["Denmark", /\b(denmark|danish|copenhagen|schlueter|schluter)\b/i],
  ["Norway", /\b(norway|norwegian|oslo|brundtland)\b/i],
  ["Sweden", /\b(sweden|swedish|stockholm|bildt)\b/i],
  ["Finland", /\b(finland|finnish|helsinki)\b/i],
  ["Austria", /\b(austria|austrian|vienna(?!,\s*virginia)|vranitzky)\b/i],
  ["Switzerland", /\b(switzerland|swiss|bern|geneva)\b/i],
  ["Ireland", /\b(ireland|irish|dublin|fitzgerald|haughey|reynolds)\b/i],
  ["Iceland", /\b(iceland|icelandic|reykjavik)\b/i],
  ["Greece", /\b(greece|greek|athens|mitsotakis)\b/i],
  ["Portugal", /\b(portugal|portuguese|lisbon|soares|cavaco)\b/i],
  ["Spain", /\b(spain|spanish|madrid|barcelona)\b/i],
  ["Turkey", /\b(turkish|ankara|ozal|demirel)\b/i],
  ["Holy See", /\b(vatican|holy see|pope|john paul)\b/i]
];

const LEADER_TERMS = [
  ["Helmut Kohl", /\bhelmut kohl|chancellor kohl\b/i],
  ["Margaret Thatcher", /\bmargaret thatcher|prime minister thatcher\b/i],
  ["John Major", /\bjohn major|prime minister major\b/i],
  ["Francois Mitterrand", /\bfran[cç]ois mitterrand|president mitterrand\b/i],
  ["Giulio Andreotti", /\bgiulio andreotti|prime minister andreotti\b/i],
  ["Hans-Dietrich Genscher", /\bgenscher\b/i],
  ["Felipe Gonzalez", /\bfelipe gonz[aá]lez\b/i],
  ["Pope John Paul II", /\bpope john paul\b/i],
  ["Ruud Lubbers", /\bruud lubbers|prime minister lubbers\b/i],
  ["Jacques Santer", /\bjacques santer|prime minister santer\b/i],
  ["Wilfried Martens", /\bwilfried martens|prime minister martens\b/i],
  ["Poul Schluter", /\bpoul schluter|poul schlueter|prime minister schluter|prime minister schlueter\b/i],
  ["Gro Harlem Brundtland", /\bgro harlem brundtland|prime minister brundtland\b/i],
  ["Carl Bildt", /\bcarl bildt|prime minister bildt\b/i],
  ["Franz Vranitzky", /\bfranz vranitzky|chancellor vranitzky\b/i],
  ["Constantine Mitsotakis", /\bconstantine mitsotakis|prime minister mitsotakis\b/i],
  ["Mario Soares", /\bmario soares|president soares\b/i],
  ["Anibal Cavaco Silva", /\banibal cavaco silva|cavaco silva\b/i],
  ["Manfred Worner", /\bmanfred w[öo]rner|secretary general worner\b/i],
  ["Jacques Delors", /\bjacques delors|president delors\b/i],
  ["Lothar de Maiziere", /\blothar de maizi[eè]re|de maiziere\b/i]
];

const TOPIC_TERMS = [
  ["Western Europe", /\bwestern europe\b/i],
  ["Europe", /\beurope|european\b/i],
  ["NATO", /\bnato|north atlantic alliance|north atlantic treaty\b/i],
  ["European Community", /\beuropean community\b/i],
  ["European Union", /\beuropean union|maastricht\b/i],
  ["CSCE", /\bcsce|conference on security and cooperation in europe\b/i],
  ["G-7", /\bg-?7|group of seven|economic summit|summit of industrialized nations\b/i],
  ["German unification", /\bgerman unification|unification of germany|unified germany\b/i],
  ["Berlin", /\bberlin\b/i],
  ["Trade", /\buruguay round|trade|gatt\b/i]
];

const EXCLUSION_TERMS = /\b(central european|polish|poland|hungary|hungarian|czechoslovakia|czech|slovak|romania|bulgaria|albania|soviet union|russia|russian|ukraine|ukrainian|baltic|lithuania|latvia|estonia|yugoslavia|bosnia|serbia|croatia)\b/i;
const FALSE_WESTERN_TITLE_TERMS = /\b(alleged paris meetings|central european states|checklist of white house press releases|digest of other white house announcements|george bush event timeline|london conference on the former yugoslavia|london,\s*kentucky|new england)\b/i;

const GOVINFO_FULL_TEXT_QUERIES = [
  "NATO",
  "\"Western Europe\"",
  "\"European Community\"",
  "\"European Union\"",
  "CSCE",
  "\"German unification\"",
  "\"Group of Seven\"",
  "\"G-7\"",
  "\"United Kingdom\"",
  "\"Great Britain\"",
  "Thatcher",
  "\"John Major\"",
  "Kohl",
  "Genscher",
  "\"de Maiziere\"",
  "Mitterrand",
  "Andreotti",
  "\"Giulio Andreotti\"",
  "\"Felipe Gonzalez\"",
  "\"Jacques Delors\"",
  "\"Manfred Worner\"",
  "\"Ruud Lubbers\"",
  "\"Wilfried Martens\"",
  "\"Poul Schluter\"",
  "\"Gro Harlem Brundtland\"",
  "\"Carl Bildt\"",
  "\"Franz Vranitzky\"",
  "\"Mario Soares\"",
  "\"Pope John Paul\"",
  "Maastricht",
  "\"Uruguay Round\""
];

function decodeHtml(value = "") {
  return value
    .replace(/&#(\d+);/g, (_, number) => String.fromCharCode(Number(number)))
    .replace(/&#x([0-9a-f]+);/gi, (_, number) => String.fromCharCode(parseInt(number, 16)))
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&rdquo;/g, '"')
    .replace(/&ldquo;/g, '"')
    .replace(/&mdash;/g, "-")
    .replace(/&ndash;/g, "-")
    .replace(/&eacute;/g, "e")
    .replace(/&Eacute;/g, "E");
}

function stripTags(html = "") {
  return decodeHtml(html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function slug(value = "") {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 92);
}

function normalizeTitle(value = "") {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\bthe\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isoDateFromGovInfoDate(value = "") {
  const cleaned = decodeHtml(value).replace(/^[A-Za-z]+,\s+/, "").trim();
  const date = new Date(`${cleaned} UTC`);
  if (Number.isNaN(date.valueOf())) return "";
  return date.toISOString().slice(0, 10);
}

function isoDateFromGovInfoLine(value = "") {
  const match = value.match(
    /(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),\s+([^.]*)\./i
  );
  const dateText = match?.[2] || value.match(
    /(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+(1989|1990|1991|1992|1993)/i
  )?.[0];
  if (!dateText) return "";
  const date = new Date(`${dateText} UTC`);
  return Number.isNaN(date.valueOf()) ? "" : date.toISOString().slice(0, 10);
}

function packageForDate(date) {
  return GOVINFO_PACKAGES.find((pkg) => date >= pkg.start && date <= pkg.end);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchText(url, attempts = 3) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { "User-Agent": "Bush41-Western-Europe-FRUS-compiler/1.0" },
        signal: AbortSignal.timeout(20000)
      });
      if (!response.ok) throw new Error(`${response.status} ${url}`);
      return response.text();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await delay(500 * attempt);
    }
  }
  throw lastError;
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "content-type": "application/json",
      "User-Agent": "Bush41-Western-Europe-FRUS-compiler/1.0",
      ...(options.headers || {})
    },
    signal: AbortSignal.timeout(10000)
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`${response.status} ${text.slice(0, 180)}`);
  return JSON.parse(text);
}

async function mapLimit(items, limit, callback) {
  const results = [];
  let next = 0;
  const workers = Array.from({ length: limit }, async () => {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await callback(items[index], index);
    }
  });
  await Promise.all(workers);
  return results;
}

function extractGovInfoGranules(contextHtml, packageId) {
  const records = [];
  const articleRe = /<article class="result-item level-1[\s\S]*?<\/article>/g;
  for (const [article] of contextHtml.matchAll(articleRe)) {
    const titleMatch = article.match(/<h4 class="result-title">[\s\S]*?<a href="([^"]+)">([\s\S]*?)<\/a>/);
    const dateMatch = article.match(/<h5 class="document-title">([\s\S]*?)<\/h5>/);
    if (!titleMatch || !dateMatch) continue;

    const detailsUrl = decodeHtml(titleMatch[1]);
    const title = stripTags(titleMatch[2]);
    if (/front matter|photographic portfolio|presidential documents for this book/i.test(title)) continue;

    const granuleMatch = detailsUrl.match(new RegExp(`(${packageId}-[^"/]+)`));
    const granuleId = granuleMatch ? granuleMatch[1] : "";
    if (!granuleId || !/-doc-pg/i.test(granuleId)) continue;

    const pdfMatch = article.match(/href="(https:\/\/www\.govinfo\.gov\/content\/pkg\/[^"]+\.pdf)"/);
    const htmlMatch = article.match(/href="(https:\/\/www\.govinfo\.gov\/content\/pkg\/[^"]+\.htm)"/);
    const date = isoDateFromGovInfoDate(dateMatch[1]);
    if (!date) continue;

    records.push({
      packageId,
      granuleId,
      date,
      title,
      detailsUrl: detailsUrl.startsWith("http") ? detailsUrl : `https://www.govinfo.gov${detailsUrl}`,
      pdfUrl: pdfMatch ? decodeHtml(pdfMatch[1]) : "",
      textUrl: htmlMatch ? decodeHtml(htmlMatch[1]) : ""
    });
  }
  return records;
}

function matchesByGroup(text, group) {
  return group.filter(([, pattern]) => pattern.test(text)).map(([label]) => label);
}

function keywordProfile(title, body = "") {
  const titleText = `${title}`;
  const searchText = `${title}\n${body}`;
  const bodyText = `${body}`;
  const titleCountries = matchesByGroup(titleText, COUNTRY_TERMS);
  const bodyCountries = matchesByGroup(bodyText, COUNTRY_TERMS);
  const titleLeaders = matchesByGroup(titleText, LEADER_TERMS);
  const leaders = matchesByGroup(searchText, LEADER_TERMS);
  const topics = matchesByGroup(searchText, TOPIC_TERMS);
  const titleTopics = matchesByGroup(titleText, TOPIC_TERMS);
  const bodyTopics = matchesByGroup(bodyText, TOPIC_TERMS);
  const countries = [...new Set([...titleCountries, ...bodyCountries])];
  const matchTerms = [...new Set([...countries, ...leaders, ...topics])];
  const substantiveBodyTopics = bodyTopics.filter((topic) =>
    ["Western Europe", "NATO", "European Community", "European Union", "CSCE", "G-7", "German unification", "Berlin"].includes(topic)
  );
  const titleRelevant =
    titleCountries.length > 0 ||
    titleLeaders.some(Boolean) ||
    titleTopics.some((topic) => ["Western Europe", "Europe", "NATO", "European Community", "European Union", "CSCE", "G-7", "German unification"].includes(topic));
  const bodyRelevant = leaders.length > titleLeaders.length || substantiveBodyTopics.length > 0;
  const genericEasternEuropeOnly = EXCLUSION_TERMS.test(searchText) && countries.length === 0 && !topics.includes("NATO");
  const bodyOnlyAdministrativeMatch = !titleRelevant && /\b(nomination|appointment|designation|swearing-in ceremony)\b/i.test(titleText);

  return {
    countries,
    leaders,
    topics,
    matchTerms,
    selectionBasis: titleRelevant ? "title" : bodyRelevant ? "full text" : "",
    include:
      !genericEasternEuropeOnly &&
      !bodyOnlyAdministrativeMatch &&
      (titleRelevant || bodyRelevant) &&
      !FALSE_WESTERN_TITLE_TERMS.test(titleText)
  };
}

function classifyType(title = "") {
  if (/news conference/i.test(title)) return "News Conference";
  if (/question-and-answer|exchange with reporters/i.test(title)) return "Q&A";
  if (/address/i.test(title)) return "Address";
  if (/remarks/i.test(title)) return "Remarks";
  if (/statement/i.test(title)) return "Statement";
  if (/message/i.test(title)) return "Message";
  if (/letter/i.test(title)) return "Letter";
  if (/proclamation/i.test(title)) return "Proclamation";
  if (/toast/i.test(title)) return "Toast";
  if (/interview/i.test(title)) return "Interview";
  return "Public Statement";
}

function sourceNoteForGovInfo(record, pkg) {
  return `Source: Public Papers of the Presidents of the United States: George H. W. Bush (${pkg.label}), GovInfo, ${record.title}, ${record.date}.`;
}

function toGovInfoReference(record, profile) {
  const pkg = packageForDate(record.date);
  return {
    id: `ppp-${record.date}-${slug(record.title)}`,
    date: record.date,
    sortDate: record.date,
    type: classifyType(record.title),
    title: record.title,
    countries: profile.countries,
    leaders: profile.leaders,
    topics: [...new Set(["Public Papers", ...profile.topics, ...profile.countries])],
    matchTerms: profile.matchTerms,
    sourcePackage: record.packageId,
    sourcePackageLabel: pkg?.label || record.packageId,
    sourceKind: "GovInfo granule",
    selectionBasis: profile.selectionBasis,
    detailsUrl: record.detailsUrl,
    govinfoUrl: record.detailsUrl,
    textUrl: record.textUrl,
    pdfUrl: record.pdfUrl,
    packageUrl: pkg?.packageUrl || `https://www.govinfo.gov/app/details/${record.packageId}`,
    sourceNote: sourceNoteForGovInfo(record, pkg || { label: record.packageId }),
    notes: `Selected by Western Europe country, leader, and regional keyword matching against GovInfo Public Papers ${profile.selectionBasis === "title" ? "title/text" : "full text"}.`
  };
}

function govInfoPdfUrl(packageId, granuleId = "") {
  if (granuleId) return `https://www.govinfo.gov/content/pkg/${packageId}/pdf/${granuleId}.pdf`;
  return `https://www.govinfo.gov/content/pkg/${packageId}/pdf/${packageId}.pdf`;
}

function govInfoDetailsUrl(packageId, granuleId = "") {
  return granuleId
    ? `https://www.govinfo.gov/app/details/${packageId}/${granuleId}`
    : `https://www.govinfo.gov/app/details/${packageId}`;
}

function toGovInfoSearchReference(result, query, profile) {
  const fieldMap = result.fieldMap || {};
  const packageId = fieldMap.packageid || "";
  const granuleId = fieldMap.granuleid || "";
  const title = stripTags(fieldMap.title || result.line1 || "");
  const date = isoDateFromGovInfoLine(result.line2 || "");
  const pkg = packageForDate(date);
  if (!packageId || !granuleId || !title || !date || !isPresidentialDate(date)) return null;

  return {
    id: `ppp-${date}-${slug(title)}`,
    date,
    sortDate: date,
    type: classifyType(title),
    title,
    countries: profile.countries,
    leaders: profile.leaders,
    topics: [...new Set(["Public Papers", ...profile.topics, ...profile.countries])],
    matchTerms: profile.matchTerms,
    sourcePackage: packageId,
    sourcePackageLabel: pkg?.label || packageId,
    sourceKind: "GovInfo full-text search",
    selectionBasis: "full text",
    detailsUrl: govInfoDetailsUrl(packageId, granuleId),
    govinfoUrl: govInfoDetailsUrl(packageId, granuleId),
    textUrl: fieldMap.url || `https://www.govinfo.gov/content/pkg/${packageId}/html/${granuleId}.htm`,
    pdfUrl: govInfoPdfUrl(packageId, granuleId),
    packageUrl: pkg?.packageUrl || govInfoDetailsUrl(packageId),
    sourceNote: `Source: Public Papers of the Presidents of the United States: George H. W. Bush (${pkg?.label || packageId}), GovInfo full-text search result, ${title}, ${date}.`,
    notes: `Selected by GovInfo full-text search query ${query}; teaser and title matched Western Europe country, leader, or regional policy terms.`
  };
}

function extractAppListItems(html) {
  const items = [];
  const re = /<div class="views-field views-field-title">[\s\S]*?<a href="([^"]+)">([\s\S]*?)<\/a>/g;
  for (const match of html.matchAll(re)) {
    const url = `https://www.presidency.ucsb.edu${decodeHtml(match[1])}`;
    const title = stripTags(match[2]);
    if (title) items.push({ url, title });
  }
  return items;
}

function extractAppDate(html) {
  const match = html.match(/property="dc:date"[^>]*content="(\d{4}-\d{2}-\d{2})T/);
  return match ? match[1] : "";
}

function extractAppTitle(html) {
  const match = html.match(/<div class="field-ds-doc-title">[\s\S]*?<h1>([\s\S]*?)<\/h1>/);
  return match ? stripTags(match[1]) : "";
}

function extractAppContent(html) {
  const start = html.search(/<div class="field-docs-content"[^>]*>/);
  if (start === -1) return "";
  const openEnd = html.indexOf(">", start);
  const endMarkers = [
    '<div class="field-docs-footnote"',
    '<div class="field-prez-document-citation"',
    '<div class="field-ds-filed-under-"',
    '<div class="col-sm-4 "'
  ]
    .map((marker) => html.indexOf(marker, openEnd + 1))
    .filter((index) => index > -1);
  const end = endMarkers.length ? Math.min(...endMarkers) : html.indexOf("</div>", openEnd + 1);
  return stripTags(html.slice(openEnd + 1, end > -1 ? end : undefined));
}

function toAppReference(item, html, profile) {
  const date = extractAppDate(html);
  const title = extractAppTitle(html) || item.title;
  const pkg = packageForDate(date);
  return {
    id: `ppp-${date}-${slug(title)}`,
    date,
    sortDate: date,
    type: classifyType(title),
    title,
    countries: profile.countries,
    leaders: profile.leaders,
    topics: [...new Set(["Public Papers", ...profile.topics, ...profile.countries])],
    matchTerms: profile.matchTerms,
    sourcePackage: pkg?.id || "",
    sourcePackageLabel: pkg?.label || "",
    sourceKind: "GovInfo volume reference",
    selectionBasis: profile.selectionBasis,
    detailsUrl: pkg?.packageUrl || item.url,
    govinfoUrl: pkg?.packageUrl || "",
    appUrl: item.url,
    packageUrl: pkg?.packageUrl || "",
    sourceNote: `Source: Public Papers of the Presidents of the United States: George H. W. Bush (${pkg?.label || "volume pending"}), GovInfo volume package. Individual title/date identified from the American Presidency Project public-text mirror pending GovInfo item-level granule availability for this volume.`,
    notes: `Volume-level GovInfo reference used because this GovInfo package does not expose item-level text granules in the document-in-context view. Selected from APP mirror ${profile.selectionBasis === "title" ? "title/text" : "full text"} pending GovInfo item-level availability.`
  };
}

function isPresidentialDate(date) {
  return date >= "1989-01-20" && date <= "1993-01-20";
}

async function harvestGovInfoGranules() {
  console.error("Harvesting GovInfo package contexts");
  const granules = [];
  const packageResults = await mapLimit(GOVINFO_PACKAGES, 4, async (pkg) => {
    const html = await fetchText(pkg.contextUrl);
    const packageGranules = extractGovInfoGranules(html, pkg.id);
    return {
      summary: { packageId: pkg.id, granules: packageGranules.length },
      granules: packageGranules
    };
  });

  for (const result of packageResults) {
    if (!result) continue;
    granules.push(...result.granules);
  }

  const packageSummaries = packageResults.filter(Boolean).map((result) => result.summary);
  console.error(`Evaluating ${granules.length} GovInfo granules`);

  const evaluated = await mapLimit(granules, 8, async (granule) => {
    let body = "";
    try {
      body = granule.textUrl ? await fetchText(granule.textUrl) : "";
    } catch (error) {
      body = "";
    }
    const profile = keywordProfile(granule.title, stripTags(body));
    return profile.include ? toGovInfoReference(granule, profile) : null;
  });

  return {
    records: evaluated.filter(Boolean),
    packageSummaries
  };
}

async function searchGovInfoPublicPapers(query, offset = 0) {
  return fetchJson(GOVINFO_SEARCH_URL, {
    method: "POST",
    body: JSON.stringify({
      query: `collection:ppp president:"George H. W. Bush" ${query}`,
      offset,
      pageSize: 100,
      sortBy: 2,
      historical: false
    })
  });
}

async function harvestGovInfoFullTextReferences(existingKeys) {
  console.error("Harvesting GovInfo full-text search references");
  const byKey = new Map();
  const queryReports = [];

  for (const query of GOVINFO_FULL_TEXT_QUERIES) {
    let total = 0;
    for (let offset = 0; ; offset += 100) {
      const json = await searchGovInfoPublicPapers(query, offset);
      total = json.iTotalCount || 0;
      const results = json.resultSet || [];
      for (const result of results) {
        const fieldMap = result.fieldMap || {};
        const title = stripTags(fieldMap.title || result.line1 || "");
        const date = isoDateFromGovInfoLine(result.line2 || "");
        const teaser = stripTags(fieldMap.teaser || "");
        const profile = keywordProfile(title, teaser);
        if (!profile.include || !date) continue;
        const key = `${date}|${normalizeTitle(title)}`;
        if (existingKeys.has(key)) continue;
        const reference = toGovInfoSearchReference(result, query, profile);
        if (reference) byKey.set(key, reference);
      }
      if (!results.length || offset + 100 >= total) break;
    }
    queryReports.push({ query, total });
  }

  return {
    records: [...byKey.values()],
    queryReports
  };
}

async function harvestAppVolumeReferences(existingKeys) {
  console.error("Harvesting APP list pages");
  const listItems = new Map();
  const pages = Array.from({ length: 242 }, (_, page) => page);
  const pageItems = await mapLimit(pages, 4, async (page) => {
    try {
      if (page && page % 25 === 0) console.error(`APP list page ${page}/241`);
      const html = await fetchText(`https://www.presidency.ucsb.edu/people/president/george-bush?page=${page}`);
      return extractAppListItems(html);
    } catch (error) {
      console.error(`APP list page ${page} failed: ${error.message}`);
      return [];
    }
  });

  for (const items of pageItems) {
    for (const item of items) {
      const titleProfile = keywordProfile(item.title, "");
      if (titleProfile.include) listItems.set(item.url, item);
    }
  }

  const candidates = [...listItems.values()];
  console.error(`Evaluating ${candidates.length} APP detail pages`);
  const evaluated = await mapLimit(candidates, 8, async (item) => {
    try {
      const html = await fetchText(item.url);
      const date = extractAppDate(html);
      if (!date || !isPresidentialDate(date)) return null;
      const title = extractAppTitle(html) || item.title;
      const profile = keywordProfile(title, extractAppContent(html));
      if (!profile.include) return null;
      const key = `${date}|${normalizeTitle(title)}`;
      if (existingKeys.has(key)) return null;
      return toAppReference(item, html, profile);
    } catch (error) {
      return null;
    }
  });

  return {
    records: evaluated.filter(Boolean),
    titleCandidates: candidates.length
  };
}

function dedupe(records) {
  const seen = new Map();
  const rank = {
    "GovInfo granule": 3,
    "GovInfo full-text search": 2,
    "GovInfo volume reference": 1
  };
  for (const record of records) {
    const key = `${record.date}|${normalizeTitle(record.title)}`;
    const current = seen.get(key);
    if (!current || (rank[record.sourceKind] || 0) > (rank[current.sourceKind] || 0)) seen.set(key, record);
  }
  return [...seen.values()].sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title));
}

async function main() {
  console.error("Starting Public Papers harvest");
  const govInfo = await harvestGovInfoGranules();
  const existingKeys = new Set(govInfo.records.map((record) => `${record.date}|${normalizeTitle(record.title)}`));
  const fullText = await harvestGovInfoFullTextReferences(existingKeys);
  for (const record of fullText.records) existingKeys.add(`${record.date}|${normalizeTitle(record.title)}`);
  const app = await harvestAppVolumeReferences(existingKeys);
  const records = dedupe([...govInfo.records, ...fullText.records, ...app.records]);
  const dataJson = `${JSON.stringify(records, null, 2)}\n`;

  fs.writeFileSync(DATA_PATH, dataJson);
  fs.writeFileSync(DATA_JS_PATH, `window.PUBLIC_STATEMENTS = ${dataJson};\n`);
  fs.writeFileSync(
    REPORT_PATH,
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        sourceCollection: "https://www.govinfo.gov/app/collection/ppp/president-41_Bush,%20George%20H.%20W.",
        packageSummaries: govInfo.packageSummaries,
        govInfoGranuleMatches: govInfo.records.length,
        govInfoFullTextMatches: fullText.records.length,
        govInfoFullTextQueries: fullText.queryReports,
        appTitleCandidates: app.titleCandidates,
        appVolumeReferenceMatches: app.records.length,
        totalRecords: records.length,
        sourceMix: records.reduce((memo, record) => {
          memo[record.sourceKind] = (memo[record.sourceKind] || 0) + 1;
          return memo;
        }, {}),
        selectionBasis: records.reduce((memo, record) => {
          const key = record.selectionBasis || "unspecified";
          memo[key] = (memo[key] || 0) + 1;
          return memo;
        }, {}),
        countryCounts: records.reduce((memo, record) => {
          for (const country of record.countries || []) memo[country] = (memo[country] || 0) + 1;
          return memo;
        }, {}),
        note:
          "GovInfo item-level granules were harvested where exposed in document-in-context pages. For GovInfo packages that expose only volume-level PDFs, APP public-text pages were used to identify title/date while the source anchor remains the corresponding GovInfo Public Papers volume package."
      },
      null,
      2
    )}\n`
  );

  console.log(
    JSON.stringify(
      { records: records.length, govInfo: govInfo.records.length, fullText: fullText.records.length, app: app.records.length },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
