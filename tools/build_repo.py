#!/usr/bin/env python3
import bz2
import gzip
import hashlib
import json
import lzma
import os
import subprocess
import sys
from datetime import datetime, timezone
from email.utils import format_datetime
from pathlib import Path


CONTROL_ORDER = [
    "Package",
    "Name",
    "Version",
    "Architecture",
    "Maintainer",
    "Author",
    "Section",
    "Priority",
    "Depends",
    "Conflicts",
    "Replaces",
    "Provides",
    "Description",
    "Homepage",
    "Depiction",
    "SileoDepiction",
    "Icon",
    "Filename",
    "Size",
    "MD5sum",
    "SHA1",
    "SHA256",
]


def load_config(root: Path) -> dict:
    config_path = root / "repo.json"
    if not config_path.exists():
        raise SystemExit("repo.json is missing")
    return json.loads(config_path.read_text(encoding="utf-8"))


def run_dpkg_field(deb: Path) -> dict:
    try:
        result = subprocess.run(
            ["dpkg-deb", "-f", str(deb)],
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
        )
    except FileNotFoundError as error:
        raise SystemExit("dpkg-deb is required to inspect .deb packages") from error
    except subprocess.CalledProcessError as error:
        raise SystemExit(f"failed reading {deb}: {error.stderr.strip()}") from error

    fields = {}
    current = None
    for line in result.stdout.splitlines():
        if line.startswith((" ", "\t")) and current:
            fields[current] += "\n" + line
            continue
        if ":" not in line:
            continue
        key, value = line.split(":", 1)
        current = key
        fields[key] = value.strip()
    return fields


def digest(path: Path, algorithm: str) -> str:
    hasher = hashlib.new(algorithm)
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            hasher.update(chunk)
    return hasher.hexdigest()


def relative_filename(root: Path, deb: Path) -> str:
    return deb.relative_to(root).as_posix()


def repo_url(config: dict) -> str:
    url = str(config.get("url") or "").strip()
    if not url:
        return ""
    return url if url.endswith("/") else url + "/"


def normalize_fields(root: Path, deb: Path, fields: dict, config: dict) -> dict:
    out = dict(fields)
    out.setdefault("Section", config.get("default_section", "Tweaks"))
    out.setdefault("Priority", "optional")
    out["Filename"] = relative_filename(root, deb)
    out["Size"] = str(deb.stat().st_size)
    out["MD5sum"] = digest(deb, "md5")
    out["SHA1"] = digest(deb, "sha1")
    out["SHA256"] = digest(deb, "sha256")

    base_url = repo_url(config)
    package_id = out.get("Package", "")
    if config.get("add_default_depictions", True) and base_url and package_id:
        out.setdefault("Depiction", f"{base_url}depictions/?package={package_id}")
    if base_url and package_id:
        out.setdefault("Icon", f"{base_url}CydiaIcon.png")

    required = ["Package", "Version", "Architecture", "Maintainer", "Description"]
    missing = [key for key in required if not out.get(key)]
    if missing:
        raise SystemExit(f"{deb} is missing required control fields: {', '.join(missing)}")
    return out


def render_stanza(fields: dict) -> str:
    keys = [key for key in CONTROL_ORDER if key in fields]
    keys.extend(sorted(key for key in fields if key not in keys))
    lines = []
    for key in keys:
        value = str(fields[key]).rstrip()
        if "\n" in value:
            first, *rest = value.splitlines()
            lines.append(f"{key}: {first}")
            lines.extend(line if line.startswith(" ") else f" {line}" for line in rest)
        else:
            lines.append(f"{key}: {value}")
    return "\n".join(lines)


def write_indexes(root: Path, packages_text: str) -> list[Path]:
    packages = root / "Packages"
    packages.write_text(packages_text, encoding="utf-8")

    gz_path = root / "Packages.gz"
    with gzip.open(gz_path, "wb", compresslevel=9) as handle:
        handle.write(packages_text.encode("utf-8"))

    bz2_path = root / "Packages.bz2"
    bz2_path.write_bytes(bz2.compress(packages_text.encode("utf-8"), compresslevel=9))

    xz_path = root / "Packages.xz"
    xz_path.write_bytes(
        lzma.compress(
            packages_text.encode("utf-8"),
            format=lzma.FORMAT_XZ,
            preset=9 | lzma.PRESET_EXTREME,
        )
    )
    return [packages, gz_path, bz2_path, xz_path]


def checksum_block(paths: list[Path], algorithm: str, root: Path) -> str:
    lines = []
    for path in paths:
        relative = path.relative_to(root).as_posix()
        lines.append(f" {digest(path, algorithm)} {path.stat().st_size:16d} {relative}")
    return "\n".join(lines)


def write_release(root: Path, config: dict, index_paths: list[Path]) -> None:
    now = format_datetime(datetime.now(timezone.utc), usegmt=True)
    architectures = " ".join(config.get("architectures") or ["iphoneos-arm"])
    components = " ".join(config.get("components") or ["main"])
    maintainer = config.get("maintainer") or {}
    origin = config.get("name", "DaRwin-iQ")
    description = config.get("description", "iOS package source")
    release = [
        f"Origin: {origin}",
        f"Label: {origin}",
        f"Suite: {config.get('suite', 'stable')}",
        f"Version: {config.get('version', '1.0')}",
        f"Codename: {config.get('codename', 'iphoneos')}",
        f"Date: {now}",
        f"Architectures: {architectures}",
        f"Components: {components}",
        f"Description: {description}",
    ]
    if maintainer.get("name"):
        release.append(f"Maintainer: {maintainer['name']} <{maintainer.get('email', '')}>")
    release.extend(
        [
            "MD5Sum:",
            checksum_block(index_paths, "md5", root),
            "SHA1:",
            checksum_block(index_paths, "sha1", root),
            "SHA256:",
            checksum_block(index_paths, "sha256", root),
            "",
        ]
    )
    (root / "Release").write_text("\n".join(release), encoding="utf-8")


def main() -> int:
    root = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else Path.cwd().resolve()
    config = load_config(root)
    debs = sorted((root / "debs").rglob("*.deb"))
    stanzas = []

    for deb in debs:
        fields = run_dpkg_field(deb)
        stanzas.append(render_stanza(normalize_fields(root, deb, fields, config)))

    packages_text = "\n\n".join(stanzas)
    if packages_text:
        packages_text += "\n\n"
    index_paths = write_indexes(root, packages_text)
    write_release(root, config, index_paths)

    print(f"Built {config.get('name', 'repository')}: {len(debs)} package(s)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
