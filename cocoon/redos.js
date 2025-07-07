// cocoon motivating scenario: a ReDoS (regular-expression denial of service).
//
// The regex below is prone to catastrophic backtracking. A single crafted
// request (a long run of letters followed by a non-letter) makes `regex.test`
// run for seconds/minutes, blocking the event loop so the server handles no
// other requests. This is the real case the SIGUSR2 preemption mechanism is
// meant to defend against -- but note it is NOT yet wired to the interrupt
// handler (state.js is the only program the handler currently acts on). A key
// open question is whether RequestInterrupt can even break out of time spent
// inside V8's native regex engine; see cocoon/HANDOFF.md.
//
// Run it:
//     ./node cocoon/redos.js
// Then send a pathological request:
//     curl "http://localhost:15098/?input=aaaaaaaaaaaaaaaaaaaaaaaaaaaa!"
const http = require('http');
const url = require('url');

const PORT = 15098;

const server = http.createServer((req, res) => {
    const myURL = new URL(req.url, `http://${req.headers.host}`);
    const input = myURL.searchParams.get('input') || '';

    // A dangerous regex prone to catastrophic backtracking
    const regex = /^([a-zA-Z]+)+$/;

    console.log(`Testing input of length ${input.length}`);

    try {
        const start = Date.now();
        const result = regex.test(input);
        const elapsed = Date.now() - start;

        res.writeHead(200, {'Content-Type': 'application/json'});
        res.end(JSON.stringify({
            inputLength: input.length,
            match: result,
            elapsedMs: elapsed
        }));
    } catch (err) {
        res.writeHead(500, {'Content-Type': 'text/plain'});
        res.end('Error: ' + err.message);
    }
});

server.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
});
