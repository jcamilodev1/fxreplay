"""
Download historical market data from Dukascopy (free, no account needed).
Supports forex, metals and indices with M1 data going back many years.
Downloads month by month to avoid API limits, then saves as single JSON per symbol/tf.
"""
import json
import os
import sys
import time
from datetime import datetime, timezone

import pandas as pd
from dukascopy_python import fetch, OFFER_SIDE_BID
from dukascopy_python import (
    INTERVAL_MIN_1, INTERVAL_MIN_5, INTERVAL_MIN_15, INTERVAL_MIN_30,
    INTERVAL_HOUR_1, INTERVAL_HOUR_4, INTERVAL_DAY_1, INTERVAL_WEEK_1,
)

OUTPUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "public", "data")

SYMBOLS = {
    "eurusd": {"duka": "EUR/USD", "decimals": 5},
    "usdjpy": {"duka": "USD/JPY", "decimals": 3},
    # Dukascopy NASDAQ-100 future-like instrument used as US100 proxy.
    "us100": {"duka": "E_NQ-100", "decimals": 2},
    "xauusd": {"duka": "XAU/USD", "decimals": 2},
}

SYMBOL_ALIASES = {
    "nasdaq": "us100",
    "nas100": "us100",
    "nasdaq100": "us100",
    "nq100": "us100",
    "ustec": "us100",
    "gold": "xauusd",
    "xau": "xauusd",
}

TIMEFRAMES = {
    "M1":  INTERVAL_MIN_1,
    "M5":  INTERVAL_MIN_5,
    "M15": INTERVAL_MIN_15,
    "M30": INTERVAL_MIN_30,
    "H1":  INTERVAL_HOUR_1,
    "H4":  INTERVAL_HOUR_4,
    "D1":  INTERVAL_DAY_1,
    "W1":  INTERVAL_WEEK_1,
}

YEARS_BACK = {
    "M1":  6,
    "M5":  6,
    "M15": 8,
    "M30": 10,
    "H1":  15,
    "H4":  20,
    "D1":  25,
    "W1":  25,
}


def month_ranges(start_year, start_month, end_dt):
    """Generate (start, end) datetime pairs for each month."""
    y, m = start_year, start_month
    while True:
        s = datetime(y, m, 1)
        nm = m + 1
        ny = y
        if nm > 12:
            nm = 1
            ny = y + 1
        e = datetime(ny, nm, 1)
        if s >= end_dt:
            break
        yield s, min(e, end_dt)
        y, m = ny, nm


def download_symbol_tf(duka_name, symbol_key, tf_name, tf_interval, years, decimals):
    now = datetime.now()
    start = datetime(now.year - years, now.month, 1)

    print(f"\n  {symbol_key.upper()} {tf_name} ({years}y back)", flush=True)

    all_dfs = []
    months = list(month_ranges(start.year, start.month, now))
    total = len(months)

    for idx, (ms, me) in enumerate(months):
        label = ms.strftime("%Y-%m")
        pct = ((idx + 1) / total * 100)
        print(f"\r    [{idx+1}/{total}] {label} ({pct:.0f}%)", end="", flush=True)

        for attempt in range(3):
            try:
                df = fetch(duka_name, tf_interval, OFFER_SIDE_BID, start=ms, end=me, debug=False)
                if df is not None and len(df) > 0:
                    all_dfs.append(df)
                break
            except Exception as ex:
                if attempt < 2:
                    time.sleep(2)
                else:
                    print(f" [WARN: {label} failed: {ex}]", end="")

    print()

    if not all_dfs:
        print(f"    NO DATA for {symbol_key} {tf_name}")
        return 0

    merged = pd.concat(all_dfs)
    merged = merged.reset_index()

    if "timestamp" in merged.columns:
        merged["time"] = merged["timestamp"].apply(lambda t: int(t.timestamp()))
    elif "date" in merged.columns:
        merged["time"] = merged["date"].apply(lambda t: int(t.timestamp()))
    else:
        merged["time"] = merged.iloc[:, 0].apply(lambda t: int(t.timestamp()) if hasattr(t, "timestamp") else int(t))

    merged = merged[["time", "open", "high", "low", "close", "volume"]].copy()

    for col in ["open", "high", "low", "close"]:
        merged[col] = merged[col].round(decimals)

    merged["volume"] = merged["volume"].round(2)
    merged.drop_duplicates(subset=["time"], keep="last", inplace=True)
    merged.sort_values("time", inplace=True, ignore_index=True)

    records = merged.to_dict(orient="records")

    filename = f"{symbol_key}_{tf_name.lower()}.json"
    filepath = os.path.join(OUTPUT_DIR, filename)

    with open(filepath, "w") as f:
        json.dump(records, f, separators=(",", ":"))

    size_mb = os.path.getsize(filepath) / (1024 * 1024)
    first_date = datetime.fromtimestamp(records[0]["time"], tz=timezone.utc).strftime("%Y-%m-%d")
    last_date = datetime.fromtimestamp(records[-1]["time"], tz=timezone.utc).strftime("%Y-%m-%d")
    print(f"    OK - {len(records):,} candles ({size_mb:.1f} MB) [{first_date} -> {last_date}]")
    return len(records)


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    only_tf = None
    only_sym = None
    for arg in sys.argv[1:]:
        upper = arg.upper()
        if upper in TIMEFRAMES:
            if only_tf is None:
                only_tf = []
            only_tf.append(upper)
        else:
            arg_key = arg.lower()
            if arg_key in SYMBOL_ALIASES:
                arg_key = SYMBOL_ALIASES[arg_key]

            if arg_key not in SYMBOLS:
                continue

            if only_sym is None:
                only_sym = []
            if arg_key not in only_sym:
                only_sym.append(arg_key)

    if only_tf:
        print(f"Timeframes: {only_tf}")
    if only_sym:
        print(f"Symbols: {only_sym}")

    print("Downloading from Dukascopy (free, no account needed)...")
    print("=" * 60)

    total_candles = 0
    for sym_key, sym_info in SYMBOLS.items():
        if only_sym and sym_key not in only_sym:
            continue
        print(f"\n[{sym_key.upper()}]")
        for tf_name, tf_interval in TIMEFRAMES.items():
            if only_tf and tf_name not in only_tf:
                continue
            years = YEARS_BACK[tf_name]
            n = download_symbol_tf(sym_info["duka"], sym_key, tf_name, tf_interval, years, sym_info["decimals"])
            total_candles += n

    print("\n" + "=" * 60)
    print(f"Download complete! Total candles: {total_candles:,}")

    source_files = sorted([
        f for f in os.listdir(OUTPUT_DIR)
        if f.endswith(".json") and "_meta" not in f and len(f.replace(".json", "").split("_")) == 2
    ])
    for f in source_files:
        size = os.path.getsize(os.path.join(OUTPUT_DIR, f)) / (1024 * 1024)
        print(f"  {f} ({size:.1f} MB)")

    print(f"\nNext step: python scripts/split_chunks.py")


if __name__ == "__main__":
    main()
