#!/usr/bin/env python3
import json
import urllib.request
import os
import sys

# Repo to check releases from
REPO = os.environ.get("GITHUB_REPOSITORY", "DaRwin-IQ/DaRwin-IQ.github.io")
API_URL = f"https://api.github.com/repos/{REPO}/releases"

def get_downloads_per_package():
    print(f"Fetching releases from {API_URL}")
    req = urllib.request.Request(API_URL)
    token = os.environ.get("GITHUB_TOKEN")
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    
    try:
        with urllib.request.urlopen(req) as response:
            releases = json.loads(response.read().decode())
    except Exception as e:
        print(f"Error fetching releases: {e}")
        return {}
    
    package_downloads = {}
    
    for release in releases:
        for asset in release.get("assets", []):
            name = asset.get("name", "").lower()
            count = asset.get("download_count", 0)
            
            # Attributing downloads to specific IDs
            if "roothide" in name:
                package_downloads["com.darwiniq.autoclicker.roothide"] = package_downloads.get("com.darwiniq.autoclicker.roothide", 0) + count
            elif "rootful" in name:
                package_downloads["com.darwiniq.autoclicker.rootful"] = package_downloads.get("com.darwiniq.autoclicker.rootful", 0) + count
            elif "autoclicker" in name:
                # This catches the main non-roothide/non-rootful deb
                package_downloads["com.darwiniq.autoclicker"] = package_downloads.get("com.darwiniq.autoclicker", 0) + count

    return package_downloads

def update_depiction(depiction_path, downloads):
    if not os.path.exists(depiction_path):
        return
    
    with open(depiction_path, "r", encoding="utf-8") as f:
        data = json.load(f)
        
    updated = False
    for tab in data.get("tabs", []):
        for view in tab.get("views", []):
            if view.get("class") == "DepictionTableTextView":
                if view.get("title") in ["التحميلات", "Downloads"]:
                    old_count = view.get("text")
                    new_count = str(downloads)
                    if old_count != new_count:
                        view["text"] = new_count
                        updated = True

    if updated:
        with open(depiction_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
            f.write("\n")
        print(f"Updated {depiction_path} to {downloads} downloads.")
    else:
        print(f"No update needed for {depiction_path} (downloads: {downloads})")

def main():
    downloads_map = get_downloads_per_package()
    print("Download counts:", downloads_map)
    
    # 1. Update main depiction.json for standard and roothide
    update_depiction("depictions/com.darwiniq.autoclicker/depiction.json", downloads_map.get("com.darwiniq.autoclicker", 0))
    update_depiction("depictions/com.darwiniq.autoclicker.roothide/depiction.json", downloads_map.get("com.darwiniq.autoclicker.roothide", 0))
    
    # 2. Update depiction1.json for rootful (stored in com.darwiniq.autoclicker folder)
    update_depiction("depictions/com.darwiniq.autoclicker/depiction1.json", downloads_map.get("com.darwiniq.autoclicker.rootful", 0))

if __name__ == "__main__":
    main()
