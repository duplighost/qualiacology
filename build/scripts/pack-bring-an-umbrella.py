#!/usr/bin/env python3
"""Make BRING AN UMBRELLA's two download files from the copy the game's own project makes for the website.

A file on a GitHub release must be under 2 GiB. The game's packed data file is 1.87 GiB by itself and its songs are
another 0.4, so the download cannot be one zip. It is two, and they unpack into one folder:

  BRING-AN-UMBRELLA-windows-1-of-2.zip   the game: everything but the songs and the file you start it with
  BRING-AN-UMBRELLA-windows-2-of-2.zip   the songs (Still\\Content\\Still\\Songs) and Still.exe

Still.exe is in the second on purpose. A game unpacked without its songs runs silent, and in this game the music is
the point; with Still.exe in the second part there is nothing to start until both parts are in one folder. Each part
carries a two-line note saying so, for whoever unpacks only one.

Nothing in the game is changed, and nothing is written to the game's project: this only reads
C:\\Projects\\Still\\Release\\Website\\BRING AN UMBRELLA (made there by Tools\\make_website_copy.py, and only from a
package that has played the whole night both ways) and writes the two zips to C:\\Scratch\\bring-an-umbrella-site.

  py -3 build/scripts/pack-bring-an-umbrella.py [source folder] [output folder]

Then: gh release create bring-an-umbrella-v<N> <the two zips> ..., and point the two lines in _redirects at the new tag.
"""
import hashlib
import os
import sys
import zipfile

NAME = "BRING AN UMBRELLA"
SOURCE = sys.argv[1] if len(sys.argv) > 1 else os.path.join("C:" + os.sep, "Projects", "Still", "Release", "Website", NAME)
OUT = sys.argv[2] if len(sys.argv) > 2 else os.path.join("C:" + os.sep, "Scratch", "bring-an-umbrella-site")
LIMIT = 2 * 1024 ** 3 - 4 * 1024 ** 2  # GitHub's 2 GiB, less a little
PACKED = (".ucas", ".pak", ".utoc", ".bk2", ".mp4", ".ogg")  # already packed tight: stored as they are
SONGS = "Still/Content/Still/Songs/"

NOTES = {
    1: (
        "This is part 1 of 2 - read me.txt",
        "BRING AN UMBRELLA comes as two downloads, and this is the first.\r\n"
        "Unpack the second into this same folder (so that Still.exe lands here, beside this note), then open Still.exe.\r\n"
        "Both are at https://qualiacology.com/bring-an-umbrella/\r\n",
    ),
    2: (
        "This is part 2 of 2 - read me.txt",
        "BRING AN UMBRELLA comes as two downloads, and this is the second.\r\n"
        "Unpack the first into this same folder (so that the Engine folder lands here, beside this note), then open Still.exe.\r\n"
        "Both are at https://qualiacology.com/bring-an-umbrella/\r\n",
    ),
}


def part_of(rel):
    """Which download a file goes in."""
    return 2 if rel == "Still.exe" or rel.startswith(SONGS) else 1


def main():
    if not os.path.isfile(os.path.join(SOURCE, "Still.exe")):
        raise SystemExit("No game at " + SOURCE)
    files = []
    for folder, _, names in os.walk(SOURCE):
        for name in names:
            full = os.path.join(folder, name)
            files.append((os.path.relpath(full, SOURCE).replace(os.sep, "/"), full))
    files.sort()
    os.makedirs(OUT, exist_ok=True)
    made = []
    for part in (1, 2):
        path = os.path.join(OUT, "BRING-AN-UMBRELLA-windows-%d-of-2.zip" % part)
        if os.path.exists(path):
            os.remove(path)
        count = 0
        with zipfile.ZipFile(path, "w", allowZip64=True) as z:
            note_name, note_text = NOTES[part]
            z.writestr(zipfile.ZipInfo(NAME + "/" + note_name, date_time=(2026, 11, 28, 12, 0, 0)), note_text, compress_type=zipfile.ZIP_DEFLATED)
            for rel, full in files:
                if part_of(rel) != part:
                    continue
                stored = rel.lower().endswith(PACKED)
                z.write(full, NAME + "/" + rel, compress_type=zipfile.ZIP_STORED if stored else zipfile.ZIP_DEFLATED, compresslevel=None if stored else 9)
                count += 1
        size = os.path.getsize(path)
        if size >= LIMIT:
            raise SystemExit("%s is %d bytes: over what one release file may be. Move something else into the other part (part_of)." % (path, size))
        digest = hashlib.sha256()
        with open(path, "rb") as f:
            for block in iter(lambda: f.read(8 * 1024 * 1024), b""):
                digest.update(block)
        made.append((path, count, size, digest.hexdigest()))
    for path, count, size, sha in made:
        print("%s\n  %d files, %d bytes (%.2f GiB, %.0f MB), sha256 %s" % (path, count, size, size / 1024 ** 3, size / 1e6, sha))
    print("%d files in the game; %d in the two parts." % (len(files), sum(m[1] for m in made)))


if __name__ == "__main__":
    main()
