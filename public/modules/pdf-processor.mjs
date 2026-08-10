// pdf-processor.mjs - PDF upload and OCR extraction using pdf.js and tesseract.js

let isProcessing = false;
let socketRef = null;
let currentClassCode = "GENEL"; 

export function initPdfProcessor(socketInstance) {
    socketRef = socketInstance;
    
    const uploadInput = document.getElementById('pdf-upload-input');
    if (!uploadInput) return;
    
    uploadInput.addEventListener('change', handlePdfUpload);
}

async function handlePdfUpload(event) {
    const file = event.target.files[0];
    if (!file || file.type !== 'application/pdf') {
        alert("Lütfen geçerli bir PDF dosyası seçin.");
        return;
    }
    
    if (isProcessing) {
        alert("Şu anda bir PDF işleniyor, lütfen bekleyin.");
        return;
    }
    
    isProcessing = true;
    
    const progressContainer = document.getElementById('pdf-progress-container');
    const progressText = document.getElementById('pdf-progress-text');
    const progressBar = document.getElementById('pdf-progress-bar');
    
    progressContainer.style.display = 'block';
    progressText.innerText = "PDF Hazırlanıyor...";
    progressBar.style.width = "5%";
    progressBar.style.background = "#f1c40f";
    
    if (window.myClassCode) currentClassCode = window.myClassCode;
    
    try {
        const fileReader = new FileReader();
        fileReader.onload = async function() {
            const typedarray = new Uint8Array(this.result);
            
            const pdf = await pdfjsLib.getDocument(typedarray).promise;
            const totalPages = pdf.numPages;
            progressText.innerText = `PDF Yüklendi! Toplam ${totalPages} sayfa okunacak...`;
            
            progressText.innerText = "Yapay Zeka (OCR) başlatılıyor (Türkçe)... İlk kurulum birkaç saniye sürebilir.";
            const worker = await Tesseract.createWorker('tur');
            
            const batchSize = 5; 
            let pagesProcessed = 0;
            
            for (let i = 1; i <= totalPages; i += batchSize) {
                const endPage = Math.min(i + batchSize - 1, totalPages);
                progressText.innerText = `Sayfa ${i} - ${endPage} okunuyor... (Toplam ${totalPages})`;
                progressBar.style.width = `${Math.round((i/totalPages) * 100)}%`;
                
                let batchText = "";
                
                for (let j = i; j <= endPage; j++) {
                    const page = await pdf.getPage(j);
                    const viewport = page.getViewport({scale: 2.0});
                    
                    const canvas = document.createElement('canvas');
                    const context = canvas.getContext('2d');
                    canvas.height = viewport.height;
                    canvas.width = viewport.width;
                    
                    const renderContext = {
                        canvasContext: context,
                        viewport: viewport
                    };
                    
                    await page.render(renderContext).promise;
                    
                    const imageDataUrl = canvas.toDataURL('image/png');
                    const { data: { text } } = await worker.recognize(imageDataUrl);
                    
                    batchText += `\n--- SAYFA ${j} ---\n` + text;
                    pagesProcessed++;
                }
                
                progressText.innerText = `Sayfa ${i} - ${endPage} Gemini AI'a gönderiliyor... Lütfen bekleyin.`;
                
                await new Promise((resolve, reject) => {
                    socketRef.emit('processPdfTextToQuestions', { 
                        text: batchText, 
                        classCode: currentClassCode 
                    }, (response) => {
                        if(response && response.error) {
                            console.error("Gemini Hatası:", response.error);
                        } else if (response && response.success) {
                            console.log(`${response.addedCount} soru eklendi.`);
                        }
                        resolve();
                    });
                });
                
                if (endPage < totalPages) {
                    progressText.innerText = `API limiti korunuyor... Lütfen 5 saniye bekleyin.`;
                    await new Promise(r => setTimeout(r, 5000));
                }
            }
            
            await worker.terminate();
            
            progressText.innerText = `✅ İşlem Tamamlandı! ${totalPages} sayfa tarandı ve sorular sisteme eklendi.`;
            progressBar.style.width = "100%";
            progressBar.style.background = "#2ecc71";
            isProcessing = false;
            
            // Reset input so the same file can be uploaded again if needed
            event.target.value = '';
        };
        fileReader.readAsArrayBuffer(file);
        
    } catch (error) {
        console.error("PDF İşleme Hatası:", error);
        progressText.innerText = "❌ Bir hata oluştu: " + error.message;
        progressBar.style.background = "#e74c3c";
        isProcessing = false;
        event.target.value = '';
    }
}
