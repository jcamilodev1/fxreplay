import MetaTrader5 as mt5
import pandas as pd
import json
import os
import sys
from datetime import datetime, timedelta, timezone

OUTPUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "public", "data")

SYMBOLS = ["EURUSD", "USDJPY", "US100"]

SYMBOL_ALIASES = {
    "US100": ["US100", "NAS100", "USTEC", "US100.cash", "NAS100m", "USTEC.cash", "US 100", "#NAS100"],
    "EURUSD": ["EURUSD", "EURUSDm", "EURUSD.cash"],
    "USDJPY": ["USDJPY", "USDJPYm", "USDJPY.cash"],
}

TIMEFRAMES = {
    "M1":  mt5.TIMEFRAME_M1,
    "M5":  mt5.TIMEFRAME_M5,
    "M15": mt5.TIMEFRAME_M15,
    "M30": mt5.TIMEFRAME_M30,
    "H1":  mt5.TIMEFRAME_H1,
    "H4":  mt5.TIMEFRAME_H4,
    "D1":  mt5.TIMEFRAME_D1,
    "W1":  mt5.TIMEFRAME_W1,
}

YEARS_BACK = {
    "M1":  2,
    "M5":  3,
    "M15": 5,
    "M30": 6,
    "H1":  10,
    "H4":  15,
    "D1":  20,
    "W1":  25,
}

CHUNK_DAYS = {
    "M1":  30,
    "M5":  90,
    "M15": 180,
    "M30": 365,
    "H1":  365,
    "H4":  365 * 2,
    "D1":  365 * 5,
    "W1":  365 * 10,
}


def resolve_symbol(base_symbol):
    aliases = SYMBOL_ALIASES.get(base_symbol, [base_symbol])
    for alias in aliases:
        info = mt5.symbol_info(alias)
        if info is not None:
            if not info.visible:
                mt5.symbol_select(alias, True)
            print(f"  -> Resolved '{base_symbol}' to broker symbol '{alias}'")
            return alias

    all_symbols = mt5.symbols_get()
    if all_symbols:
        for s in all_symbols:
            if base_symbol.lower().replace(" ", "") in s.name.lower().replace(" ", ""):
                mt5.symbol_select(s.name, True)
                print(f"  -> Fuzzy-matched '{base_symbol}' to '{s.name}'")
                return s.name
    return None


def download_in_chunks(broker_symbol, tf_value, years, chunk_days):
    """Download data in date-range chunks to bypass MT5 bar limits."""
    now = datetime.now(timezone.utc)
    earliest = now - timedelta(days=years * 365)
    all_data = []

    cursor = earliest
    while cursor < now:
        chunk_end = min(cursor + timedelta(days=chunk_days), now)
        rates = mt5.copy_rates_range(broker_symbol, tf_value, cursor, chunk_end)

        if rates is not None and len(rates) > 0:
            all_data.append(pd.DataFrame(rates))

        cursor = chunk_end

    if not all_data:
        return None

    df = pd.concat(all_data, ignore_index=True)
    df.drop_duplicates(subset=["time"], keep="last", inplace=True)
    df.sort_values("time", inplace=True, ignore_index=True)
    return df


def download_symbol(base_symbol, only_tf=None):
    broker_symbol = resolve_symbol(base_symbol)
    if broker_symbol is None:
        print(f"  [SKIP] Symbol '{base_symbol}' not available in this broker.")
        return

    decimals = 5
    if "JPY" in base_symbol:
        decimals = 3
    elif "100" in base_symbol:
        decimals = 2

    for tf_name, tf_value in TIMEFRAMES.items():
        if only_tf and tf_name not in only_tf:
            continue

        years = YEARS_BACK[tf_name]
        chunk_days = CHUNK_DAYS[tf_name]

        print(f"  {broker_symbol} {tf_name} ({years}y back, {chunk_days}d chunks)...", end=" ", flush=True)

        df = download_in_chunks(broker_symbol, tf_value, years, chunk_days)

        if df is None or len(df) == 0:
            print(f"FAILED - {mt5.last_error()}")
            continue

        df["time"] = df["time"].astype(int)
        df = df[["time", "open", "high", "low", "close", "tick_volume"]].copy()
        df.rename(columns={"tick_volume": "volume"}, inplace=True)

        for col in ["open", "high", "low", "close"]:
            df[col] = df[col].round(decimals)

        records = df.to_dict(orient="records")

        safe_name = base_symbol.replace(" ", "_").replace("#", "").lower()
        filename = f"{safe_name}_{tf_name.lower()}.json"
        filepath = os.path.join(OUTPUT_DIR, filename)

        with open(filepath, "w") as f:
            json.dump(records, f, separators=(",", ":"))

        size_mb = os.path.getsize(filepath) / (1024 * 1024)
        first_dt = datetime.fromtimestamp(records[0]["time"], tz=timezone.utc)
        last_dt = datetime.fromtimestamp(records[-1]["time"], tz=timezone.utc)
        first_date = first_dt.strftime("%Y-%m-%d")
        last_date = last_dt.strftime("%Y-%m-%d")
        print(f"OK - {len(records):,} candles ({size_mb:.1f} MB) [{first_date} -> {last_date}]")


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    only_tf = None
    if len(sys.argv) > 1:
        only_tf = [tf.upper() for tf in sys.argv[1:]]
        print(f"Filtering timeframes: {only_tf}")

    print("Initializing MetaTrader 5...")
    if not mt5.initialize():
        print(f"MT5 initialization failed: {mt5.last_error()}")
        print("Make sure MetaTrader 5 is installed and running.")
        sys.exit(1)

    info = mt5.terminal_info()
    account = mt5.account_info()
    print(f"Connected to: {info.company}")
    print(f"Account: {account.login} ({account.name})")
    print(f"Server: {account.server}")
    print("-" * 60)

    for symbol in SYMBOLS:
        print(f"\n[{symbol}]")
        download_symbol(symbol, only_tf)

    mt5.shutdown()
    print("\n" + "=" * 60)
    print("Download complete!")

    files = os.listdir(OUTPUT_DIR)
    source_files = [f for f in files if f.endswith(".json") and "_meta" not in f and len(f.replace(".json", "").split("_")) == 2]
    print(f"\nSource files ready to split: {len(source_files)}")
    for f in sorted(source_files):
        size = os.path.getsize(os.path.join(OUTPUT_DIR, f)) / (1024 * 1024)
        print(f"  {f} ({size:.1f} MB)")

    print(f"\nNext step: python scripts/split_chunks.py")


if __name__ == "__main__":
    main()
