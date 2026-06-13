// lib/utils/smartParser.js

export const extractIntelligenceFromConversation = (messages, title = "Conversation") => {
  const decisions = []
  const filesModified = []
  const problems = []
  const solutions = []
  const codeChanges = []
  
  let problemCount = 0
  let directionChanges = 0
  
  for (let i = 0; i < messages.length; i++) {
    const message = messages[i]
    const content = message.content || message.message || ''
    const role = message.role
    
    // Track direction changes and decisions
    if (role === 'user') {
      if (content.toLowerCase().includes("let's try") || 
          content.toLowerCase().includes("could we try") || 
          content.toLowerCase().includes("not sure i like")) {
        decisions.push({
          type: 'direction_change',
          decision: content,
          timestamp: message.timestamp
        })
        directionChanges++
      }
      
      // Track problems/frustrations
      if (content.toLowerCase().includes("not right") || 
          content.toLowerCase().includes("still not") ||
          content.toLowerCase().includes("still ") ||
          content.toLowerCase().includes("not sure")) {
        problems.push({
          issue: content,
          timestamp: message.timestamp,
          attemptNumber: problemCount + 1
        })
        problemCount++
      }
    }
    
    // Track file mentions and code changes
    if (role === 'assistant') {
      // Extract file names
      const fileMatches = content.match(/(\w+\.(jsx?|tsx?|css|js))/g)
      if (fileMatches) {
        fileMatches.forEach(file => {
          if (!filesModified.some(f => f.file === file)) {
            filesModified.push({
              file: file,
              purpose: extractPurpose(content),
              timestamp: message.timestamp
            })
          }
        })
      }
      
      // Track solutions and code changes
      if (content.toLowerCase().includes("updated") || 
          content.toLowerCase().includes("added") ||
          content.toLowerCase().includes("changed")) {
        codeChanges.push({
          action: extractAction(content),
          details: content.substring(0, 100) + "...",
          timestamp: message.timestamp
        })
        
        // Match solutions to previous problems
        if (problems.length > solutions.length) {
          solutions.push({
            problem: problems[problems.length - 1].issue,
            solution: content,
            timestamp: message.timestamp
          })
        }
      }
    }
  }
  
  // Determine final outcome
  const finalMessage = messages[messages.length - 1]?.content || ''
  const outcome = determineFinalOutcome(finalMessage, problems.length)
  
  return {
    title,
    summary: `Session with ${directionChanges} direction changes, ${problemCount} issues encountered, ${filesModified.length} files modified`,
    outcome,
    stats: {
      totalMessages: messages.length,
      directionChanges,
      problemsEncountered: problemCount,
      filesModified: filesModified.length,
      solutionsProvided: solutions.length
    },
    extractedData: {
      keyDecisions: decisions,
      filesModified,
      problems,
      solutions,
      codeChanges
    }
  }
}

// Helper functions
const extractPurpose = (content) => {
  if (content.toLowerCase().includes("add") || content.toLowerCase().includes("added")) {
    return "Added new functionality"
  }
  if (content.toLowerCase().includes("update") || content.toLowerCase().includes("updated")) {
    return "Modified existing code"
  }
  if (content.toLowerCase().includes("style") || content.toLowerCase().includes("background") || content.toLowerCase().includes("padding")) {
    return "Styling changes"
  }
  return "Code modification"
}

const extractAction = (content) => {
  if (content.toLowerCase().includes("updated")) return "update"
  if (content.toLowerCase().includes("added")) return "add"
  if (content.toLowerCase().includes("removed")) return "remove"
  return "modify"
}

const determineFinalOutcome = (finalMessage, problemCount) => {
  if (finalMessage.toLowerCase().includes("getting someone else") || 
      finalMessage.toLowerCase().includes("give up")) {
    return {
      status: "handed_off",
      reason: "Passed to another developer",
      satisfaction: "frustrated"
    }
  }
  
  if (problemCount > 3) {
    return {
      status: "challenging",
      reason: "Multiple issues encountered",
      satisfaction: "mixed"
    }
  }
  
  return {
    status: "completed",
    reason: "Session completed",
    satisfaction: "resolved"
  }
}