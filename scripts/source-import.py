"""Read-only local source inventory and page extraction; never uploads documents.

Install tools locally:
  python -m pip install --target .local/source-tools -r scripts/source-requirements.txt
Inventory:
  python scripts/source-import.py inventory --root "C:/Users/.../Desktop/book med"
Extract a source for editorial work (private output only):
  python scripts/source-import.py extract SOURCE_ID --pages 12-20,45
PDF page numbers are one-based file positions, not printed pagination.
"""
from __future__ import annotations

import argparse
from datetime import date
import hashlib
import io
import json
import logging
from pathlib import Path
import re
import sys
import warnings

WORKSPACE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(WORKSPACE / ".local" / "source-tools"))
PRIVATE = WORKSPACE / ".local" / "sources"
PUBLIC = WORKSPACE / "src" / "data" / "source-catalog.json"
DOCUMENTS = {".pdf", ".chm", ".pdb", ".djvu", ".doc", ".docx", ".avi", ".iso", ".csv", ".xlsx"}
logging.getLogger("pypdf").setLevel(logging.ERROR)
warnings.filterwarnings("ignore", module="pypdf")


def write_json(path: Path, value: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def digest_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        while chunk := stream.read(1024 * 1024):
            digest.update(chunk)
    return digest.hexdigest()


def clean_title(name: str) -> str:
    title = Path(name).stem
    title = re.sub(r"\[(?:PDF|StormRG|SRG|ILLUSTRATED)\]|[._]+|\b(?:3HAXAP|eBook-DDU|eBook-YYePG|TLFeBOOK|RUPOM)\b", " ", title, flags=re.I)
    return re.sub(r"\s+", " ", title).strip(" -")


def pdf_info(stream: object) -> dict:
    from pypdf import PdfReader
    try:
        reader = PdfReader(stream, strict=False)
        if reader.is_encrypted and reader.decrypt("") == 0:
            return {"inspection": "encrypted", "pages": None}
        pages = len(reader.pages)
        readable = sum(bool((reader.pages[i].extract_text() or "").strip()) for i in range(min(pages, 3)))
        return {"inspection": "text-detected" if readable else "sample-no-text", "pages": pages}
    except Exception as error:
        return {"inspection": "unreadable", "pages": None, "inspectionError": type(error).__name__}


def iso_records(path: Path):
    import pycdlib
    image = pycdlib.PyCdlib()
    try:
        image.open(str(path))
        namespace = "joliet_path" if image.has_joliet() else "rr_path" if image.has_rock_ridge() else "iso_path"
        for directory, _dirs, names in image.walk(**{namespace: "/"}):
            for name in sorted(names):
                internal = directory.rstrip("/") + "/" + name
                record = image.get_record(**{namespace: internal})
                yield image, namespace, internal, record.data_length
    finally:
        image.close()


def inventory(root: Path) -> None:
    root = root.resolve(strict=True)
    files = sorted((p for p in root.rglob("*") if p.is_file()), key=lambda p: str(p).casefold())
    records: dict[str, dict] = {}
    private: dict[str, dict] = {}
    format_counts: dict[str, int] = {}
    archive_files = 0

    def add(name: str, group: str, size: int, locator: dict, fingerprint: str, info: dict | None = None):
        suffix = Path(name).suffix.lower()
        if suffix not in DOCUMENTS:
            return
        identifier = "src-" + fingerprint[:16]
        if identifier in records:
            records[identifier]["copies"] += 1
            private[identifier]["copies"].append(locator)
            return
        record = {
            "id": identifier,
            "title": clean_title(name),
            "collection": group,
            "format": suffix[1:],
            "bytes": size,
            "copies": 1,
            "pages": None,
            "inspection": "not-extracted",
            "rights": "unconfirmed",
            "review": "pending",
            **(info or {}),
        }
        excerpt = PRIVATE / f"{identifier}.json"
        if excerpt.exists():
            previous = json.loads(excerpt.read_text(encoding="utf-8"))
            record["inspection"] = "text-extracted" if any(page["text"].strip() for page in previous["pages"]) else "sample-no-text"
            record["extractedPageCount"] = len(previous["pages"])
        records[identifier] = record
        private[identifier] = {"primary": locator, "copies": [locator], "fingerprint": fingerprint}

    for index, path in enumerate(files):
        suffix = path.suffix.lower()
        format_counts[suffix[1:] or "none"] = format_counts.get(suffix[1:] or "none", 0) + 1
        relative = path.relative_to(root)
        group = relative.parts[0] if len(relative.parts) > 1 else "Archives"
        if suffix not in DOCUMENTS:
            continue
        # Hash PDFs for real duplicate detection; video/ISO IDs use stable relative names.
        fingerprint = digest_file(path) if suffix == ".pdf" else hashlib.sha256(str(relative).replace("\\", "/").encode()).hexdigest()
        existing = "src-" + fingerprint[:16] in records
        info = pdf_info(path) if suffix == ".pdf" and not existing else None
        add(path.name, group, path.stat().st_size, {"path": str(path)}, fingerprint, info)
        if suffix == ".iso":
            try:
                for _image, namespace, internal, size in iso_records(path):
                    archive_files += 1
                    archive_fingerprint = hashlib.sha256((str(relative).replace("\\", "/") + "::" + internal).encode()).hexdigest()
                    add(internal, path.stem, size, {"path": str(path), "member": internal, "namespace": namespace}, archive_fingerprint)
            except Exception as error:
                records["src-" + fingerprint[:16]]["inspection"] = "archive-unreadable"
                records["src-" + fingerprint[:16]]["inspectionError"] = type(error).__name__
        if index % 25 == 0:
            print(f"Inspected {index + 1}/{len(files)} local files", flush=True)
    catalog = {
        "schema": 1,
        "generatedOn": date.today().isoformat(),
        "inventory": {"localFiles": len(files), "bytes": sum(p.stat().st_size for p in files), "formats": format_counts, "archiveMembers": archive_files},
        "sources": sorted(records.values(), key=lambda record: (record["collection"], record["title"]))
    }
    write_json(PUBLIC, catalog)
    write_json(PRIVATE / "locations.json", private)
    print(json.dumps({"uniqueResources": len(records), "localFiles": len(files), "archiveMembers": archive_files}, ensure_ascii=False))


def open_source(identifier: str):
    locations = json.loads((PRIVATE / "locations.json").read_text(encoding="utf-8"))
    locator = locations[identifier]["primary"]
    if "member" not in locator:
        return Path(locator["path"])
    import pycdlib
    image = pycdlib.PyCdlib()
    image.open(locator["path"])
    try:
        content = io.BytesIO()
        image.get_file_from_iso_fp(content, **{locator["namespace"]: locator["member"]})
        content.seek(0)
        return content
    finally:
        image.close()


def extract(identifier: str, selection: str) -> None:
    from pypdf import PdfReader
    catalog = json.loads(PUBLIC.read_text(encoding="utf-8"))
    source = next(record for record in catalog["sources"] if record["id"] == identifier)
    if source["format"] != "pdf":
        raise SystemExit("Only PDFs can be extracted. Legacy/video formats require a separate reader/transcription.")
    reader = PdfReader(open_source(identifier), strict=False)
    if reader.is_encrypted and reader.decrypt("") == 0:
        raise SystemExit("Encrypted document: no password guessing or DRM bypass is performed.")
    chosen = list(range(1, len(reader.pages) + 1)) if selection == "all" else []
    if selection != "all":
        for part in selection.split(","):
            ends = [int(number) for number in part.split("-")]
            chosen.extend(range(ends[0], ends[-1] + 1))
    results = []
    for number in sorted(set(chosen)):
        if number < 1 or number > len(reader.pages):
            raise SystemExit(f"Page {number} outside 1..{len(reader.pages)}")
        page = reader.pages[number - 1]
        results.append({"pdfPage": number, "printedLabel": reader.page_labels[number - 1], "text": page.extract_text() or ""})
    output = PRIVATE / f"{identifier}.json"
    previous = json.loads(output.read_text(encoding="utf-8"))["pages"] if output.exists() else []
    merged = {page["pdfPage"]: page for page in previous + results}
    pages = sorted(merged.values(), key=lambda page: page["pdfPage"])
    write_json(output, {"id": identifier, "title": source["title"], "pages": pages})
    source["pages"] = len(reader.pages)
    source["inspection"] = "text-extracted" if any(page["text"].strip() for page in pages) else "sample-no-text"
    source["extractedPageCount"] = len(pages)
    write_json(PUBLIC, catalog)
    print(json.dumps({"source": identifier, "pages": len(results), "pagesWithText": sum(bool(page["text"].strip()) for page in results)}))


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    index = commands.add_parser("inventory")
    index.add_argument("--root", type=Path, required=True)
    content = commands.add_parser("extract")
    content.add_argument("source")
    content.add_argument("--pages", default="1-10")
    args = parser.parse_args()
    inventory(args.root) if args.command == "inventory" else extract(args.source, args.pages)


if __name__ == "__main__":
    main()
