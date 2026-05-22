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

    const heading = document.createElement("div");

    const h1 = document.createElement("h1");
    h1.textContent = title;

    const id = document.createElement("div");
    id.className = "package-id";
    id.textContent = field(pkg, "Package");

    const summary = document.createElement("p");
    summary.textContent = lines[0];

    heading.append(h1, id);
    hero.append(icon, heading);
    main.append(hero);

    const infoLine = document.createElement("div");
    infoLine.className = "output-line highlight";
    infoLine.textContent = "  Latest Package     :  " + title;
    main.appendChild(infoLine);

    const repoLine = document.createElement("div");
    repoLine.className = "output-line";
    repoLine.textContent = "  Repository URL     :  " + repoUrl;
    main.appendChild(repoLine);

    const archLine = document.createElement("div");
    archLine.className = "output-line";
    archLine.textContent = "  Architecture       :  " + field(pkg, "Architecture");
    main.appendChild(archLine);

    const depLine = document.createElement("div");
    depLine.className = "output-line";
    depLine.textContent = "  Depends            :  " + field(pkg, "Depends");
    main.appendChild(depLine);

    const descLabel = document.createElement("div");
    descLabel.className = "section-title";
    descLabel.textContent = "Description";
    main.appendChild(descLabel);

    const summaryWrap = document.createElement("div");
    summaryWrap.className = "desc-list";
    const first = document.createElement("div");
    first.className = "desc-line";
    first.textContent = summary.textContent;
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
      download.textContent = "Download DEB";
      actions.appendChild(download);
    }

    const back = document.createElement("a");
    back.className = "button soft";
    back.href = "../";
    back.textContent = "Back Home";
    actions.appendChild(back);

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
