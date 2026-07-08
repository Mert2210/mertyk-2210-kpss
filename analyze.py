import sys
import re
import json

with open("index.js", "r", encoding="utf-8", errors="ignore") as f:
    js = f.read()

print("--- SECURITY ANALYSIS OF index.js ---")
print("1. Password Hashing (crypto/bcrypt):")
if "crypto.createHash" in js or "bcrypt" in js:
    print("Found hashing logic.")
else:
    print("No hashing logic found! Passwords might be stored in plaintext.")

print("\n2. File System Operations (Path Traversal):")
fs_calls = re.findall(r"fs\.[a-zA-Z]+Sync\([^)]+\)", js)
for call in fs_calls[:10]:
    print(" -", call)

print("\n3. Rate Limiting:")
if "rateLimit" in js:
    print("Found express-rate-limit.")
else:
    print("No rate limit found.")

print("\n4. Socket Auth / Authorization:")
if "socket.on" in js:
    print(f"Found {js.count('socket.on')} socket event handlers.")
