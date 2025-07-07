// cocoon scratchpad: ad-hoc experiments for interrupting different kinds of
// work -- a pending timer (setTimeout) alongside a tight infinite `while (true)`
// CPU loop. Unlike state.js this is not a clean, self-contained demo; it is kept
// as a place to try things. Send SIGUSR2 to a `./node cocoon/test.js` process to
// see the native InterruptHandler run against this busy loop.

function greet(name) {
    console.log(`Hello, ${name}!`);
}

greet("Amber");
setTimeout(() => {
    try {
    console.log("X seconds have passed!");
    console.log("Print one more time");
    console.log("Print one more time again");
        // Simulate an error
        console.log("This will not throw an error");
    } catch (e) {
        console.log("An error occurred:", e);
    }
}, 10000);
greet("Yizheng");
function increment(i){
    return i+1;
}
function couting_from_zero() {
    let i = 0;
    while (i < 100000000) {
        i++;
    }
    return i;
}
global.myVar = 42;
global.i = 0;
try {
    while  (true) {
        // Tight busy loop that never yields to the event loop; the only way out
        // is a native interrupt (SIGUSR2 -> InterruptHandler).
        if (global.i % 1000000 === 0) {
            global.i = 0;
        }
    }
} catch (e) {
    console.error("An error occurred:", e);
} finally {
    console.log("Loop has ended.");
}