const CHAPTER_ORDER = ["United Kingdom", "France", "Italy", "Regional"];

const recordsRoot = document.querySelector("#records-root");
const totalRecords = document.querySelector("#total-records");

function formatDate(dateString) {
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

function setChapterCounts(records) {
  totalRecords.textContent = records.length.toString();

  for (const chapterName of CHAPTER_ORDER) {
    const count = records.filter((record) => record.chapter.name === chapterName).length;
    const node = document.querySelector(`[data-chapter-count="${chapterName}"]`);
    if (node) {
      node.textContent = count.toString();
    }
  }
}

function createMeta(record) {
  const meta = document.createElement("div");
  meta.className = "record-meta";

  for (const value of [
    record.countries.filter((country) => country !== "United States").join(", "),
    `NAID ${record.naid}`,
    ...record.frusTopics.slice(0, 3)
  ]) {
    if (!value) continue;
    const item = document.createElement("span");
    item.textContent = value;
    meta.append(item);
  }

  return meta;
}

function createRecordRow(record) {
  const row = document.createElement("article");
  row.className = "record-row";

  const date = document.createElement("time");
  date.className = "record-date";
  date.dateTime = record.date;
  date.textContent = formatDate(record.date);

  const body = document.createElement("div");
  const title = document.createElement("a");
  title.className = "record-title";
  title.href = record.catalogUrl;
  title.rel = "noreferrer";
  title.textContent = record.title;
  body.append(title, createMeta(record));

  const links = document.createElement("div");
  links.className = "record-links";

  const catalog = document.createElement("a");
  catalog.href = record.catalogUrl;
  catalog.rel = "noreferrer";
  catalog.textContent = "Catalog";
  links.append(catalog);

  if (record.pdfUrl) {
    const pdf = document.createElement("a");
    pdf.href = record.pdfUrl;
    pdf.rel = "noreferrer";
    pdf.textContent = "PDF";
    links.append(pdf);
  }

  row.append(date, body, links);
  return row;
}

function renderRecords(records) {
  const sorted = [...records].sort(byChapterThenDate);
  recordsRoot.replaceChildren();

  for (const chapterName of CHAPTER_ORDER) {
    const chapterRecords = sorted.filter((record) => record.chapter.name === chapterName);
    const section = document.createElement("section");
    section.className = "record-chapter";
    section.id = `chapter-${chapterName.toLowerCase().replaceAll(" ", "-")}`;

    const header = document.createElement("div");
    header.className = "record-chapter-header";

    const heading = document.createElement("h3");
    heading.textContent = `Chapter ${CHAPTER_ORDER.indexOf(chapterName) + 1}: ${chapterName}`;

    const count = document.createElement("p");
    count.className = "record-count";
    count.textContent = `${chapterRecords.length} records`;
    header.append(heading, count);

    const list = document.createElement("div");
    list.className = "record-list";
    for (const record of chapterRecords) {
      list.append(createRecordRow(record));
    }

    section.append(header, list);
    recordsRoot.append(section);
  }
}

async function init() {
  try {
    const response = await fetch("data/memcons.json");
    if (!response.ok) throw new Error(`Could not load records: ${response.status}`);
    const records = await response.json();
    setChapterCounts(records);
    renderRecords(records);
  } catch (error) {
    recordsRoot.innerHTML =
      '<p class="error">The memcon records could not be loaded. Try opening this site through a local server or GitHub Pages.</p>';
  }
}

init();
