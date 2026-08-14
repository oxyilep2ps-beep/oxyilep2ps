#!/usr/bin/env python3
"""
Oxyile DATASETS → Excel conversion pipeline.
Scans DATASETS/*.json, flattens nested structures, writes DATASETS_EXCEL/*.xlsx
and generates DATASETS/dataset_manifest.json for the Admin dashboard.
"""

from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

try:
    import pandas as pd
except ImportError:
    print("Install dependencies: pip install pandas openpyxl", file=sys.stderr)
    sys.exit(1)

ROOT = Path(__file__).resolve().parent.parent
INPUT_DIR = ROOT / "DATASETS"
OUTPUT_DIR = ROOT / "DATASETS_EXCEL"
MANIFEST_PATH = INPUT_DIR / "dataset_manifest.json"
EXCEL_ROW_CAP = 1_000_000  # Excel hard limit 1,048,576 — cap with warning


def flatten_value(value: Any, parent_key: str = "", sep: str = ".") -> dict[str, Any]:
    """Recursively flatten nested dicts/lists into dot-notation keys."""
    items: dict[str, Any] = {}

    if isinstance(value, dict):
        for k, v in value.items():
            key = f"{parent_key}{sep}{k}" if parent_key else str(k)
            items.update(flatten_value(v, key, sep))
    elif isinstance(value, list):
        if not value:
            items[parent_key or "items"] = None
        elif all(isinstance(x, (str, int, float, bool)) or x is None for x in value):
            items[parent_key or "items"] = json.dumps(value)
        else:
            for i, v in enumerate(value):
                key = f"{parent_key}{sep}{i}" if parent_key else str(i)
                items.update(flatten_value(v, key, sep))
    else:
        items[parent_key or "value"] = value

    return items


def flatten_records(data: Any) -> list[dict[str, Any]]:
    if data is None:
        return []
    if isinstance(data, list):
        if not data:
            return []
        if all(isinstance(row, dict) for row in data):
            return [flatten_value(row) for row in data]
        return [{"value": json.dumps(data)}]
    if isinstance(data, dict):
        return [flatten_value(data)]
    return [{"value": data}]


def load_json(path: Path) -> Any:
    text = path.read_text(encoding="utf-8-sig").strip()
    if not text:
        return []
    return json.loads(text)


def convert_file(path: Path) -> dict[str, Any]:
    slug = path.stem
    try:
        raw = load_json(path)
        rows = flatten_records(raw)
        row_count = len(rows)

        meta: dict[str, Any] = {
            "slug": slug,
            "source_file": path.name,
            "row_count": row_count,
            "file_size_bytes": path.stat().st_size,
            "converted_at": datetime.now(timezone.utc).isoformat(),
            "excel_file": None,
            "excel_rows_written": 0,
            "truncated": False,
            "error": None,
        }

        if row_count == 0:
            meta["status"] = "discarded"
            return meta

        df = pd.DataFrame(rows)
        if row_count > EXCEL_ROW_CAP:
            df = df.head(EXCEL_ROW_CAP)
            meta["truncated"] = True
            meta["excel_rows_written"] = EXCEL_ROW_CAP
        else:
            meta["excel_rows_written"] = row_count

        OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
        out_path = OUTPUT_DIR / f"{slug}.xlsx"
        try:
            df.to_excel(out_path, index=False, engine="openpyxl")
        except ImportError:
            df.to_excel(out_path, index=False)
        meta["excel_file"] = out_path.name
        meta["status"] = "converted"
        return meta

    except Exception as exc:  # noqa: BLE001
        return {
            "slug": slug,
            "source_file": path.name,
            "row_count": locals().get("row_count", 0),
            "file_size_bytes": path.stat().st_size if path.exists() else 0,
            "converted_at": datetime.now(timezone.utc).isoformat(),
            "excel_file": locals().get("out_path", Path()).name if isinstance(locals().get("out_path"), Path) else None,
            "excel_rows_written": locals().get("meta", {}).get("excel_rows_written", 0),
            "truncated": locals().get("meta", {}).get("truncated", False),
            "error": str(exc),
            "status": "error",
        }


def main() -> None:
    if not INPUT_DIR.is_dir():
        print(f"Missing input directory: {INPUT_DIR}", file=sys.stderr)
        sys.exit(1)

    json_files = sorted(INPUT_DIR.glob("*.json"))
    json_files = [p for p in json_files if p.name != "dataset_manifest.json"]

    results = [convert_file(p) for p in json_files]

    manifest = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "input_dir": str(INPUT_DIR.relative_to(ROOT)),
        "output_dir": str(OUTPUT_DIR.relative_to(ROOT)),
        "datasets": results,
    }

    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2), encoding="utf-8")

    converted = sum(1 for r in results if r.get("status") == "converted")
    empty = sum(1 for r in results if r.get("status") == "discarded")
    errors = sum(1 for r in results if r.get("status") == "error")

    print(f"Processed {len(results)} JSON files -> {converted} Excel, {empty} empty, {errors} errors")
    print(f"Manifest: {MANIFEST_PATH.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
