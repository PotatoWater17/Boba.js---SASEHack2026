"""Dump prisma/demo.db INSERT statements for Cloudflare D1."""
from __future__ import annotations

import sqlite3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DB = ROOT / "prisma" / "demo.db"
OUT = ROOT / "migrations" / "0002_demo_data.sql"

SKIP = {"sqlite_sequence", "_prisma_migrations"}


def main() -> None:
    con = sqlite3.connect(DB)
    lines = ["PRAGMA foreign_keys=OFF;", "BEGIN TRANSACTION;"]
    for statement in con.iterdump():
        if not statement.startswith("INSERT"):
            continue
        if any(f"INSERT INTO \"{name}\"" in statement or f"INSERT INTO {name} " in statement for name in SKIP):
            continue
        lines.append(statement)
    lines.append("COMMIT;")
    lines.append("PRAGMA foreign_keys=ON;")
    OUT.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"wrote {OUT} ({len(lines)} statements, {OUT.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
