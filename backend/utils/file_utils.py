# file_utils.py
import os
import tarfile
import shutil

def extract_tar_nested(tar_path, out_dir):
    """Extracts tar file including nested .tar inside"""
    try:
        with tarfile.open(tar_path) as tar:
            tar.extractall(path=out_dir)
            for member in tar.getmembers():
                if member.isfile() and member.name.endswith(".tar"):
                    nested_tar_path = os.path.join(out_dir, member.name)
                    nested_extract_dir = os.path.join(out_dir, os.path.splitext(member.name)[0])
                    os.makedirs(nested_extract_dir, exist_ok=True)
                    with tarfile.open(nested_tar_path) as nested_tar:
                        nested_tar.extractall(path=nested_extract_dir)
    except Exception as e:
        print(f"[!] Failed to extract {tar_path}: {e}")
