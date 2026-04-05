// 🚨 V5.0 TAM EKRAN (TINDER STİLİ) SWIPE MOTORU 🚨

window.swipeQuestions = [];
window.currentSwipeIndex = 0;
window.isDragging = false;
window.startPos = { x: 0, y: 0 };
window.currentTranslate = { x: 0, y: 0 };

// Eski "Hata Defteri Testi" fonksiyonunu Swipe Sistemine yönlendiriyoruz
window.startLibraryTest = (mode = 'all') => {
    let pool = [];
    let now = Date.now();
    let allLocal = JSON.parse(localStorage.getItem('gazi_local_notebook')) || [];

    if (mode === 'new') {
        pool = allLocal.filter(q => !q.nextReviewDate); // Henüz hiç erteleme almamışlar
    } else if (mode === 'review') {
        pool = allLocal.filter(q => q.nextReviewDate && q.nextReviewDate <= now); // Zamanı gelenler
    } else {
        // Klasik Liste butonundan tıklandıysa, o anki filtreli listeyi al
        pool = window.tempStdQuestions && window.tempStdQuestions.length > 0 ? [...window.tempStdQuestions] : [...allLocal];
    }

    if(pool.length === 0) return alert("Bu kategoride çözülecek soru bulunamadı komutanım!");

    // Desteyi Karıştır
    for (let i = pool.length - 1; i > 0; i--) { 
        const j = Math.floor(Math.random() * (i + 1)); 
        [pool[i], pool[j]] = [pool[j], pool[i]]; 
    }

    window.swipeQuestions = pool;
    window.currentSwipeIndex = 0;
    
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const swScreen = document.getElementById('screen-swipe');
    if(swScreen) swScreen.style.display = 'flex';
    
    window.renderSwipeCard();
};

window.renderSwipeCard = () => {
    if (window.currentSwipeIndex >= window.swipeQuestions.length) {
        alert("Tebrikler! Destedeki tüm soruları bitirdin.");
        window.closeSwipeScreen();
        return;
    }
    
    const q = window.swipeQuestions[window.currentSwipeIndex];
    window.currentQObject = q; // Mevcut soru kaydı için
    const card = document.getElementById('swipe-card');
    
    if(card) {
        // Kartı merkezle ve animasyonları sıfırla
        card.style.transition = 'none';
        card.style.transform = 'translate(0px, 0px) rotate(0deg)';
    }
    
    const counter = document.getElementById('swipe-counter');
    if(counter) counter.innerText = `${window.currentSwipeIndex + 1} / ${window.swipeQuestions.length}`;
    
    const lesson = document.getElementById('swipe-lesson');
    if(lesson) lesson.innerText = q.ders || 'Genel';
    
    const img = document.getElementById('swipe-q-image');
    if(img) {
        if(q.image) { img.src = q.image; img.style.display = 'block'; } 
        else { img.style.display = 'none'; }
    }
    
    const qText = document.getElementById('swipe-q-text');
    if(qText) qText.innerText = q.soru || q.not || 'Görseli inceleyiniz.';
    
    const qBook = document.getElementById('swipe-q-book');
    if(qBook) qBook.innerText = "Kaynak: " + (q.kitap || '-');
    
    const optsArea = document.getElementById('swipe-abcde');
    if(optsArea) {
        const siklar = q.siklar || ['A','B','C','D','E'];
        optsArea.innerHTML = siklar.map((s, i) => `<button class="abcde-btn" onclick="window.checkSwipeAnswer(this, ${i})">${s}</button>`).join('');
    }
    
    // Panelleri gizle
    const solPanel = document.getElementById('swipe-solution-panel');
    if(solPanel) solPanel.style.bottom = '-100%';
    
    const blurOverlay = document.getElementById('swipe-blur-overlay');
    if(blurOverlay) blurOverlay.style.display = 'none';
};

window.closeSwipeScreen = () => {
    const swScreen = document.getElementById('screen-swipe');
    if(swScreen) swScreen.style.display = 'none';
    if(typeof window.showScreen === 'function') window.showScreen('screen-main');
    if(typeof window.checkAlerts === 'function') window.checkAlerts(); // Ana ekrandaki rozet sayılarını güncelle
};

