# DaRwin-iQ

Professional Sileo/APT source scaffold for iOS jailbreak packages.

## Structure

- `debs/` stores package `.deb` files.
- `Packages`, `Packages.gz`, `Packages.bz2`, and `Packages.xz` are generated indexes.
- `Release` contains repo metadata and checksums.
- `depictions/` contains the web depiction page.
- `assets/` contains the site design, scripts, and images.
- `assets/package-icons/` stores optional per-package icons named by package id.
- `repo.json` controls public metadata.
- `tools/` contains build and validation scripts.

## Configure

Edit `repo.json` before publishing:

```json
{
  "url": "https://darwin-iq.github.io/"
}
```

The URL must end up pointing to the folder that contains `Release` and
`Packages`.

## Add a package

1. Build your tweak into a `.deb`.
2. Move it into `debs/`.
3. Run:

```bash
./build-repo.sh
./validate-repo.sh
```

4. Commit and publish the updated files.

Or use the update script to build, validate, commit, and push in one step:

```bash
./update-site.sh "Update package files"
```

The builder reads package metadata with `dpkg-deb -f`, adds file checksums, and
refreshes the compressed package indexes.

To use a custom icon, add a PNG named after the package id:

```text
assets/package-icons/com.example.package.png
```

## GitHub Pages

This repo includes `.github/workflows/pages.yml`. After pushing to GitHub:

1. Open the repository settings.
2. Go to Pages.
3. Select GitHub Actions as the source.
4. Push to `main`.

GitHub Pages must serve `.nojekyll` so files such as `Packages` and `Release`
are delivered exactly as written.

## Package Control Template

Use `templates/control` as a starting point. Required Debian fields:

- `Package`
- `Version`
- `Architecture`
- `Maintainer`
- `Description`

Recommended fields:

- `Name`
- `Section`
- `Author`
- `Depends`
- `Homepage`
- `Depiction`

## Source Links

The website generates package-manager links from the published URL:

- Sileo: `sileo://source/<repo-url>`
- Zebra: `zbra://sources/add/<repo-url>`
- Cydia: `cydia://url/https://cydia.saurik.com/api/share#?source=<repo-url>`
