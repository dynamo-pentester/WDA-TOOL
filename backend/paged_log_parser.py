import os
import tarfile
import gzip
import shutil
import re
import json
import logging
from backend.utils.file_utils import extract_tar_nested
from backend.parse_hmon import scan_and_parse_hmon_archives

logger = logging.getLogger(__name__)

CHUNK_SIZE = 500
IMPORTANT_FILES = [
    "swlog_chassis", "tech_support_layer2.log", "tech_support_layer3.log",
    "swlog_failure_reboot_log", "swlog_localConsole", "hmon", "swlogtime"
]

LOG_PATTERN = re.compile(
    r"(?P<ts>\d{4} \w{3}\s+\d{1,2} \d{2}:\d{2}:\d{2}(?:\.\d+)?) (?P<switch>\S+) swlogd (?P<module>\S+) .+?: (?P<message>.+)",
    re.IGNORECASE
)

def extract_and_paginate_logs(tar_path: str, output_base: str):
    base_dir = tar_path.replace(".tar", "")
    os.makedirs(base_dir, exist_ok=True)
    logger.info(f"Extracting tar: {tar_path} → {base_dir}")
    extract_tar_nested(tar_path, base_dir)

    all_modules = set()
    os.makedirs(output_base, exist_ok=True)

    dirs_to_check = [os.path.join(base_dir, "flash")]
    mnt_path = os.path.join(base_dir, "mnt")

    if os.path.exists(mnt_path):
        for name in os.listdir(mnt_path):
            full_path = os.path.join(mnt_path, name)
            if os.path.isdir(full_path) and name.startswith("chassis"):
                dirs_to_check.append(full_path)

    for dir_path in dirs_to_check:
        tech_path = os.path.join(dir_path, "tech_support_eng.tar")
        if os.path.exists(tech_path):
            extracted = os.path.join(dir_path, "_eng")
            extract_tar_nested(tech_path, extracted)
            parse_and_split_logs(extracted, all_modules, output_base)

    # NEW: Save HMON data to json/hmon_data/
    hmon_out = os.path.join(output_base, "hmon_data")
    os.makedirs(hmon_out, exist_ok=True)
    scan_and_parse_hmon_archives(base_dir, hmon_out)

    logger.info(f"Extracted modules: {sorted(all_modules)}")
    return {"modules": sorted(all_modules)}

def parse_and_split_logs(root, modules, output_base):
    for dirpath, _, filenames in os.walk(root):
        for fname in filenames:
            filepath = os.path.join(dirpath, fname)
            lname = fname.lower()

            try:
                if "swlog_archive" in dirpath.lower() and fname.endswith(".gz"):
                    with gzip.open(filepath, 'rb') as f_in:
                        out_path = filepath.replace(".gz", "")
                        with open(out_path, 'wb') as f_out:
                            shutil.copyfileobj(f_in, f_out)
                        logger.info(f"Decompressed and parsing: {out_path}")
                        split_and_save_json(out_path, modules, output_base)

                elif any(key in lname for key in IMPORTANT_FILES):
                    logger.info(f"Parsing important log file: {filepath}")
                    split_and_save_json(filepath, modules, output_base)

            except Exception as e:
                logger.warning(f"[!] Failed to process {filepath}: {e}")

def split_and_save_json(filepath, modules, output_dir):
    try:
        filename = os.path.basename(filepath)
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            lines = f.readlines()

        parsed = []
        for line in lines:
            line = line.strip()
            match = LOG_PATTERN.match(line)
            if match:
                parsed.append({
                    "file": filename,
                    "line": line,
                    "timestamp": match.group("ts"),
                    "switch": match.group("switch"),
                    "module": match.group("module"),
                    "message": match.group("message")
                })
                modules.add(match.group("module"))

        for i in range(0, len(parsed), CHUNK_SIZE):
            page = parsed[i:i + CHUNK_SIZE]
            page_num = (i // CHUNK_SIZE) + 1
            json_name = f"{filename}_pg{page_num}.json"
            with open(os.path.join(output_dir, json_name), 'w', encoding='utf-8') as jf:
                json.dump(page, jf, indent=2)
            logger.info(f"Saved: {json_name} with {len(page)} entries")

    except Exception as e:
        logger.error(f"Failed to parse or save {filepath}: {e}")
