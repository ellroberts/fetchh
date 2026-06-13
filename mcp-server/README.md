# ThreadCub MCP Server

Connects Claude Desktop to your ThreadCub account so you can save conversations, save highlights, and search your history directly from Claude.

## Tools

| Tool | What it does |
|---|---|
| `save_conversation` | Save the current conversation to ThreadCub |
| `save_highlight` | Save a highlighted excerpt to ThreadCub |
| `search_history` | Search your saved conversations |
| `get_highlights` | Retrieve your saved highlights |

## Setup

### 1. Get your ThreadCub token

Log in at [threadcub.com](https://threadcub.com) and go to **Settings** → copy your API token.

### 2. Install dependencies

```bash
cd mcp-server
npm install
```

### 3. Add to Claude Desktop

Edit your `claude_desktop_config.json` (found at `~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "threadcub": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-server/index.js"],
      "env": {
        "THREADCUB_TOKEN": "your-token-here"
      }
    }
  }
}
```

Replace `/absolute/path/to/mcp-server/index.js` with the actual path on your machine.

### 4. Restart Claude Desktop

The ThreadCub tools will appear in Claude's tool picker after restart.
