
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
        // if (i == -1) {
        //     console.log("Starting the loop");
        // }
        // i = increment(i);
        // i = Math.floor(i / (i + 1));
        // i = couting_from_zero();
        // console.log(`Current value of i: ${i}`);
        // couting_from_zero();
        if (global.i % 1000000 === 0) {
            global.i = 0;
        }
    }
} catch (e) {
    console.error("An error occurred:", e);
} finally {
    console.log("Loop has ended.");
}