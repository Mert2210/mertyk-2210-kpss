const { performance } = require('perf_hooks');

async function runBenchmark() {
    // Mock for socket, admin, etc.
    const mockSocket = { emit: () => {} };
    const mockAdmin = {
        apps: [1],
        auth: () => ({
            listUsers: async () => ({
                users: Array(1000).fill({
                    displayName: "mock|teacher_pending",
                    email: "mock@example.com"
                })
            })
        })
    };

    // Test the unoptimized original logic
    const start = performance.now();
    for (let i = 0; i < 100; i++) {
        if(mockAdmin.apps.length) {
            try {
                const listUsersResult = await mockAdmin.auth().listUsers(1000);
                const pending = [];
                listUsersResult.users.forEach(userRecord => {
                    if (userRecord.displayName && userRecord.displayName.includes("|teacher_pending")) {
                        pending.push({ email: userRecord.email, name: userRecord.displayName.split("|")[0] });
                    }
                });
            } catch(e) {}
        }
    }
    const end = performance.now();
    console.log(`Original Time: ${(end - start).toFixed(2)}ms`);

    const mockDb = {
        collection: () => ({
            where: () => ({
                get: async () => ({
                    docs: Array(1000).fill({
                        data: () => ({ email: "mock@example.com", name: "mock" })
                    })
                })
            })
        })
    };

    // Test the new logic using Firestore querying
    const start2 = performance.now();
    for (let i = 0; i < 100; i++) {
        if(mockAdmin.apps.length) {
            try {
                const snap = await mockDb.collection("teacher_approvals").where("status", "==", "pending").get();
                const pending = [];
                snap.docs.forEach(doc => {
                    const data = doc.data();
                    if(data.email && data.name) {
                        pending.push({ email: data.email, name: data.name });
                    }
                });
            } catch(e) {}
        }
    }
    const end2 = performance.now();
    console.log(`Optimized Time (Firestore): ${(end2 - start2).toFixed(2)}ms`);
}

runBenchmark();
