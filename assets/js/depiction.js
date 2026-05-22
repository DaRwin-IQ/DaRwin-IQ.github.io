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

  function render(pkg) {
    const main = document.getElementById("depiction-main");
    const meta = document.getElementById("depiction-meta");
    if (!main || !meta) return;

    const title = field(pkg, "Name", field(pkg, "Package", "Package"));
    const lines = descriptionLines(pkg);
    const repoUrl = window.RepoConfig && window.RepoConfig.resolvedUrl ? window.RepoConfig.resolvedUrl : "https://darwin-iq.github.io/";
    main.innerHTML = "";
    document.title = title + " - DaRwin-iQ";

    const hero = document.createElement("div");
    hero.className = "depiction-hero";

    const icon = document.createElement("img");
    icon.className = "depiction-icon";
    icon.src = pkg.Icon || "../CydiaIcon.png";
    icon.alt = "";

    const heading = document.createElement("div");

    const label = document.createElement("p");
    label.className = "section-label";
    label.textContent = field(pkg, "Section", "Package");

    const h1 = document.createElement("h1");
    h1.textContent = title;

    const summary = document.createElement("p");
    summary.textContent = lines[0];

    heading.append(label, h1);
    hero.append(icon, heading);
    main.append(hero, summary);

    if (lines.length > 1) {
      const list = document.createElement("ul");
      list.className = "feature-list";
      lines.slice(1).forEach((line) => {
        const item = document.createElement("li");
        item.textContent = line;
        list.appendChild(item);
      });
      main.appendChild(list);
    }

    const actions = document.createElement("div");
    actions.className = "depiction-actions";

    const add = document.createElement("a");
    add.className = "button dark";
    add.href = "sileo://source/" + repoUrl;
    add.textContent = "Add to Sileo";
    actions.appendChild(add);

    if (pkg.Filename) {
      const download = document.createElement("a");
      download.className = "button soft";
      download.href = new URL(pkg.Filename, repoUrl).href;
      download.textContent = "Download";
      actions.appendChild(download);
    }

    main.appendChild(actions);

    const rows = [
      ["Identifier", field(pkg, "Package")],
      ["Version", field(pkg, "Version")],
      ["Architecture", field(pkg, "Architecture")],
      ["Depends", field(pkg, "Depends")],
      ["Maintainer", field(pkg, "Maintainer")],
      ["Source", repoUrl]
    ];

    meta.innerHTML = "";
    rows.forEach(([key, value]) => {
      const row = document.createElement("div");
      const dt = document.createElement("dt");
      const dd = document.createElement("dd");
      dt.textContent = key;
      dd.textContent = value;
      row.append(dt, dd);
      meta.appendChild(row);
    });
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
