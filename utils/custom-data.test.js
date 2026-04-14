const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const customDataModuleUrl = pathToFileURL(path.resolve(__dirname, '../public/modules/custom-data.mjs')).href;

async function importCustomData() {
    return import(customDataModuleUrl);
}

test('Exam type fallback: profil değeri varsa onu kullanır, boşsa stored/default fallback yapar', async () => {
    const { resolveCurrentExamType } = await importCustomData();

    assert.equal(resolveCurrentExamType('kpss_onlisans', 'kpss_lisans', 'kpss_lisans'), 'kpss_onlisans');
    assert.equal(resolveCurrentExamType('', 'kpss_lisans', 'kpss_lisans'), 'kpss_lisans');
    assert.equal(resolveCurrentExamType('   ', '', 'kpss_lisans'), 'kpss_lisans');
});

test('Custom curriculum subjects/topics: gruplar arası tekilleştirme ve boş değer temizleme yapılır', async () => {
    const {
        getCustomCurriculumGroupsByExamType,
        getCustomCurriculumSubjectsByExamType,
        getCustomCurriculumTopicsByExamTypeAndSubject
    } = await importCustomData();

    const map = {
        kpss_lisans: {
            Genel: {
                Tarih: ['Osmanlı', 'Kurtuluş Savaşı', ''],
                Coğrafya: ['Bölgeler']
            },
            Alan: {
                Tarih: ['Kurtuluş Savaşı', 'Çağdaş Türk ve Dünya'],
                Vatandaşlık: ['Anayasa']
            }
        }
    };

    assert.deepStrictEqual(Object.keys(getCustomCurriculumGroupsByExamType(map, 'kpss_lisans')), ['Genel', 'Alan']);
    assert.deepStrictEqual(getCustomCurriculumSubjectsByExamType(map, 'kpss_lisans'), ['Tarih', 'Coğrafya', 'Vatandaşlık']);
    assert.deepStrictEqual(
        getCustomCurriculumTopicsByExamTypeAndSubject(map, 'kpss_lisans', 'Tarih'),
        ['Osmanlı', 'Kurtuluş Savaşı', 'Çağdaş Türk ve Dünya']
    );
    assert.deepStrictEqual(getCustomCurriculumTopicsByExamTypeAndSubject(map, 'kpss_lisans', ' '), []);
});

test('Custom topics map: subject bazlı okuma ve eklemede tekilleştirme korunur', async () => {
    const { getCustomTopicsBySubject, addCustomTopicsForSubject } = await importCustomData();

    const baseMap = {
        Tarih: ['Osmanlı', 'Kurtuluş Savaşı']
    };
    const next = addCustomTopicsForSubject(baseMap, 'Tarih', ['Kurtuluş Savaşı', '  Çağdaş Türk ve Dünya  ', '']);

    assert.deepStrictEqual(getCustomTopicsBySubject(baseMap, 'Tarih'), ['Osmanlı', 'Kurtuluş Savaşı']);
    assert.deepStrictEqual(getCustomTopicsBySubject(next, 'Tarih'), ['Osmanlı', 'Kurtuluş Savaşı', 'Çağdaş Türk ve Dünya']);
    assert.deepStrictEqual(getCustomTopicsBySubject(next, 'Bilinmiyor'), []);
});

test('Exam subject merge: kpss_a kayıtlı ortak dersleri eklemez', async () => {
    const { mergeSubjectsForExamType } = await importCustomData();

    const merged = mergeSubjectsForExamType('kpss_a', {
        curriculumSubjects: ['Muhasebe', 'Hukuk'],
        defaultSubjects: ['Matematik', 'Türkçe'],
        customSubjects: ['Vergi Hukuku'],
        savedSubjects: ['Matematik', 'Coğrafya']
    });

    assert.deepStrictEqual(merged, ['Muhasebe', 'Hukuk', 'Vergi Hukuku']);
});

test('Exam subject merge: diğer sınav tiplerinde kayıtlı dersler korunur', async () => {
    const { mergeSubjectsForExamType } = await importCustomData();

    const merged = mergeSubjectsForExamType('kpss_lisans', {
        curriculumSubjects: ['Tarih', 'Coğrafya'],
        defaultSubjects: ['Matematik'],
        customSubjects: ['Vatandaşlık'],
        savedSubjects: ['Türkçe']
    });

    assert.deepStrictEqual(merged, ['Tarih', 'Coğrafya', 'Vatandaşlık', 'Türkçe']);
});
