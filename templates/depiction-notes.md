# Depiction Notes

The default web depiction is `depictions/?package=<package-id>`.

For each package, add useful release information to the Debian control
description. The first description line becomes the summary, and continuation
lines become the body on the depiction page.

If a package needs a native Sileo depiction, use exactly one JSON file:
`depictions/<package-id>/depiction.json`.

Point `SileoDepiction:` in the control file to that full URL.
