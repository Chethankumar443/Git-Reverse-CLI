const { spawn } = require('child_process');

const toolName = process.argv[2];
const toolArgs = JSON.parse(process.argv[3] || '{}');

const mcp = spawn('npx.cmd', ['lightswind-ui-mcp'], { stdio: ['pipe', 'pipe', 'inherit'], shell: true });

let output = '';

mcp.stdout.on('data', (data) => {
  output += data.toString();
  try {
    const lines = output.split('\n');
    for (let i = 0; i < lines.length - 1; i++) {
      if (!lines[i].startsWith('{')) continue; // skip any prefix logs like ✅ Lightswind MCP Server running
      const msg = JSON.parse(lines[i]);
      if (msg.id === 1) {
        console.log(JSON.stringify(msg.result, null, 2));
        if (msg.error) console.error(msg.error);
        process.exit(0);
      }
    }
    output = lines[lines.length - 1];
  } catch (e) {
    // Ignore parse errors
  }
});

const req = {
  jsonrpc: "2.0",
  id: 1,
  method: "tools/call",
  params: {
    name: toolName,
    arguments: toolArgs
  }
};

mcp.stdin.write(JSON.stringify(req) + '\n');
