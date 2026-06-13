import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import fetch from 'node-fetch'

const TOKEN = process.env.THREADCUB_TOKEN
if (!TOKEN) {
  console.error(
    'ThreadCub MCP server: THREADCUB_TOKEN is not set. Get your token from threadcub.com/settings.'
  )
  process.exit(1)
}

const BASE_URL = 'https://threadcub.com'

function authHeaders() {
  return {
    Authorization: `Bearer ${TOKEN}`,
    'Content-Type': 'application/json',
  }
}

const server = new Server(
  { name: 'threadcub', version: '1.0.0' },
  { capabilities: { tools: {} } }
)

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'save_conversation',
      description: 'Save the current conversation to ThreadCub',
      inputSchema: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Title for the conversation' },
          messages: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                role: { type: 'string' },
                content: { type: 'string' },
              },
              required: ['role', 'content'],
            },
            description: 'Array of conversation messages',
          },
          platform: {
            type: 'string',
            description: 'Platform identifier',
            default: 'claude',
          },
        },
        required: ['title', 'messages'],
      },
    },
    {
      name: 'save_highlight',
      description: 'Save a highlight or excerpt to ThreadCub',
      inputSchema: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'The text to highlight' },
          source_title: { type: 'string', description: 'Title of the source' },
          notes: { type: 'string', description: 'Optional notes' },
          tags: {
            type: 'array',
            items: { type: 'string' },
            description: 'Optional tags',
          },
          conversation_id: { type: 'string', description: 'Optional ID of the conversation this highlight belongs to' },
        },
        required: ['text'],
      },
    },
    {
      name: 'search_history',
      description: 'Search your ThreadCub conversation history',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query' },
        },
        required: ['query'],
      },
    },
    {
      name: 'get_highlights',
      description: 'Get your saved highlights from ThreadCub',
      inputSchema: {
        type: 'object',
        properties: {
          conversation_id: {
            type: 'string',
            description: 'Optional conversation ID to filter highlights',
          },
        },
      },
    },
    {
      name: 'save_action',
      description: 'Save an action item to ThreadCub',
      inputSchema: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'The action item text' },
          notes: { type: 'string', description: 'Additional notes' },
          tags: {
            type: 'array',
            items: { type: 'string' },
            description: 'Optional tags',
          },
          conversation_id: { type: 'string', description: 'Optional ID of the conversation this action belongs to' },
        },
        required: ['text'],
      },
    },
    {
      name: 'save_reminder',
      description: 'Save a reminder to ThreadCub',
      inputSchema: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'The reminder text' },
          notes: { type: 'string', description: 'Additional notes' },
          tags: {
            type: 'array',
            items: { type: 'string' },
            description: 'Optional tags',
          },
          conversation_id: { type: 'string', description: 'Optional ID of the conversation this reminder belongs to' },
        },
        required: ['text'],
      },
    },
    {
      name: 'get_context',
      description: 'Search ThreadCub history and return relevant context for the current topic',
      inputSchema: {
        type: 'object',
        properties: {
          topic: { type: 'string', description: 'The topic or subject to find context for' },
        },
        required: ['topic'],
      },
    },
  ],
}))

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params

  try {
    if (name === 'save_conversation') {
      const { title, messages, platform = 'claude' } = args
      const res = await fetch(`${BASE_URL}/api/conversations/save`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          title,
          conversationData: { messages },
          platform,
          capture_method: 'mcp',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
      return {
        content: [{ type: 'text', text: `Conversation saved. ID: ${data.conversationId ?? 'unknown'}` }],
      }
    }

    if (name === 'save_highlight') {
      const { text, source_title, notes, tags, conversation_id } = args
      const res = await fetch(`${BASE_URL}/api/highlights`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          highlighted_text: text,
          source_url: 'claude://desktop',
          source_platform: 'claude',
          source_title: source_title ?? null,
          notes: notes ?? '',
          tags: tags ?? [],
          conversation_id: conversation_id ?? null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
      return {
        content: [{ type: 'text', text: `Highlight saved. ID: ${data.id ?? 'unknown'}` }],
      }
    }

    if (name === 'search_history') {
      const { query } = args
      const url = new URL(`${BASE_URL}/api/search`)
      url.searchParams.set('q', query)
      const res = await fetch(url.toString(), { headers: authHeaders() })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
      const results = data.results ?? []
      return {
        content: [{ type: 'text', text: JSON.stringify(results, null, 2) }],
      }
    }

    if (name === 'get_highlights') {
      const { conversation_id } = args ?? {}
      const url = new URL(`${BASE_URL}/api/highlights`)
      if (conversation_id) url.searchParams.set('conversation_id', conversation_id)
      const res = await fetch(url.toString(), { headers: authHeaders() })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
      const highlights = data.highlights ?? []
      return {
        content: [{ type: 'text', text: JSON.stringify(highlights, null, 2) }],
      }
    }

    if (name === 'save_action') {
      const { text, notes, tags, conversation_id } = args
      const res = await fetch(`${BASE_URL}/api/action-items`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          title: text,
          detail: notes ?? '',
          tags: tags ?? [],
          source_conversation_ids: conversation_id ? [conversation_id] : [],
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
      return {
        content: [{ type: 'text', text: `Action item saved. ID: ${data.id ?? 'unknown'}` }],
      }
    }

    if (name === 'save_reminder') {
      const { text, notes, tags, conversation_id } = args
      const res = await fetch(`${BASE_URL}/api/reminder-items`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          title: text,
          detail: notes ?? '',
          tags: tags ?? [],
          source_conversation_ids: conversation_id ? [conversation_id] : [],
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
      return {
        content: [{ type: 'text', text: `Reminder saved. ID: ${data.id ?? 'unknown'}` }],
      }
    }

    if (name === 'get_context') {
      const { topic } = args
      const url = new URL(`${BASE_URL}/api/search`)
      url.searchParams.set('q', topic)
      const res = await fetch(url.toString(), { headers: authHeaders() })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
      const results = (data.results ?? []).slice(0, 5)
      const formatted = results
        .map((r, i) => {
          const snippet = r.summary ? r.summary.slice(0, 200) : ''
          return `${i + 1}. ${r.title ?? 'Untitled'} [${r.platform ?? 'unknown'}]\n   ${snippet}`
        })
        .join('\n\n')
      return {
        content: [
          {
            type: 'text',
            text: `Relevant context from your ThreadCub history:\n\n${formatted || 'No results found.'}`,
          },
        ],
      }
    }

    throw new Error(`Unknown tool: ${name}`)
  } catch (err) {
    return {
      content: [{ type: 'text', text: `Error: ${err.message}` }],
      isError: true,
    }
  }
})

const transport = new StdioServerTransport()
await server.connect(transport)