window.checkSwipeAnswer = (btn, selectedIdx) => {
    const q = window.swipeQuestions[window.currentSwipeIndex];
    const btns = document.querySelectorAll('#swipe-abcde button');
    btns.forEach(b => b.disabled = true);
    
    if(selectedIdx === q.dogru) { 
        btn.classList.add('correct'); 
        if(typeof confetti === 'function') confetti({ particleCount: 100 }); 
    } else { 
        btn.classList.add('wrong'); 
        if(btns[q.dogru]) btns[q.dogru].classList.add('correct'); 
    }
    
    // Çözüm panelini tetikle
    setTimeout(() => { window.openSwipeSolution(); }, 400);
};

window.openSwipeSolution = () => {
    const solPanel = document.getElementById('swipe-solution-panel');
    if(solPanel) solPanel.style.bottom = '0';
    window.switchSolutionTab('cozum');
};

window.closeSwipeSolution = () => {
    const solPanel = document.getElementById('swipe-solution-panel');
    if(solPanel) solPanel.style.bottom = '-100%';
    // Çözümü kapattıktan sonra bir sonraki soruya geç
    setTimeout(() => { window.nextSwipeCard(); }, 300);
};

window.switchSolutionTab = (tab) => {
    const q = window.swipeQuestions[window.currentSwipeIndex];
    
    const btnCozum = document.getElementById('btn-tab-cozum');
    const btnKaynak = document.getElementById('btn-tab-kaynak');
    const btnActive = document.getElementById('btn-tab-' + tab);
    
    if(btnCozum) btnCozum.classList.remove('active');
    if(btnKaynak) btnKaynak.classList.remove('active');
    if(btnActive) btnActive.classList.add('active');
    
    const content = document.getElementById('swipe-solution-content');
    if(!content) return;

    if(tab === 'cozum') {
        content.innerHTML = `<b>👨‍🏫 Çözüm Notu:</b><br>${q.solutionText || 'Yazılı açıklama eklenmemiş.'}<br>
        ${q.solutionImage ? `<img src="${q.solutionImage}" style="width:100%; border-radius:5px; margin-top:10px;">` : ''}`;
    } else {
        content.innerHTML = `<b>📚 Orijinal Kaynak:</b><br>Bu soru <b>${q.kitap || 'Bilinmeyen'}</b> kaynağından alınmıştır. Varsa kaynak fotoğrafı aşağıdadır:<br>
        ${q.image ? `<img src="${q.image}" style="width:100%; border-radius:5px; margin-top:10px;">` : '<p>Fotoğraf yok.</p>'}`;
    }
};

window.handleSwipeDelay = (days) => {
    const q = window.swipeQuestions[window.currentSwipeIndex];
    const newDate = Date.now() + (days * 24 * 60 * 60 * 1000);
    
    let localData = JSON.parse(localStorage.getItem('gazi_local_notebook')) || []; 
    const idx = localData.findIndex(x => x.id === q.id); 
    if(idx !== -1) { 
        localData[idx].nextReviewDate = newDate; 
        localStorage.setItem('gazi_local_notebook', JSON.stringify(localData)); 
    }
    
    const blurOverlay = document.getElementById('swipe-blur-overlay');
    if(blurOverlay) blurOverlay.style.display = 'none';
    
    window.nextSwipeCard();
};

window.cancelSwipeOverlay = () => {
    const blurOverlay = document.getElementById('swipe-blur-overlay');
    if(blurOverlay) blurOverlay.style.display = 'none';
    
    const card = document.getElementById('swipe-card');
    if(card) {
        card.classList.add('swipe-animate-reset');
        card.style.transform = `translate(0px, 0px) rotate(0deg)`;
    }
};

window.nextSwipeCard = () => {
    window.currentSwipeIndex++;
    window.renderSwipeCard();
};

window.deleteCurrentSwipeQuestion = () => {
    if(confirm("Bu soruyu tamamen silmek istediğinize emin misiniz?")) {
        const q = window.swipeQuestions[window.currentSwipeIndex];
        let localData = JSON.parse(localStorage.getItem('gazi_local_notebook')) || [];
        localData = localData.filter(x => x.id !== q.id);
        localStorage.setItem('gazi_local_notebook', JSON.stringify(localData));
        window.nextSwipeCard();
    }
};

