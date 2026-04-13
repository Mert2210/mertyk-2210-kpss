const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const uiFlowModuleUrl = pathToFileURL(path.resolve(__dirname, '../public/modules/ui-flow.mjs')).href;
const settingsModeModuleUrl = pathToFileURL(path.resolve(__dirname, '../public/modules/settings-mode.mjs')).href;

async function importUiFlow() {
    return import(uiFlowModuleUrl);
}

async function importSettingsMode() {
    return import(settingsModeModuleUrl);
}

test('Kütüphaneyi açma akışı: Derslerim konu seçimi pending filtre durumunu üretir', async () => {
    const { buildDerslerimTopicNavigation } = await importUiFlow();
    const state = buildDerslerimTopicNavigation('Tarih', 'Osmanlı Devleti');

    assert.deepStrictEqual(state, {
        libraryViewingTopicPath: { subject: 'Tarih', topic: 'Osmanlı Devleti' },
        pendingLibraryFilter: { subject: 'Tarih', topic: 'Osmanlı Devleti' }
    });
});

test('Konu seçince listeleme: sadece kayıtlı modunda yalnızca kayıtlı konu döner', async () => {
    const { getAllowedTopicsForMode } = await importUiFlow();
    const topics = ['Osmanlı Devleti', 'İnkılap Tarihi', 'Çağdaş Türk ve Dünya'];
    const saved = new Set(['İnkılap Tarihi']);

    assert.deepStrictEqual(getAllowedTopicsForMode(topics, saved, 'saved'), ['İnkılap Tarihi']);
    assert.deepStrictEqual(getAllowedTopicsForMode(topics, saved, 'all'), topics);
});

test('Hepsini çöz: soru havuzu boşsa test başlatılamaz, doluysa başlatılır', async () => {
    const { canStartLibraryTest } = await importUiFlow();

    assert.equal(canStartLibraryTest([]), false);
    assert.equal(canStartLibraryTest([{ id: 1 }]), true);
});

test('Şık seçince çözüm görünmesi: doğru/yanlış seçimi çözüm görünümünü tetikler', async () => {
    const { evaluateStdAnswer } = await importUiFlow();

    const correct = evaluateStdAnswer(2, 2);
    const wrong = evaluateStdAnswer(1, 2);

    assert.equal(correct.isCorrect, true);
    assert.equal(correct.showSolution, true);
    assert.equal(wrong.isCorrect, false);
    assert.equal(wrong.showSolution, true);
    assert.equal(wrong.correctIndex, 2);
});

test('Ders arama ve dönemleme: aranan ders filtrelenir ve iki döneme bölünür', async () => {
    const { filterCourseNamesByQuery, buildSemesterSections } = await importUiFlow();
    const courses = ['Tarih', 'Coğrafya', 'Matematik', 'Türkçe'];

    assert.deepStrictEqual(filterCourseNamesByQuery(courses, 'ma'), ['Matematik']);
    assert.deepStrictEqual(buildSemesterSections(courses), [
        { title: '1. Dönem', courses: ['Tarih', 'Coğrafya'] },
        { title: '2. Dönem', courses: ['Matematik', 'Türkçe'] }
    ]);
});

test('Kayıtlı kütüphane dersleri: seçili/tikli dersler tekilleştirilir', async () => {
    const { getSavedLibraryCourseNames } = await importUiFlow();
    const input = [
        { name: 'Tarih', checked: true },
        { name: 'Coğrafya', selected: true },
        { name: 'Tarih', selected: true },
        { name: '', favorite: true }
    ];

    assert.deepStrictEqual(getSavedLibraryCourseNames(input), ['Tarih', 'Coğrafya']);
});

test('Ders seçimi birleştirme: filtreli görünümde eski seçimler korunur, görünürdeki değişiklikler uygulanır', async () => {
    const { mergeVisibleCourseSelections } = await importUiFlow();
    const existing = [
        { name: 'Tarih', selected: true },
        { name: 'Coğrafya', selected: true }
    ];
    const visible = [
        { name: 'Coğrafya', selected: false },
        { name: 'Matematik', selected: true }
    ];

    assert.deepStrictEqual(mergeVisibleCourseSelections(existing, visible), [
        { name: 'Tarih', selected: true },
        { name: 'Matematik', selected: true }
    ]);
});

test('Profil modu görünürlük kuralları: profilde kaydet görünür, derslerimde gizli', async () => {
    const { SETTINGS_MODES, getSettingsVisibility, getDefaultSettingsModeByRole } = await importSettingsMode();

    const profileVis = getSettingsVisibility(SETTINGS_MODES.PROFILE);
    const derslerimVis = getSettingsVisibility(SETTINGS_MODES.DERSLERIM);

    assert.deepStrictEqual(profileVis, {
        showProfileSection: true,
        showDerslerimSection: false,
        showProfileSaveButton: true
    });
    assert.deepStrictEqual(derslerimVis, {
        showProfileSection: false,
        showDerslerimSection: true,
        showProfileSaveButton: false
    });

    assert.equal(getDefaultSettingsModeByRole(true), SETTINGS_MODES.PROFILE);
    assert.equal(getDefaultSettingsModeByRole(false), SETTINGS_MODES.DERSLERIM);
});
