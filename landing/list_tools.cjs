const { spawn } = require('child_process');

const mcp = spawn('npx.cmd', ['lightswind-ui-mcp'], { stdio: ['pipe', 'pipe', 'inherit'], shell: true });

let output = '';

mcp.stdout.on('data', (data) => {
  output += data.toString();
  try {
    const lines = output.split('\n');
    for (let i = 0; i < lines.length - 1; i++) {
      const msg = JSON.parse(lines[i]);
      console.log(JSON.stringify(msg, null, 2));
      if (msg.id === 1) {
        process.exit(0);
      }
    }
    output = lines[lines.length - 1];
  } catch (e) {
    // Ignore parse errors until we have a full line
  }
});

const req = {
  jsonrpc: "2.0",
  id: 1,
  method: "tools/list",
  params: {}
};

mcp.stdin.write(JSON.stringify(req) + '\n');
