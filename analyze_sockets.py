import sys
import re

with open("index.js", "r", encoding="utf-8", errors="ignore") as f:
    js = f.read()

# Check how socket events handle username
events = re.findall(r"socket\.on\(['\"]([^'\"]+)['\"].*?\{([^\}]+)", js, re.DOTALL)

for event_name, body in events:
    if "username" in body or "studentName" in body:
        print(f"Event '{event_name}' might use unauthenticated username payload.")
        
