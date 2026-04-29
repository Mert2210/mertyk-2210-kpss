const { performance } = require('perf_hooks');

async function benchmark() {
    const iterations = 500;

    // Original Approach Mock
    const authMock = () => ({
        listUsers: async () => ({
            users: Array.from({ length: 1000 }, (_, i) => ({
                email: `user${i}@example.com`,
                displayName: i < 50 ? `Name${i}|teacher_pending` : `Name${i}|student`
            }))
        })
    });

    const start1 = performance.now();
    for(let i = 0; i < iterations; i++) {
        const result = await authMock().listUsers();
        const pending = [];
        result.users.forEach(userRecord => {
            if (userRecord.displayName && userRecord.displayName.includes("|teacher_pending")) {
                pending.push({ email: userRecord.email, name: userRecord.displayName.split("|")[0] });
            }
        });
    }
    const end1 = performance.now();

    // Optimized Approach Mock
    const dbMock = {
        collection: () => ({
            where: () => ({
                get: async () => ({
                    docs: Array.from({ length: 50 }, (_, i) => ({
                        data: () => ({ email: `user${i}@example.com`, name: `Name${i}` })
                    }))
                })
            })
        })
    };

    const start2 = performance.now();
    for(let i = 0; i < iterations; i++) {
        const snap = await dbMock.collection("teacher_approvals").where("status", "==", "pending").get();
        const pending = [];
        snap.docs.forEach(doc => {
            const data = doc.data();
            if (data.email && data.name) {
                pending.push({ email: data.email, name: data.name });
            }
        });
    }
    const end2 = performance.now();

    console.log(`Original API request simulation: ${(end1 - start1).toFixed(2)} ms`);
    console.log(`Optimized Firestore query simulation: ${(end2 - start2).toFixed(2)} ms`);
}

benchmark();
