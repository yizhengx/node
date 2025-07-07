# cocoon — preempting JS execution from native code

Experimental changes (branch `v24.3.1-scheduling`) that let you **preempt a running JavaScript task from the C++ side** by sending the Node process a signal.
The native handler then runs *inside* the V8 isolate and can inspect, mutate, or abort what the JS is doing — even while it is stuck in a tight synchronous loop that never yields to the event loop (e.g. under a regex attack).

Research context: the paper at https://dl.acm.org/doi/10.1145/3764860.3768329 — read it first.
This branch is an early spike toward interrupting/preempting JS from the native runtime instead of relying on the JS to yield cooperatively.

> **Status: proof-of-concept.**
> It compiles and the mechanism works, but it is exploratory — `[cocoon]`-prefixed trace logging, a demo keyed to specific globals, and a blunt abort path.
> "The mechanism works; now build the real thing."

---

## Build

```bash
./configure
make -j4             # build the ./node binary
```

The build produces `./node` in the repo root.

---

## Triggering a preemption (`COCOON_INTERRUPT`)

The current exploratory work triggers a preemption with a POSIX signal (`SIGUSR2`): the native handler runs *inside* the V8 isolate at the next V8 safe point, where it is safe to touch JS state.
What it does when the signal arrives is selected by the **`COCOON_INTERRUPT`** environment variable:

| `COCOON_INTERRUPT` | Handler action | Effect on a *running* regex | Purpose |
|---|---|---|---|
| `mutate` (default / unset) | writes `global.counter` / `global.settings` | none — the match keeps running | the `state.js` demo |
| `throw` | schedules a JS exception (`isolate->ThrowError`) | **does not abort** it; the exception surfaces only once the match returns on its own | shows a thrown exception is deferred |
| `terminate` | `isolate->TerminateExecution()` | **aborts it immediately** (~5–10 ms) | recovers a blocked service |

---

## Demo 1 — shared state between the preemption and JS (`state.js`)

Because the handler runs inside the isolate, it shares state with the normal JavaScript context and can read or mutate that state safely while JS is mid-execution.
`cocoon/state.js` spins forever on `global.counter` and cannot exit on its own:

```bash
# terminal 1
./node cocoon/state.js
# prints "Starting..." then hangs in the loop

# terminal 2 — find the pid and preempt it
kill -USR2 $(pgrep -f 'node cocoon/state.js')
```

Expected output in terminal 1 (the `[cocoon]` lines are on stderr):

```
[cocoon] SignalCustom: received signal 12
[cocoon] SignalCustom: requesting V8 interrupt (InContext=true)
[cocoon] InterruptHandler: running inside isolate (InContext=true, mode=mutate)
[cocoon] InterruptHandler: bumped global.counter, set global.settings.debugMode=true
Final counter: 1
Debug mode: true
```

Proof the native handler ran mid-execution: it bumped `global.counter` (releasing the loop) and set `global.settings.debugMode = true`.
Node's startup also emits a few `[cocoon]` markers on stderr — filter with `2>/dev/null` or `grep cocoon`.

---

## Demo 2 — recover a ReDoS-blocked server (`redos.js`)

`cocoon/redos.js` is an HTTP server (port **15098**) using a catastrophic-backtracking regex `^([a-zA-Z]+)+$`.
One crafted request pins the event loop for a long time (ReDoS) — the realistic attack the preemption mechanism is meant to defend against.

Start it in `terminate` mode:

```bash
# terminal 1
COCOON_INTERRUPT=terminate ./node cocoon/redos.js
```

Launch an attack that pins the event loop, then recover it with a signal:

```bash
# terminal 2 — a catastrophic-backtracking request that hangs the server
curl "http://localhost:15098/?input=$(printf 'a%.0s' {1..34})!" &
# while it hangs, a normal request is blocked too:
#   curl "http://localhost:15098/?input=hello"

# recover: the signal aborts the stuck match
kill -USR2 $(pgrep -f 'node cocoon/redos.js')
```

In `terminate` mode the healthy request is served again within **milliseconds**, the process stays up, and the attacking request is dropped with no response.
In the default `mutate` mode (and in `throw`) the server stays blocked until the attack regex finishes on its own — **no recovery**.

> Verified on Node 24 / V8 13.6.233: `terminate` aborts the match on both the regex interpreter and the compiled (JIT) path, so `--regexp-interpret-all` is **not** required.
> Caveat: `terminate` is uncatchable — it bypasses the request's `try/catch` *and* `finally`, so the dropped request runs no cleanup and app state can be left inconsistent.

---

## Files

| File | What it is |
|---|---|
| [`state.js`](state.js) | Demo 1 — spins on `global.counter`, released by the interrupt (`mutate` mode). |
| [`redos.js`](redos.js) | Demo 2 — the ReDoS attack server (port 15098); recoverable via `COCOON_INTERRUPT=terminate`. |
| [`test.js`](test.js) | Scratchpad for ad-hoc interrupt experiments; not a clean demo. |

Native changes live in [`src/node.cc`](../src/node.cc) — `SignalCustom` (the SIGUSR2 handler), `InterruptHandler` (the `mutate`/`throw`/`terminate` modes), and the `SIGUSR2` registration in `PlatformInit`.
The rest is one-line `[cocoon]` startup/loop tracing in [`src/api/embed_helpers.cc`](../src/api/embed_helpers.cc), [`src/api/environment.cc`](../src/api/environment.cc), [`src/node_main.cc`](../src/node_main.cc), and [`src/node_main_instance.cc`](../src/node_main_instance.cc).
No vendored dependency is modified.
