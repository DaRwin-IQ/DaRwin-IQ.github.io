(function () {
  function parsePackages(text) {
    return text
      .split(/\n{2,}/)
      .map((block) => block.trim())
      .filter(Boolean)
      .map((block) => {
        const item = {};
        let current = null;
        block.split(/\n/).forEach((line) => {
          if (/^\s/.test(line) && current) {
            item[current] += "\n" + line.trim();
            return;
          }
          const index = line.indexOf(":");
          if (index === -1) return;
          current = line.slice(0, index);
          item[current] = line.slice(index + 1).trim();
        });
        return item;
      });
  }

  function describe(pkg) {
    return (pkg.Description || "No description provided.").split(/\n/)[0];
  }

  function packageTitle(pkg) {
    return pkg.Name || pkg.Package || "Unknown Package";
  }

  function depictionUrl(pkg) {
    if (pkg.Depiction) return pkg.Depiction;
    const root = window.RepoConfig && window.RepoConfig.resolvedUrl ? window.RepoConfig.resolvedUrl : "./";
    return new URL("depictions/?package=" + encodeURIComponent(pkg.Package || ""), root).href;
  }

  function renderPackage(pkg) {
    const article = document.createElement("article");
    article.className = "package-card";

    const header = document.createElement("div");
    header.className = "package-card-header";

    const icon = document.createElement("img");
    icon.className = "package-icon";
    icon.src = pkg.Icon || "CydiaIcon.png";
    icon.alt = "";
    icon.loading = "lazy";

    const title = document.createElement("h3");
    title.textContent = packageTitle(pkg);
    header.append(icon, title);

    const description = document.createElement("p");
    description.textContent = describe(pkg);

    const meta = document.createElement("div");
    meta.className = "package-meta";
    [pkg.Version, pkg.Section, pkg.Architecture].filter(Boolean).forEach((value) => {
      const pill = document.createElement("span");
      pill.className = "pill";
      pill.textContent = value;
      meta.appendChild(pill);
    });

    const actions = document.createElement("div");
    actions.className = "package-actions";

    const view = document.createElement("a");
    view.href = depictionUrl(pkg);
    view.textContent = "Details";
    actions.appendChild(view);

    if (pkg.Filename) {
      const download = document.createElement("a");
      download.href = pkg.Filename;
      download.textContent = "Download";
      actions.appendChild(download);
    }

    article.append(header, description, meta, actions);
    return article;
  }

  function populateSections(packages) {
    const select = document.getElementById("section-filter");
    if (!select) return;
    const sections = Array.from(new Set(packages.map((pkg) => pkg.Section).filter(Boolean))).sort();
    sections.forEach((section) => {
      const option = document.createElement("option");
      option.value = section;
      option.textContent = section;
      select.appendChild(option);
    });
  }

  function filterPackages(packages) {
    const query = (document.getElementById("package-search")?.value || "").toLowerCase().trim();
    const section = document.getElementById("section-filter")?.value || "";
    return packages.filter((pkg) => {
      const searchable = [pkg.Package, pkg.Name, pkg.Description, pkg.Section, pkg.Maintainer].join(" ").toLowerCase();
      return (!query || searchable.includes(query)) && (!section || pkg.Section === section);
    });
  }

  function render(packages) {
    const grid = document.getElementById("package-grid");
    if (!grid) return;
    const visible = filterPackages(packages);
    grid.innerHTML = "";
    if (!visible.length) {
      const empty = document.createElement("article");
      empty.className = "empty-state";
      empty.innerHTML = "<h3>No packages found</h3><p>Try another search or section.</p>";
      grid.appendChild(empty);
      return;
    }
    visible.forEach((pkg) => grid.appendChild(renderPackage(pkg)));
  }

  async function init() {
    const root = window.RepoSite ? window.RepoSite.repoRoot() : "./";
    try {
      const response = await fetch(new URL("Packages", root).href, { cache: "no-store" });
      if (!response.ok) throw new Error("Packages unavailable");
      const packages = parsePackages(await response.text());
      window.RepoPackages = packages;
      document.querySelectorAll("[data-package-count]").forEach((node) => {
        node.textContent = String(packages.length);
      });
      const updated = response.headers.get("last-modified");
      if (updated) {
        document.querySelectorAll("[data-repo-updated]").forEach((node) => {
          node.textContent = "Updated " + new Date(updated).toLocaleDateString();
        });
      }
      populateSections(packages);
      render(packages);
      document.getElementById("package-search")?.addEventListener("input", () => render(packages));
      document.getElementById("section-filter")?.addEventListener("change", () => render(packages));
    } catch (error) {
      window.RepoPackages = [];
      render([]);
    }
  }

  window.RepoPackageParser = { parsePackages };
  init();
})();
