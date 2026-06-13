// lib/utils/fileParser.js
import { extractIntelligenceFromConversation } from './smartParser'

export const parseConversationFile = (file, content) => {
  try {
    const data = JSON.parse(content)
    
    // Handle array of messages (your ChatGPT format)
    if (Array.isArray(data) && data[0]?.role && (data[0]?.message || data[0]?.content)) {
      return [parseSmartConversation(data, file.name)]
    }
    
    // Handle array of conversations (ChatGPT export format)
    if (Array.isArray(data)) {
      return data.map(conversation => parseConversation(conversation, 'chatgpt'))
    }
    
    // Handle single conversation object
    if (data.mapping || data.messages) {
      return [parseConversation(data, detectSource(data))]
    }
    
    // Handle other formats
    return [parseConversation(data, 'unknown')]
    
  } catch (error) {
    console.error('Error parsing file:', error)
    throw new Error(`Invalid file format: ${error.message}`)
  }
}

const parseSmartConversation = (messages, filename) => {
  // Extract intelligence using our smart parser
  const intelligence = extractIntelligenceFromConversation(messages, filename)
  
  // Convert to our standard format but with intelligence
  return {
    title: filename.replace('.json', '').replace(/_/g, ' '),
    messages: messages.map(msg => ({
      role: msg.role,
      content: msg.message || msg.content,
      timestamp: msg.timestamp
    })),
    source: 'chatgpt-custom',
    created_at: messages[0]?.timestamp || new Date().toISOString(),
    message_count: messages.length,
    content: { rawMessages: messages },
    
    // Add the extracted intelligence
    intelligence: intelligence,
    hasIntelligence: true
  }
}

const parseConversation = (conversationData, source) => {
  let title = 'Untitled Conversation'
  let messages = []
  let createTime = new Date().toISOString()
  
  try {
    // Parse ChatGPT format
    if (conversationData.mapping) {
      title = conversationData.title || 'ChatGPT Conversation'
      createTime = conversationData.create_time 
        ? new Date(conversationData.create_time * 1000).toISOString()
        : new Date().toISOString()
      
      // Extract messages from mapping
      messages = extractMessagesFromMapping(conversationData.mapping)
    }
    
    // Parse Claude format (if it has messages array)
    else if (conversationData.messages && Array.isArray(conversationData.messages)) {
      title = conversationData.name || conversationData.title || 'Claude Conversation'
      messages = conversationData.messages.map(msg => ({
        role: msg.role || (msg.author && msg.author.role) || 'user',
        content: msg.content || msg.text || '',
        timestamp: msg.timestamp || msg.created_at
      }))
    }
    
    // Parse other formats
    else if (conversationData.conversation && Array.isArray(conversationData.conversation)) {
      title = conversationData.title || 'Imported Conversation'
      messages = conversationData.conversation.map(msg => ({
        role: msg.role || 'user',
        content: msg.content || msg.message || '',
        timestamp: msg.timestamp
      }))
    }
    
    // Fallback for unknown formats
    else {
      title = conversationData.title || 'Unknown Format'
      // Try to extract any text content as a single message
      const content = JSON.stringify(conversationData, null, 2)
      messages = [{
        role: 'system',
        content: `Imported data: ${content.substring(0, 500)}...`,
        timestamp: new Date().toISOString()
      }]
    }

    return {
      title,
      messages,
      source,
      // CRITICAL: Must extract platform from JSON or it defaults to "unknown"
      // This enables FileUpload.tsx to detect the correct platform value
      platform: conversationData.platform || source,
      url: conversationData.url,
      created_at: createTime,
      message_count: messages.length,
      content: conversationData // Keep original data for reference
    }
  } catch (error) {
    console.error('Error parsing conversation:', error)
    // Return a fallback conversation
    return {
      title: 'Error Parsing Conversation',
      messages: [{
        role: 'system',
        content: `Error parsing conversation: ${error.message}`,
        timestamp: new Date().toISOString()
      }],
      source: source,
      created_at: new Date().toISOString(),
      message_count: 1,
      content: conversationData
    }
  }
}

const extractMessagesFromMapping = (mapping) => {
  const messages = []
  
  try {
    // Get all message objects from mapping
    const messageEntries = Object.values(mapping || {}).filter(entry => 
      entry && 
      entry.message && 
      entry.message.author && 
      entry.message.content
    )
    
    // Sort by create_time if available
    messageEntries.sort((a, b) => {
      const timeA = (a.message && a.message.create_time) || 0
      const timeB = (b.message && b.message.create_time) || 0
      return timeA - timeB
    })
    
    // Convert to our message format
    messageEntries.forEach(entry => {
      if (!entry.message) return
      
      const msg = entry.message
      const role = (msg.author && msg.author.role) || 'user'
      
      // Handle content that might be in different formats
      let content = ''
      if (msg.content && msg.content.parts && Array.isArray(msg.content.parts)) {
        content = msg.content.parts.join('\n')
      } else if (msg.content && typeof msg.content === 'string') {
        content = msg.content
      } else if (msg.content && msg.content.text) {
        content = msg.content.text
      }
      
      // Only add messages with actual content
      if (content && content.trim()) {
        messages.push({
          role: role,
          content: content.trim(),
          timestamp: msg.create_time 
            ? new Date(msg.create_time * 1000).toISOString()
            : undefined
        })
      }
    })
  } catch (error) {
    console.error('Error extracting messages from mapping:', error)
  }
  
  return messages
}

const detectSource = (data) => {
  if (data.mapping) return 'chatgpt'
  if (data.messages && data.model) return 'claude'
  if (data.conversation) return 'bard'
  return 'unknown'
}