// 🚨 GESTURE (KAYDIRMA) MOTORUNU BAŞLAT 🚨
document.addEventListener("DOMContentLoaded", () => {
    setTimeout(() => {
        const card = document.getElementById('swipe-card');
        if(!card) return;

        const startDrag = (e) => {
            if (e.target.closest('button') || e.target.closest('#swipe-solution-panel') || e.target.closest('#swipe-blur-overlay')) return;
            window.isDragging = true;
            window.startPos = { 
                x: e.type.includes('mouse') ? e.pageX : e.touches[0].clientX, 
                y: e.type.includes('mouse') ? e.pageY : e.touches[0].clientY 
            };
            card.style.transition = 'none';
        };

        const onDrag = (e) => {
            if (!window.isDragging) return;
            const currentX = e.type.includes('mouse') ? e.pageX : e.touches[0].clientX;
            const currentY = e.type.includes('mouse') ? e.pageY : e.touches[0].clientY;
            
            window.currentTranslate.x = currentX - window.startPos.x;
            window.currentTranslate.y = currentY - window.startPos.y;
            
            const rotate = window.currentTranslate.x * 0.05;
            card.style.transform = `translate(${window.currentTranslate.x}px, ${window.currentTranslate.y}px) rotate(${rotate}deg)`;
        };

        const endDrag = (e) => {
            if (!window.isDragging) return;
            window.isDragging = false;
            card.style.transition = 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
            
            if (window.currentTranslate.x > 120) {
                // Sona At (Sağa Kaydır)
                card.classList.add('swipe-animate-right');
                setTimeout(() => {
                    const q = window.swipeQuestions.splice(window.currentSwipeIndex, 1)[0];
                    window.swipeQuestions.push(q);
                    card.classList.remove('swipe-animate-right');
                    window.renderSwipeCard();
                }, 300);
            } else if (window.currentTranslate.x < -120) {
                // Ertele (Sola Kaydır)
                card.style.transform = `translate(-150vw, ${window.currentTranslate.y}px) rotate(-20deg)`;
                setTimeout(() => { 
                    const blurOverlay = document.getElementById('swipe-blur-overlay');
                    if(blurOverlay) blurOverlay.style.display = 'flex'; 
                }, 200);
            } else if (window.currentTranslate.y > 100) {
                // Çözüm (Aşağı Kaydır)
                card.style.transform = `translate(0px, 0px) rotate(0deg)`;
                window.openSwipeSolution();
            } else {
                // İptal (Yeterince kaydırılmadı)
                card.style.transform = `translate(0px, 0px) rotate(0deg)`;
            }
            window.currentTranslate = { x: 0, y: 0 };
        };

        card.addEventListener('mousedown', startDrag);
        card.addEventListener('touchstart', startDrag, {passive: true});
        document.addEventListener('mousemove', onDrag);
        document.addEventListener('touchmove', onDrag, {passive: false});
        document.addEventListener('mouseup', endDrag);
        document.addEventListener('touchend', endDrag);
        
        // Klavye Yön Tuşları Desteği (Bilgisayar İçin)
        document.addEventListener('keydown', (e) => {
            const swScreen = document.getElementById('screen-swipe');
            const blurOverlay = document.getElementById('swipe-blur-overlay');
            const solPanel = document.getElementById('swipe-solution-panel');
            
            if (!swScreen || swScreen.style.display !== 'flex') return;
            if (blurOverlay && blurOverlay.style.display === 'flex') return;
            if (solPanel && solPanel.style.bottom === '0px') return; // Panel açıksa tuşları kitle

            if (e.key === 'ArrowRight') {
                card.style.transition = 'transform 0.3s ease-out';
                card.classList.add('swipe-animate-right');
                setTimeout(() => {
                    const q = window.swipeQuestions.splice(window.currentSwipeIndex, 1)[0];
                    window.swipeQuestions.push(q);
                    card.classList.remove('swipe-animate-right');
                    window.renderSwipeCard();
                }, 300);
            } else if (e.key === 'ArrowLeft') {
                card.style.transition = 'transform 0.3s ease-out';
                card.classList.add('swipe-animate-left');
                setTimeout(() => { 
                    if(blurOverlay) blurOverlay.style.display = 'flex'; 
                }, 300);
            } else if (e.key === 'ArrowDown') {
                window.openSwipeSolution();
            }
        });
    }, 1000); // DOM hazır olduktan sonra güvenle başlat
});
