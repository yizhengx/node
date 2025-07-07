// server.js
const http = require('http');
const url = require('url');

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

server.listen(15098, () => {
    console.log('Server listening on http://localhost:3000');
});
