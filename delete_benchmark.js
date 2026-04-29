const { performance } = require('perf_hooks');

async function benchmark() {
    const iterations = 1000;

    // Simulate 500 questions in a class
    const docs = Array.from({ length: 500 }, (_, i) => ({
        data: () => ({ id: `id-${i}`, soru: `Question text ${i}` }),
        ref: { delete: async () => {} }
    }));

    const mockDbOriginal = {
        collection: () => ({
            where: () => ({
                get: async () => ({ docs })
            })
        })
    };

    const mockDbOptimized = {
        collection: () => ({
            where: (field, op, val) => ({
                where: (field2, op2, val2) => ({
                    limit: () => ({
                        get: async () => {
                            const found = docs.find(d => d.data().id === val2);
                            return { empty: !found, docs: found ? [found] : [] };
                        }
                    })
                })
            })
        })
    };

    const safeClassCode = "CLASS1";
    const safeQuestionId = "id-450";
    const safeQuestionText = "";

    const start1 = performance.now();
    for(let i = 0; i < iterations; i++) {
        const snap = await mockDbOriginal.collection("kpss_sorular").where("classCode", "==", safeClassCode).get();
        const targetDoc = snap.docs.find((doc) => {
            const row = doc.data() || {};
            if (safeQuestionId && row.id === safeQuestionId) return true;
            if (!safeQuestionId && safeQuestionText && row.soru === safeQuestionText) return true;
            return false;
        });
        if (targetDoc) await targetDoc.ref.delete();
    }
    const end1 = performance.now();

    const start2 = performance.now();
    for(let i = 0; i < iterations; i++) {
        if (safeQuestionId) {
            const snap = await mockDbOptimized.collection("kpss_sorular")
                .where("classCode", "==", safeClassCode)
                .where("id", "==", safeQuestionId)
                .limit(1)
                .get();
            if (!snap.empty) await snap.docs[0].ref.delete();
        } else {
            const snap = await mockDbOriginal.collection("kpss_sorular").where("classCode", "==", safeClassCode).get();
            const targetDoc = snap.docs.find((doc) => {
                const row = doc.data() || {};
                if (!safeQuestionId && safeQuestionText && row.soru === safeQuestionText) return true;
                return false;
            });
            if (targetDoc) await targetDoc.ref.delete();
        }
    }
    const end2 = performance.now();

    console.log(`Original API simulation (fetch all, find memory): ${(end1 - start1).toFixed(2)} ms`);
    console.log(`Optimized Firestore query simulation: ${(end2 - start2).toFixed(2)} ms`);
}

benchmark();
