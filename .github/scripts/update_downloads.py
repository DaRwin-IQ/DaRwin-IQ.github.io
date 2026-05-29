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
    # If GITHUB_TOKEN is available, use it to avoid rate limits
    token = os.environ.get("GITHUB_TOKEN")
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    
    try:
        with urllib.request.urlopen(req) as response:
            releases = json.loads(response.read().decode())
    except Exception as e:
        print(f"Error fetching releases: {e}")
        return {}
    
    # We will map package keywords to download counts
    # E.g., if asset name contains 'autoclicker', we add to autoclicker count
    package_downloads = {}
    
    for release in releases:
        for asset in release.get("assets", []):
            name = asset.get("name", "").lower()
            count = asset.get("download_count", 0)
            
            # Simple heuristic: if 'autoclicker' is in the asset name, attribute it to autoclicker
            # For a more robust approach, you could parse the name exactly: com.darwiniq.autoclicker
            if "autoclicker" in name:
                package_downloads["com.darwiniq.autoclicker"] = package_downloads.get("com.darwiniq.autoclicker", 0) + count
                package_downloads["com.darwiniq.autoclicker.roothide"] = package_downloads.get("com.darwiniq.autoclicker.roothide", 0) + count

    return package_downloads

def update_depiction(depiction_path, downloads):
    if not os.path.exists(depiction_path):
        return
    
    with open(depiction_path, "r", encoding="utf-8") as f:
        data = json.load(f)
        
    updated = False
    
    # Traverse tabs and views to find the "التحميلات" or "Downloads" TableTextView
    for tab in data.get("tabs", []):
        for view in tab.get("views", []):
            if view.get("class") == "DepictionTableTextView":
                if view.get("title") == "التحميلات" or view.get("title") == "Downloads":
                    old_count = view.get("text")
                    new_count = str(downloads)
                    if old_count != new_count:
                        view["text"] = new_count
                        updated = True

    if updated:
        with open(depiction_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
            # Add newline at end of file
            f.write("\n")
        print(f"Updated {depiction_path} to {downloads} downloads.")
    else:
        print(f"No update needed for {depiction_path} (downloads: {downloads})")

def main():
    downloads_map = get_downloads_per_package()
    print("Download counts:", downloads_map)
    
    # Update each depiction if it matches
    for package_id, count in downloads_map.items():
        depiction_path = f"depictions/{package_id}/depiction.json"
        update_depiction(depiction_path, count)

if __name__ == "__main__":
    main()
