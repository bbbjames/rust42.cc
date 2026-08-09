const http = require("http");
const { execFileSync } = require("child_process");
const { mkdtempSync, writeFileSync, rmSync, readFileSync } = require("fs");
const { join } = require("path");
const { tmpdir } = require("os");
const { randomUUID } = require("crypto");
const { WebSocketServer } = require("ws");

const PORT = process.env.PORT || 3000;
const sessions = new Map();
const drawClients = new Set();

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

function broadcastDraw(msg) {
    const raw = JSON.stringify(msg);
    for (const ws of drawClients) {
        if (ws.readyState === 1) ws.send(raw);
    }
}

const DRAW_PRELUDE = `use std::sync::Mutex;
static _BUF: Mutex<Vec<String>> = Mutex::new(Vec::new());
fn _clear() { _BUF.lock().unwrap().push(r#"{"draw":"clear"}"#.into()); }
fn _circle(x: i32, y: i32, radius: i32) { _BUF.lock().unwrap().push(format!(r#"{{"draw":"circle","x":{},"y":{},"radius":{},"r":255,"g":255,"b":255,"a":255,"w":1}}"#, x, y, radius)); }
fn _circle_w(x: i32, y: i32, radius: i32, w: i32) { _BUF.lock().unwrap().push(format!(r#"{{"draw":"circle","x":{},"y":{},"radius":{},"r":255,"g":255,"b":255,"a":255,"w":{}}}"#, x, y, radius, w)); }
fn _circle_color(x: i32, y: i32, radius: i32, r: u8, g: u8, b: u8) { _BUF.lock().unwrap().push(format!(r#"{{"draw":"circle","x":{},"y":{},"radius":{},"r":{},"g":{},"b":{},"a":255,"w":1}}"#, x, y, radius, r, g, b)); }
fn _circle_color_w(x: i32, y: i32, radius: i32, r: u8, g: u8, b: u8, w: i32) { _BUF.lock().unwrap().push(format!(r#"{{"draw":"circle","x":{},"y":{},"radius":{},"r":{},"g":{},"b":{},"a":255,"w":{}}}"#, x, y, radius, r, g, b, w)); }
fn _circle_fill(x: i32, y: i32, radius: i32, r: u8, g: u8, b: u8) { _BUF.lock().unwrap().push(format!(r#"{{"draw":"circleFill","x":{},"y":{},"radius":{},"r":{},"g":{},"b":{},"a":255}}"#, x, y, radius, r, g, b)); }
fn _rect(x: i32, y: i32, w: i32, h: i32, r: u8, g: u8, b: u8) { _BUF.lock().unwrap().push(format!(r#"{{"draw":"rect","x":{},"y":{},"w":{},"h":{},"r":{},"g":{},"b":{},"a":255,"lw":1}}"#, x, y, w, h, r, g, b)); }
fn _rect_w(x: i32, y: i32, w: i32, h: i32, r: u8, g: u8, b: u8, lw: i32) { _BUF.lock().unwrap().push(format!(r#"{{"draw":"rect","x":{},"y":{},"w":{},"h":{},"r":{},"g":{},"b":{},"a":255,"lw":{}}}"#, x, y, w, h, r, g, b, lw)); }
fn _line(x1: i32, y1: i32, x2: i32, y2: i32, r: u8, g: u8, b: u8) { _BUF.lock().unwrap().push(format!(r#"{{"draw":"line","x1":{},"y1":{},"x2":{},"y2":{},"r":{},"g":{},"b":{},"a":255,"w":1}}"#, x1, y1, x2, y2, r, g, b)); }
fn _line_w(x1: i32, y1: i32, x2: i32, y2: i32, r: u8, g: u8, b: u8, w: i32) { _BUF.lock().unwrap().push(format!(r#"{{"draw":"line","x1":{},"y1":{},"x2":{},"y2":{},"r":{},"g":{},"b":{},"a":255,"w":{}}}"#, x1, y1, x2, y2, r, g, b, w)); }
fn _pixel(x: i32, y: i32, r: u8, g: u8, b: u8) { _BUF.lock().unwrap().push(format!(r#"{{"draw":"pixel","x":{},"y":{},"r":{},"g":{},"b":{},"a":255}}"#, x, y, r, g, b)); }
fn _json_str(s: &str) -> String { let mut o=String::new(); o.push(34u8 as char); for c in s.chars() { match c as u32 { 34=>{o.push(92u8 as char);o.push(34u8 as char);} 92=>{o.push(92u8 as char);o.push(92u8 as char);} 10=>{o.push(92u8 as char);o.push(110u8 as char);} 13=>{o.push(92u8 as char);o.push(114u8 as char);} 9=>{o.push(92u8 as char);o.push(116u8 as char);} _=>o.push(c), } } o.push(34u8 as char); o }
fn _text(x: i32, y: i32, msg: &str, r: u8, g: u8, b: u8) { _BUF.lock().unwrap().push(format!(r#"{{"draw":"text","x":{},"y":{},"msg":{},"r":{},"g":{},"b":{},"a":255}}"#, x, y, _json_str(msg), r, g, b)); }
`;

function buildSource(commands) {
    let src = DRAW_PRELUDE + "\nfn main() {\n";
    for (const cmd of commands) {
        let code = cmd.code.trim();
        if (!code.endsWith(";") && !code.endsWith("}")) {
            code += ";";
        }
        src += "    " + code.replace(/\n/g, "\n    ") + "\n";
    }
    src += "    let _b = _BUF.lock().unwrap();\n";
    src += "    if !_b.is_empty() { println!(\"[{}]\", _b.join(\",\")); }\n";
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

        const drawCommands = [];
        const textLines = [];

        for (const line of output.split("\n")) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            if (trimmed.startsWith("[")) {
                try {
                    const arr = JSON.parse(trimmed);
                    if (Array.isArray(arr)) drawCommands.push(...arr);
                    else textLines.push(trimmed);
                } catch (_) { textLines.push(trimmed); }
            } else {
                textLines.push(trimmed);
            }
        }

        if (drawCommands.length > 0) {
            broadcastDraw({ type: "batch", commands: drawCommands });
        }

        return { ok: true, stdout: textLines.join("\n") + "\n", compileMs, runMs };
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

const wss = new WebSocketServer({ server });

wss.on("connection", (ws) => {
    drawClients.add(ws);
    ws.on("close", () => drawClients.delete(ws));
});

server.listen(PORT, () => {
    console.log("listening on :" + PORT);
});