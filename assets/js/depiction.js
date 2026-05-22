(function () {
  function parsePackages(text) {
    if (window.RepoPackageParser) return window.RepoPackageParser.parsePackages(text);
    return [];
  }

  function field(pkg, key, fallback) {
    return pkg[key] || fallback || "Not set";
  }

  function descriptionLines(pkg) {
    return (pkg.Description || "No package description is available yet.")
      .split(/\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  }

  function createDetail(label, value) {
    const item = document.createElement("div");
    item.className = "detail-item";

    const dt = document.createElement("div");
    dt.className = "detail-label";
    dt.textContent = label;

    const dd = document.createElement("div");
    dd.className = "detail-value";
    dd.textContent = value || "Not set";

    item.append(dt, dd);
    return item;
  }

  function render(pkg) {
    const main = document.getElementById("depiction-main");
    const meta = document.getElementById("depiction-meta");
    if (!main || !meta) return;

    const title = field(pkg, "Name", field(pkg, "Package", "Package"));
    const lines = descriptionLines(pkg);
    const repoUrl = window.RepoConfig && window.RepoConfig.resolvedUrl ? window.RepoConfig.resolvedUrl : "https://darwin-iq.github.io/";
    main.innerHTML = "";
    document.title = title + " - DaRwin-iQ";

    const prompt = document.createElement("div");
    prompt.className = "prompt";
    prompt.innerHTML = '<span class="prompt-user">darwin@iq</span><span class="prompt-arrow">~</span><span class="prompt-arrow">❯</span><span class="prompt-cmd">pkg info ' + field(pkg, "Package") + '</span>';
    main.appendChild(prompt);
    const spacer = document.createElement("div");
    spacer.className = "spacer";
    main.appendChild(spacer);

    const hero = document.createElement("div");
    hero.className = "package-title";

    const icon = document.createElement("img");
    icon.className = "depiction-icon";
    icon.src = pkg.Icon || "../CydiaIcon.png";
    icon.alt = "";
    icon.loading = "lazy";

    const heading = document.createElement("div");

    const h1 = document.createElement("h1");
    h1.className = "package-name";
    h1.textContent = title;

    const id = document.createElement("div");
    id.className = "package-id";
    id.textContent = field(pkg, "Package");

    heading.append(h1, id);
    hero.append(icon, heading);
    main.append(hero);

    const details = document.createElement("div");
    details.className = "details-list";
    details.append(
      createDetail("Latest Package", title),
      createDetail("Version", field(pkg, "Version")),
      createDetail("Architecture", field(pkg, "Architecture")),
      createDetail("Depends", field(pkg, "Depends"))
    );
    main.appendChild(details);

    const descLabel = document.createElement("div");
    descLabel.className = "section-title";
    descLabel.textContent = "Description";
    main.appendChild(descLabel);

    const summaryWrap = document.createElement("div");
    summaryWrap.className = "desc-list";
    const first = document.createElement("div");
    first.className = "desc-line";
    first.textContent = lines[0];
    summaryWrap.appendChild(first);

    if (lines.length > 1) {
      lines.slice(1).forEach((line) => {
        const item = document.createElement("div");
        item.className = "desc-line";
        item.textContent = line;
        summaryWrap.appendChild(item);
      });
    }
    main.appendChild(summaryWrap);

    const actions = document.createElement("div");
    actions.className = "action-bar";

    const add = document.createElement("a");
    add.className = "add-btn";
    add.href = "sileo://source/" + repoUrl;
    add.textContent = "Add to Sileo";
    actions.appendChild(add);

    if (pkg.Filename) {
      const download = document.createElement("a");
      download.className = "ghost-btn";
      download.href = new URL(pkg.Filename, repoUrl).href;
      download.textContent = "Download DEB";
      actions.appendChild(download);
    }

    const back = document.createElement("a");
    back.className = "ghost-btn";
    back.href = "../";
    back.textContent = "Back Home";
    actions.appendChild(back);

    main.appendChild(actions);

    meta.innerHTML = "";
    const metaTitle = document.createElement("h2");
    metaTitle.textContent = "Package metadata";
    meta.appendChild(metaTitle);

    const cards = document.createElement("div");

    const rows = [
      ["Identifier", field(pkg, "Package")],
      ["Maintainer", field(pkg, "Maintainer")],
      ["Section", field(pkg, "Section")],
      ["Version", field(pkg, "Version")],
      ["Architecture", field(pkg, "Architecture")],
      ["Source", repoUrl]
    ];

    rows.forEach(([key, value]) => {
      const card = document.createElement("div");
      card.className = "meta-card";
      const dt = document.createElement("dt");
      const dd = document.createElement("dd");
      dt.textContent = key;
      dd.textContent = value;
      card.append(dt, dd);
      cards.appendChild(card);
    });

    meta.appendChild(cards);

    const footer = document.createElement("div");
    footer.className = "panel-footer";

    const sourceLink = document.createElement("a");
    sourceLink.className = "add-btn";
    sourceLink.href = "sileo://source/" + repoUrl;
    sourceLink.textContent = "Add to Sileo";

    const repo = document.createElement("div");
    repo.className = "panel-url";
    repo.textContent = repoUrl;

    const note = document.createElement("div");
    note.className = "panel-note";
    note.textContent = "Package details follow the same terminal layout as the source homepage.";

    footer.append(sourceLink, repo, note);
    meta.appendChild(footer);
  }

  async function init() {
    const packageId = new URLSearchParams(window.location.search).get("package");
    if (!packageId) return;
    const root = window.RepoSite ? window.RepoSite.repoRoot() : "../";
    try {
      const response = await fetch(new URL("Packages", root).href, { cache: "no-store" });
      if (!response.ok) throw new Error("Packages unavailable");
      const packages = parsePackages(await response.text());
      const pkg = packages.find((item) => item.Package === packageId);
      if (pkg) render(pkg);
    } catch (error) {
      return;
    }
  }

  init();
})();
