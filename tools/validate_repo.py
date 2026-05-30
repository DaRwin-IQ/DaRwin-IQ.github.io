#!/usr/bin/env python3
import gzip
import json
import lzma
import sys
from pathlib import Path


REQUIRED_FILES = [
    "index.html",
    "repo.json",
    "Release",
    "Packages",
    "Packages.gz",
    "Packages.bz2",
    "Packages.xz",
    "CydiaIcon.png",
    "build-repo.sh",
]


def read_json(path: Path) -> dict:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as error:
        raise SystemExit(f"{path} has invalid JSON: {error}") from error


def parse_packages(text: str) -> list[dict]:
    packages = []
    for block in text.strip().split("\n\n"):
        if not block.strip():
            continue
        stanza = {}
        current = None
        for line in block.splitlines():
            if line.startswith((" ", "\t")) and current:
                stanza[current] += "\n" + line.strip()
                continue
            if ":" not in line:
                continue
            key, value = line.split(":", 1)
            current = key
            stanza[key] = value.strip()
        packages.append(stanza)
    return packages


def validate(root: Path) -> list[str]:
    errors = []
    for name in REQUIRED_FILES:
        if not (root / name).exists():
            errors.append(f"missing {name}")

    config_path = root / "repo.json"
    if config_path.exists():
        config = read_json(config_path)
        if not config.get("name"):
            errors.append("repo.json missing name")
        if not isinstance(config.get("architectures"), list) or not config["architectures"]:
            errors.append("repo.json architectures must be a non-empty list")

    packages_path = root / "Packages"
    if packages_path.exists():
        packages_text = packages_path.read_text(encoding="utf-8")
        try:
            with gzip.open(root / "Packages.gz", "rb") as handle:
                if handle.read().decode("utf-8") != packages_text:
                    errors.append("Packages.gz does not match Packages")
        except Exception as error:
            errors.append(f"Packages.gz is not readable: {error}")

        try:
            if lzma.decompress((root / "Packages.xz").read_bytes()).decode("utf-8") != packages_text:
                errors.append("Packages.xz does not match Packages")
        except Exception as error:
            errors.append(f"Packages.xz is not readable: {error}")

        for package in parse_packages(packages_text):
            for field in ["Package", "Version", "Architecture", "Filename", "SHA256"]:
                if not package.get(field):
                    errors.append(f"{package.get('Package', 'unknown')} missing {field}")
            filename = package.get("Filename")
            if filename and not (filename.startswith("http://") or filename.startswith("https://")):
                if not (root / filename).exists():
                    errors.append(f"{filename} referenced in Packages but file is missing")

    return errors


def main() -> int:
    root = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else Path.cwd().resolve()
    errors = validate(root)
    if errors:
      print("Repository validation failed:")
      for error in errors:
          print(f"- {error}")
      return 1
    print("Repository validation passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
