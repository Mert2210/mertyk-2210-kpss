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

test('Kütüphane modal bağlamı: ekleme modunda filtre devre dışıdır, görüntüleme modunda boş aktif filtre tüm konulara düşer', async () => {
    const { getAllowedTopicsForModalContext } = await importUiFlow();
    const topics = ['Cümlede Anlam', 'Dil Bilgisi'];
    const saved = new Set();

    assert.deepStrictEqual(
        getAllowedTopicsForModalContext(topics, saved, 'saved', 'select'),
        { topics, effectiveMode: 'all', usedFallback: false }
    );
    assert.deepStrictEqual(
        getAllowedTopicsForModalContext(topics, saved, 'saved', 'view'),
        { topics, effectiveMode: 'all', usedFallback: true }
    );
});

test('Storage hata algısı: retry-limit-exceeded durumları doğru yakalanır', async () => {
    const { isStorageRetryLimitExceededError } = await importUiFlow();

    assert.equal(isStorageRetryLimitExceededError({ code: 'storage/retry-limit-exceeded' }), true);
    assert.equal(isStorageRetryLimitExceededError({ message: 'Firebase Storage: Max retry time for operation exceeded, please try again.' }), true);
    assert.equal(isStorageRetryLimitExceededError({ code: 'storage/unauthorized', message: 'Unauthorized' }), false);
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
    const { filterCourseNamesByQuery, buildSemesterSections, mergeSavedSubjectsWithDrafts, getNextExpandedCourse, buildSelectedCourseLabel } = await importUiFlow();
    const courses = ['Tarih', 'Coğrafya', 'Matematik', 'Türkçe'];

    assert.deepStrictEqual(filterCourseNamesByQuery(courses, 'ma'), ['Matematik']);
    assert.deepStrictEqual(buildSemesterSections(courses), [
        { title: '1. Dönem', courses: ['Tarih', 'Coğrafya'] },
        { title: '2. Dönem', courses: ['Matematik', 'Türkçe'] }
    ]);
    assert.deepStrictEqual(
        mergeSavedSubjectsWithDrafts(
            [
                { name: 'Tarih', selected: true, topics: '' },
                { name: 'Coğrafya', selected: true, topics: '' }
            ],
            [{ name: 'Matematik', selected: true, topics: '' }]
        ),
        [
            { name: 'Tarih', selected: true, topics: '' },
            { name: 'Coğrafya', selected: true, topics: '' },
            { name: 'Matematik', selected: true, topics: '' }
        ]
    );
    assert.equal(getNextExpandedCourse('', 'Tarih'), 'Tarih');
    assert.equal(getNextExpandedCourse('Tarih', 'Tarih'), '');
    assert.equal(buildSelectedCourseLabel('Coğrafya'), 'Seçili Ders: Coğrafya');
    assert.equal(buildSelectedCourseLabel(''), 'Seçili Ders: Henüz seçilmedi');
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

test('Ders konu birleştirme: tüm kaynaklar tekilleştirilir ve alfabetik sıralanır', async () => {
    const { buildTopicListFromSources } = await importUiFlow();
    const topics = buildTopicListFromSources(
        ['Osmanlı Devleti', 'Kurtuluş Savaşı'],
        ['Kurtuluş Savaşı', 'Atatürk İlke ve İnkılapları'],
        '  Atatürk İlke ve İnkılapları, Çağdaş Türk ve Dünya , ',
        ['Ankara Antlaşması', '']
    );

    assert.deepStrictEqual(topics, [
        'Ankara Antlaşması',
        'Atatürk İlke ve İnkılapları',
        'Çağdaş Türk ve Dünya',
        'Kurtuluş Savaşı',
        'Osmanlı Devleti',
    ]);
});

test('Hatırlatma rozetleri: zamanı gelen sorular ders bazında sayılır', async () => {
    const { buildDueReminderCountsBySubject } = await importUiFlow();
    const now = 1_700_000_000_000;
    const questions = [
        { ders: 'Tarih', nextReviewDate: now - 1000 },
        { ders: 'Tarih', nextReviewDate: now - 1 },
        { ders: 'Coğrafya', nextReviewDate: now + 1000 },
        { ders: 'Coğrafya', nextReviewDate: now - 5000 },
        { ders: '', nextReviewDate: now - 2000 },
        { ders: 'Vatandaşlık', nextReviewDate: 'invalid' }
    ];

    assert.deepStrictEqual(buildDueReminderCountsBySubject(questions, now), {
        Tarih: 2,
        Coğrafya: 1
    });
});

test('Hatırlatma etiketleri: saatlik ve günlük seçenekler doğru yazılır', async () => {
    const { formatReminderOptionLabel, DEFAULT_REMINDER_INTERVALS } = await importUiFlow();

    assert.deepStrictEqual(DEFAULT_REMINDER_INTERVALS, [1 / 24, 3 / 24, 12 / 24, 1, 3, 7, 15, 30]);
    assert.equal(formatReminderOptionLabel(1 / 24), '1 saat');
    assert.equal(formatReminderOptionLabel(3 / 24), '3 saat');
    assert.equal(formatReminderOptionLabel(12 / 24), '12 saat');
    assert.equal(formatReminderOptionLabel(7), '7 gün');
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
