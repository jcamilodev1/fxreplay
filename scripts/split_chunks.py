"""
Splits each {symbol}_{tf}.json into chunks of CHUNK_SIZE candles.
Produces:
  - {symbol}_{tf}_meta.json       → { totalCandles, chunkSize, totalChunks }
  - {symbol}_{tf}_{chunkIdx}.json → array of candle objects (0 = oldest, N = newest)
"""

import json
import os
import sys

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "public", "data")
CHUNK_SIZE = 5000


def split_file(filepath):
    basename = os.path.splitext(os.path.basename(filepath))[0]

    with open(filepath, "r") as f:
        data = json.load(f)

    total = len(data)
    total_chunks = (total + CHUNK_SIZE - 1) // CHUNK_SIZE

    print(f"  {basename}: {total} candles -> {total_chunks} chunks")

    meta = {
        "totalCandles": total,
        "chunkSize": CHUNK_SIZE,
        "totalChunks": total_chunks,
    }
    meta_path = os.path.join(DATA_DIR, f"{basename}_meta.json")
    with open(meta_path, "w") as f:
        json.dump(meta, f, separators=(",", ":"))

    for i in range(total_chunks):
        start = i * CHUNK_SIZE
        end = min(start + CHUNK_SIZE, total)
        chunk = data[start:end]

        chunk_path = os.path.join(DATA_DIR, f"{basename}_{i}.json")
        with open(chunk_path, "w") as f:
            json.dump(chunk, f, separators=(",", ":"))

    os.remove(filepath)
    print(f"    Removed original {os.path.basename(filepath)}")


def main():
    source_files = []
    for fname in sorted(os.listdir(DATA_DIR)):
        if not fname.endswith(".json"):
            continue
        if "_meta" in fname:
            continue
        parts = fname.replace(".json", "").split("_")
        if len(parts) == 2:
            source_files.append(os.path.join(DATA_DIR, fname))

    if not source_files:
        print("No source files found to split. Already chunked?")
        return

    print(f"Found {len(source_files)} files to split (chunk size: {CHUNK_SIZE}):\n")
    for fp in source_files:
        split_file(fp)

    chunk_files = [f for f in os.listdir(DATA_DIR) if f.endswith(".json")]
    meta_count = sum(1 for f in chunk_files if "_meta" in f)
    data_count = len(chunk_files) - meta_count
    print(f"\nDone! {meta_count} meta files + {data_count} chunk files.")


if __name__ == "__main__":
    main()
