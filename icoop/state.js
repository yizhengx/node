// Variables we'll modify from C++
global.counter = 0;
global.settings = { debugMode: false };

// Long-running loop (interrupt will trigger during this)
function run() {
  while (global.counter < 1) {
    // Simulate work
    for (let i = 0; i < 1000; i++) {}
  }
  console.log("Final counter:", global.counter);
  console.log("Debug mode:", global.settings.debugMode);
}

console.log("Starting...");
run();