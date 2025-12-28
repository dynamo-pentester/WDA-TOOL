#!/usr/bin/env python3
"""
parse_hmon.py

Recursively scan a directory of HMON archives and raw files,
extract and clean their contents, paginate into CSVs—
ensuring each page has the correct header row (column names).
"""

import os
import tarfile
import logging

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

def save_paginated_csv(lines, out_dir, base_name, chunk_size=500, header=None):
    """
    Paginate data lines into CSV files of size chunk_size.
    Ensure each page starts with the header row.
    """
    os.makedirs(out_dir, exist_ok=True)
    total = len(lines)

    # Ensure header is a clean string without newline
    header_line = header.rstrip("\n") if header else None

    for i in range(0, total, chunk_size):
        chunk = lines[i:i + chunk_size]
        page_num = (i // chunk_size) + 1
        out_name = f"{base_name}_pg{page_num}.csv"
        out_path = os.path.join(out_dir, out_name)

        # Before writing, check if chunk already begins with header_line;
        # if so, drop that line from data to avoid duplicate.
        if header_line and chunk and chunk[0] == header_line:
            chunk = chunk[1:]

        with open(out_path, "w", encoding="utf-8") as f_out:
            # Write header on every page
            if header_line:
                f_out.write(header_line + "\n")
            f_out.write("\n".join(chunk))

        logger.info(f"[✓] Created paginated file {out_name} with {len(chunk)} data lines")


def scan_and_parse_hmon_archives(extract_root, output_base, chunk_size=500):
    """
    Walk extract_root, handle:
      - .tar.gz HMON archives
      - raw hmondata_chassis1/2 files
    Extract, split into header + data, then paginate,
    ensuring each page has the header.
    """
    hmon_output_dir = os.path.join(output_base, "hmon_data")
    os.makedirs(hmon_output_dir, exist_ok=True)
    seen = set()

    for dirpath, _, filenames in os.walk(extract_root):
        for fname in filenames:
            fpath = os.path.join(dirpath, fname)
            rel = os.path.relpath(dirpath, extract_root).replace("\\", "/")
            if rel.startswith("flash"):
                prefix = "flash"
            elif "mnt" in rel:
                parts = rel.split("/")
                chassis = next((p for p in parts if p.startswith("chassis")), None)
                prefix = f"mnt_{chassis}" if chassis else "mnt_unknown"
            else:
                prefix = "misc"

            try:
                # Determine content lines and header
                if fname.startswith("hmondata_chassis") and fname.endswith(".tar.gz"):
                    with tarfile.open(fpath, "r:gz") as tar:
                        members = [m for m in tar.getmembers() if m.isfile()]
                        if not members:
                            logger.warning(f"[!] Empty archive: {fpath}")
                            continue
                        raw = tar.extractfile(members[0]).read().decode("utf-8", errors="ignore")
                    content = raw.splitlines()

                elif fname in ("hmondata_chassis1", "hmondata_chassis2"):
                    with open(fpath, "r", encoding="utf-8", errors="ignore") as f:
                        content = f.read().splitlines()
                else:
                    continue

                if len(content) <= 1:
                    logger.warning(f"[!] Too short: {fpath}")
                    continue

                # Drop any initial blank/garbage line
                if not content[0].startswith("time_stamp"):
                    content = content[1:]

                # Next line must be header
                header_line = content[0]
                data_lines = content[1:]

                clean_name = fname.replace(".tar.gz", "").replace(".", "_")
                base_name = f"{prefix}_{clean_name}"
                if base_name in seen:
                    continue
                seen.add(base_name)

                save_paginated_csv(
                    data_lines,
                    hmon_output_dir,
                    base_name,
                    chunk_size=chunk_size,
                    header=header_line
                )

            except Exception as e:
                logger.error(f"[✗] Failed on {fpath}: {e}")


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Parse and paginate HMON data.")
    parser.add_argument("input_dir", help="Root directory of HMON archives/raw files")
    parser.add_argument("output_dir", help="Directory to save paginated CSVs")
    parser.add_argument("--chunk-size", type=int, default=500, help="Rows per page")
    args = parser.parse_args()

    scan_and_parse_hmon_archives(args.input_dir, args.output_dir, chunk_size=args.chunk_size)