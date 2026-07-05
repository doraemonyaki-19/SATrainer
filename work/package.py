#!/usr/bin/env python
"""Build a trimmed, distributable zip of SATrainer: runtime files only
(no source PDFs, extraction scripts, node_modules, or build output). Packed
under a top-level SATrainer/ folder; the .command launcher keeps its exec bit.
"""
import os, zipfile, stat

OUT = "SATrainer.zip"
TOP_FILES = [
    "index.html", "electron-main.js", "package.json",
    "README.md", "PACKAGING.md", "SATrainer.command", "SATrainer.bat",
]
DIRS = ["css", "js", "assets", "build"]
SKIP_NAMES = {".DS_Store", "__pycache__"}
EXEC_FILES = {"SATrainer.command"}

def add(zf, disk_path, arc_path):
    exec_bit = os.path.basename(disk_path) in EXEC_FILES
    zi = zipfile.ZipInfo(arc_path)
    with open(disk_path, "rb") as f:
        data = f.read()
    zi.compress_type = zipfile.ZIP_DEFLATED
    perm = 0o755 if exec_bit else 0o644
    zi.external_attr = (perm & 0xFFFF) << 16
    zf.writestr(zi, data)

def main():
    n = 0
    if os.path.exists(OUT):
        os.remove(OUT)
    with zipfile.ZipFile(OUT, "w", zipfile.ZIP_DEFLATED) as zf:
        for fn in TOP_FILES:
            if os.path.exists(fn):
                add(zf, fn, f"SATrainer/{fn}"); n += 1
        for d in DIRS:
            for root, dirs, files in os.walk(d):
                dirs[:] = [x for x in dirs if x not in SKIP_NAMES]
                for fn in files:
                    if fn in SKIP_NAMES:
                        continue
                    p = os.path.join(root, fn)
                    arc = "SATrainer/" + os.path.relpath(p).replace("\\", "/")
                    add(zf, p, arc); n += 1
    size = os.path.getsize(OUT)
    print(f"wrote {OUT}: {n} files, {size/1_048_576:.1f} MB")

if __name__ == "__main__":
    main()
