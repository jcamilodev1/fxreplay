import MetaTrader5 as mt5
import pandas as pd
import json
import os
import sys
from datetime import datetime, timedelta

OUTPUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "public", "data")

SYMBOLS = ["EURUSD", "USDJPY", "US100"]

SYMBOL_ALIASES = {
    "US100": ["US100", "NAS100", "USTEC", "US100.cash", "NAS100m", "USTEC.cash", "US 100", "#NAS100"],
    "EURUSD": ["EURUSD", "EURUSDm", "EURUSD.cash"],
    "USDJPY": ["USDJPY", "USDJPYm", "USDJPY.cash"],
}

TIMEFRAMES = {
    "M5":  mt5.TIMEFRAME_M5,
    "M15": mt5.TIMEFRAME_M15,
    "M30": mt5.TIMEFRAME_M30,
    "H1":  mt5.TIMEFRAME_H1,
    "H4":  mt5.TIMEFRAME_H4,
    "D1":  mt5.TIMEFRAME_D1,
    "W1":  mt5.TIMEFRAME_W1,
}

MAX_BARS = {
    "M5":  500_000,
    "M15": 300_000,
    "M30": 200_000,
    "H1":  100_000,
    "H4":  50_000,
    "D1":  10_000,
    "W1":  5_000,
}

YEARS_BACK = {
    "M5":  2,
    "M15": 3,
    "M30": 4,
    "H1":  5,
    "H4":  8,
    "D1":  15,
    "W1":  20,
}


def resolve_symbol(base_symbol: str) -> str | None:
    """Try symbol aliases until one is found available in the broker."""
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


def download_symbol(base_symbol: str):
    broker_symbol = resolve_symbol(base_symbol)
    if broker_symbol is None:
        print(f"  [SKIP] Symbol '{base_symbol}' not available in this broker.")
        return

    for tf_name, tf_value in TIMEFRAMES.items():
        years = YEARS_BACK[tf_name]
        date_from = datetime.now() - timedelta(days=years * 365)
        date_to = datetime.now()
        max_bars = MAX_BARS[tf_name]

        print(f"  Downloading {broker_symbol} {tf_name} ({years}y, max {max_bars} bars)...", end=" ")

        rates = mt5.copy_rates_range(broker_symbol, tf_value, date_from, date_to)

        if rates is None or len(rates) == 0:
            error = mt5.last_error()
            print(f"FAILED - {error}")
            continue

        df = pd.DataFrame(rates)
        df["time"] = df["time"].astype(int)
        df = df[["time", "open", "high", "low", "close", "tick_volume"]].copy()
        df.rename(columns={"tick_volume": "volume"}, inplace=True)

        for col in ["open", "high", "low", "close"]:
            decimals = 5 if "JPY" not in base_symbol and "100" not in base_symbol else (3 if "JPY" in base_symbol else 2)
            df[col] = df[col].round(decimals)

        records = df.to_dict(orient="records")

        safe_name = base_symbol.replace(" ", "_").replace("#", "").lower()
        filename = f"{safe_name}_{tf_name.lower()}.json"
        filepath = os.path.join(OUTPUT_DIR, filename)

        with open(filepath, "w") as f:
            json.dump(records, f, separators=(",", ":"))

        size_mb = os.path.getsize(filepath) / (1024 * 1024)
        print(f"OK - {len(records)} candles ({size_mb:.1f} MB) -> {filename}")


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

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
    print(f"Balance: {account.balance} {account.currency}")
    print("-" * 60)

    for symbol in SYMBOLS:
        print(f"\n[{symbol}]")
        download_symbol(symbol)

    mt5.shutdown()
    print("\n" + "=" * 60)
    print("Download complete!")

    files = os.listdir(OUTPUT_DIR)
    json_files = [f for f in files if f.endswith(".json")]
    print(f"Total files generated: {len(json_files)}")
    for f in sorted(json_files):
        size = os.path.getsize(os.path.join(OUTPUT_DIR, f)) / (1024 * 1024)
        print(f"  {f} ({size:.1f} MB)")


if __name__ == "__main__":
    main()
