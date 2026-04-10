const test = require("node:test");
const assert = require("node:assert/strict");

const { clientToServerEvents, serverToClientEvents } = require("./socket-contract");

function hasDuplicates(list) {
    return new Set(list).size !== list.length;
}

test("socket contract lists are unique", () => {
    assert.equal(hasDuplicates(clientToServerEvents), false);
    assert.equal(hasDuplicates(serverToClientEvents), false);
});

test("critical compatibility events are present", () => {
    assert.ok(clientToServerEvents.includes("createClass"));
    assert.ok(clientToServerEvents.includes("getClassMistakes"));
    assert.ok(clientToServerEvents.includes("saveClassMistakes"));
    assert.ok(serverToClientEvents.includes("teacherClassFound"));
    assert.ok(serverToClientEvents.includes("teacherReportsData"));
});
