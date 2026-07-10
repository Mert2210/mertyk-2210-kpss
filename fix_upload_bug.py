import sys

app_path = "public/app.js"
with open(app_path, "r", encoding="utf-8") as f:
    js = f.read()

old_upload = """window.processImageUpload = async (e, type = 'question') => {
    const file = e.target.files[0]; 
    if(!file) return; 
    
    const previewId = type === 'question' ? 'img-preview' : 'img-preview-solution';
    document.getElementById(previewId).style.display = 'block'; 
    document.getElementById(previewId).src = "https://i.gifer.com/ZKZg.gif"; 

    try {
        const optimizedDataUrl = await optimizeImageFileForUpload(file);
        if (!optimizedDataUrl) throw new Error('Görsel verisi üretilemedi.');

        if (type === 'question') {"""

new_upload = """window.processImageUpload = async (e, type = 'image') => {
    const file = e.target.files[0]; 
    if(!file) return; 
    
    const isQuestion = (type === 'image' || type === 'question');
    const previewId = isQuestion ? 'img-preview' : 'img-preview-solution';
    document.getElementById(previewId).style.display = 'block'; 
    document.getElementById(previewId).src = "https://i.gifer.com/ZKZg.gif"; 

    try {
        const optimizedDataUrl = await optimizeImageFileForUpload(file);
        if (!optimizedDataUrl) throw new Error('Görsel verisi üretilemedi.');

        if (isQuestion) {"""

# The JS file might have special characters encoded differently due to previous replacements, 
# so I'll use regex if string replace fails.
if old_upload in js:
    js = js.replace(old_upload, new_upload)
else:
    import re
    js = re.sub(
        r"window\.processImageUpload\s*=\s*async\s*\(\s*e\s*,\s*type\s*=\s*['\"]question['\"]\s*\)\s*=>\s*\{.*?"
        r"const\s+previewId\s*=\s*type\s*===\s*['\"]question['\"]\s*\?\s*['\"]img-preview['\"]\s*:\s*['\"]img-preview-solution['\"];.*?"
        r"if\s*\(\s*type\s*===\s*['\"]question['\"]\s*\)\s*\{",
        """window.processImageUpload = async (e, type = 'image') => {
    const file = e.target.files[0]; 
    if(!file) return; 
    
    const isQuestion = (type === 'image' || type === 'question');
    const previewId = isQuestion ? 'img-preview' : 'img-preview-solution';
    document.getElementById(previewId).style.display = 'block'; 
    document.getElementById(previewId).src = "https://i.gifer.com/ZKZg.gif"; 

    try {
        const optimizedDataUrl = await optimizeImageFileForUpload(file);
        if (!optimizedDataUrl) throw new Error('Görsel verisi üretilemedi.');

        if (isQuestion) {""",
        js, flags=re.DOTALL
    )

with open(app_path, "w", encoding="utf-8") as f:
    f.write(js)

print("Fixed processImageUpload bug.")
