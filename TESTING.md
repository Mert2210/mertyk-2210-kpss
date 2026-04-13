# Manual Testing Steps

1. Open app, log in as a student, and go to **Profil / Derslerim**.
2. In **Sorumlu Olduğunuz Dersler**, click a course and open **Konuları Seç**.
3. Select multiple topics and click **Konu Seçimini Kaydet**.
4. Verify selected topics appear under **Kayıtlı Kütüphanem** and in **Kütüphaneyi Aç** (`screen-library-lessons`).
5. In main screen, confirm reminder card says **Hatırlatılacak Sorular** (no exam countdown panel).
6. Add a question with **💾 Cihaza Kaydet**, then reopen library and verify question remains after:
   - navigating away/back
   - reloading the page
7. In library list, verify filter controls are not shown.
8. Tap **▶ Hepsini Test Olarak Çöz** and verify question solving screen is vertical list style (full-screen list flow).
9. In **Profil**, toggle notifications on and verify status text is **Bildirimler açık** (not loading text).
10. Open **Hatırlatma Seçenekleri**:
    - Add interval
    - Edit interval
    - Delete interval
    - Return and verify updated intervals appear in question save reminder dropdown and review delay dropdown.
