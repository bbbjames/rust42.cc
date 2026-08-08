const http = require("http");
const { execFileSync } = require("child_process");
const { mkdtempSync, writeFileSync, rmSync, readFileSync } = require("fs");
const { join } = require("path");
const { tmpdir } = require("os");
const { randomUUID } = require("crypto");

const PORT = process.env.PORT || 3000;
const sessions = new Map();

function parseBody(req, cb) {
    let body = "";
    req.on("data", chunk => { body += chunk; });
    req.on("end", () => {
        try { cb(null, JSON.parse(body)); }
        catch (e) { cb(e); }
    });
}

function json(res, status, data) {
    res.writeHead(status, {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
    });
    res.end(JSON.stringify(data));
}

function jsonError(res, status, msg) {
    json(res, status, { ok: false, stderr: msg });
}

function buildSource(commands) {
    let src = "fn main() {\n";
    for (const cmd of commands) {
        let code = cmd.code.trim();
        if (!code.endsWith(";") && !code.endsWith("}")) {
            code += ";";
        }
        src += "    " + code.replace(/\n/g, "\n    ") + "\n";
    }
    src += "}\n";
    return src;
}

function runRust(source) {
    const dir = mkdtempSync(join(tmpdir(), "rust-"));
    const srcPath = join(dir, "main.rs");
    const bin = join(dir, "main");

    try {
        writeFileSync(srcPath, source);
        const compileStart = Date.now();
        execFileSync("rustc", [srcPath, "-o", bin], {
            timeout: 15000,
            encoding: "utf8",
            stdio: "pipe",
        });
        const compileMs = Date.now() - compileStart;

        const runStart = Date.now();
        const output = execFileSync(bin, {
            timeout: 5000,
            encoding: "utf8",
            stdio: "pipe",
        });
        const runMs = Date.now() - runStart;

        return { ok: true, stdout: output, compileMs, runMs };
    } catch (e) {
        return {
            ok: false,
            stderr: e.stderr || e.message || String(e),
            exitCode: e.status,
        };
    } finally {
        try { rmSync(dir, { recursive: true }); } catch (_) {}
    }
}

function getSession(id) {
    if (!sessions.has(id)) {
        sessions.set(id, { id, commands: [], nextCommandId: 0 });
    }
    return sessions.get(id);
}

const server = http.createServer((req, res) => {
    if (req.method === "OPTIONS") {
        res.writeHead(204, {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
        });
        return res.end();
    }

    const url = new URL(req.url, `http://localhost:${PORT}`);
    const path = url.pathname;

    if (req.method === "POST" && path === "/session") {
        const id = randomUUID();
        sessions.set(id, { id, commands: [], nextCommandId: 0 });
        return json(res, 201, { sessionId: id });
    }

    if (req.method === "GET" && path.startsWith("/session/")) {
        const sessionId = path.slice("/session/".length);
        const session = getSession(sessionId);
        return json(res, 200, {
            sessionId: session.id,
            commandCount: session.commands.length,
            commands: session.commands,
        });
    }

    if (req.method === "DELETE" && path.startsWith("/session/")) {
        const sessionId = path.slice("/session/".length);
        sessions.delete(sessionId);
        return json(res, 200, { ok: true });
    }

    if (req.method === "POST" && path === "/run") {
        parseBody(req, (err, data) => {
            if (err) return jsonError(res, 400, "invalid json");
            if (!data.code) return jsonError(res, 400, "missing code field");

            const session = getSession(data.sessionId || "default");
            const commandId = session.nextCommandId;
            const commands = [...session.commands, { commandId, code: data.code }];

            const source = buildSource(commands);
            const result = runRust(source);

            result.commandId = commandId;
            if (result.ok) {
                session.nextCommandId++;
                session.commands = commands;
            }
            json(res, result.ok ? 200 : 422, result);
        });
        return;
    }

    if (path === "/health") {
        return json(res, 200, { status: "ok" });
    }

    if (path === "/" || path === "/index.html") {
        try {
            const html = readFileSync("/var/www/index.html", "utf8");
            res.writeHead(200, { "Content-Type": "text/html" });
            res.end(html);
        } catch (_) {
            res.writeHead(200, { "Content-Type": "text/plain" });
            res.end("SPA not deployed yet\n");
        }
        return;
    }

    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("repl-wasm-os runtime-host running\n");
});

server.listen(PORT, () => {
    console.log("listening on :" + PORT);
});