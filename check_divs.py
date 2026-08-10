import re

with open('public/index.html', encoding='utf-8') as f:
    lines = f.read().splitlines()

depth = 0
container_start = -1
for i, line in enumerate(lines):
    divs_opened = len(re.findall(r'<div\b', line))
    divs_closed = len(re.findall(r'</div', line))
    
    if '<div class="container">' in line:
        container_start = depth
        print(f'Container starts at line {i+1}, depth {depth}')
    
    depth += divs_opened - divs_closed
    
    if container_start != -1 and depth <= container_start:
        print(f'Container closes at line {i+1}')
        break
