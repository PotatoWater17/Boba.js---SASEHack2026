"""Print row counts and write batched INSERT SQL files for D1."""
from __future__ import annotations

import sqlite3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DB = ROOT / "prisma" / "demo.db"
OUT_DIR = ROOT / "migrations" / "d1-batches"
SKIP = {"sqlite_sequence", "_prisma_migrations"}
BATCH = 25

ORDER = [
    "User",
    "Block",
    "PasswordResetRequest",
    "Meeting",
    "MeetingJoinRequest",
    "Member",
    "Friendship",
    "MeetupInvite",
    "Message",
    "DirectMessage",
    "DmReaction",
    "MessageReaction",
    "ReactionNotice",
]


def quote_ident(name: str) -> str:
    return '"' + name.replace('"', '""') + '"'


def sql_literal(value) -> str:
    if value is None:
        return "NULL"
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        return str(value)
    if isinstance(value, bytes):
        return "X'" + value.hex() + "'"
    text = str(value).replace("'", "''")
    return "'" + text + "'"


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for old in OUT_DIR.glob("*.sql"):
        old.unlink()
    con = sqlite3.connect(DB)
    con.row_factory = sqlite3.Row
    tables = [
        r[0]
        for r in con.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
        )
    ]
    known = [t for t in ORDER if t in tables]
    extra = [t for t in tables if t not in known and t not in SKIP]
    sequence = known + extra
    file_index = 0
    for table in sequence:
        rows = list(con.execute(f"SELECT * FROM {quote_ident(table)}"))
        print(f"{table}\t{len(rows)}")
        if not rows:
            continue
        cols = rows[0].keys()
        col_sql = ", ".join(quote_ident(c) for c in cols)
        for i in range(0, len(rows), BATCH):
            chunk = rows[i : i + BATCH]
            values = []
            for row in chunk:
                values.append("(" + ", ".join(sql_literal(row[c]) for c in cols) + ")")
            file_index += 1
            sql = f"INSERT INTO {quote_ident(table)} ({col_sql}) VALUES\n" + ",\n".join(values) + ";"
            (OUT_DIR / f"{file_index:03d}_{table}.sql").write_text(sql, encoding="utf-8")
    print(f"files {file_index}")


if __name__ == "__main__":
    main()
