(function () {
  const defaults = {
    name: "DaRwin-iQ",
    suite: "stable",
    url: "",
    description: "A polished iOS package source for Sileo, Zebra, and Cydia."
  };

  function repoRoot() {
    const path = window.location.pathname;
    const marker = "/depictions/";
    if (path.includes(marker)) {
      return window.location.origin + path.slice(0, path.indexOf(marker) + 1);
    }
    return new URL("./", window.location.href).href;
  }

  function normalizeRepoUrl(config) {
    const configured = (config.url || "").trim();
    const url = configured || repoRoot();
    return url.endsWith("/") ? url : url + "/";
  }

  function setText(selector, value) {
    document.querySelectorAll(selector).forEach((node) => {
      node.textContent = value;
    });
  }

  function addSourceUrl(manager, source) {
    const encoded = encodeURIComponent(source);
    if (manager === "sileo") return "sileo://source/" + source;
    if (manager === "zebra") return "zbra://sources/add/" + source;
    if (manager === "cydia") return "cydia://url/https://cydia.saurik.com/api/share#?source=" + encoded;
    return source;
  }

  async function loadConfig() {
    try {
      const response = await fetch(new URL("repo.json", repoRoot()).href, { cache: "no-store" });
      if (!response.ok) throw new Error("repo.json unavailable");
      return Object.assign({}, defaults, await response.json());
    } catch (error) {
      return defaults;
    }
  }

  async function init() {
    const config = await loadConfig();
    const source = normalizeRepoUrl(config);
    window.RepoConfig = Object.assign({}, config, { resolvedUrl: source });

    document.title = document.title.replace("DaRwin-iQ", config.name || defaults.name);
    setText("[data-repo-suite]", config.suite || defaults.suite);
    setText("#repo-url", source);
    setText("#source-title", source);

    document.querySelectorAll("[data-add-source]").forEach((link) => {
      const manager = link.getAttribute("data-add-source");
      link.setAttribute("href", addSourceUrl(manager, source));
    });

    const copyButton = document.querySelector("[data-copy-repo]");
    if (copyButton) {
      copyButton.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(source);
          copyButton.textContent = "Copied";
          setTimeout(() => {
            copyButton.textContent = "Copy";
          }, 1400);
        } catch (error) {
          copyButton.textContent = "Select";
        }
      });
    }
  }

  window.RepoSite = { repoRoot, loadConfig };
  init();
})();
