// cocoon demo: native-side preemption of a stuck synchronous loop.
//
// This program spins forever on `global.counter`. It cannot escape the loop on
// its own. The native SIGUSR2 handler (src/node.cc -> SignalCustom ->
// InterruptHandler) reaches into the isolate and increments `global.counter`,
// which releases the loop. The final log lines are the observable proof that
// the interrupt fired and the native state writes took effect.
//
// Run it:
//     ./node cocoon/state.js
// In another terminal, preempt it:
//     kill -USR2 <pid of the node process>
//
// Expected: after the signal, the program prints the final counter and
// "Debug mode: true", then exits.

// Globals the native InterruptHandler reads and writes.
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