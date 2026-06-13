// components/conversations/SmartConversationView.tsx
'use client'

interface SmartConversationViewProps {
  conversation: any
}

const SmartConversationView = ({ conversation }: SmartConversationViewProps) => {
  const intelligence = conversation.intelligence
  
  if (!intelligence) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        <div className="text-4xl mb-4">📄</div>
        <p>No smart extraction available for this conversation</p>
      </div>
    )
  }

  const getOutcomeColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'handed_off': return 'bg-orange-100 text-orange-800'
      case 'challenging': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-muted text-foreground'
    }
  }

  const handleSave = async () => {
    const chat = {
      title: conversation.title,
      summary: conversation.intelligence.summary,
      outcome: conversation.intelligence.outcome,
      extractedData: conversation.intelligence.extractedData,
      stats: conversation.intelligence.stats
    };

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat })
      });

      const data = await res.json();
      if (data.success && data.url) {
        alert(`✅ Conversation saved!\nLink: ${data.url}`);
      } else {
        alert('❌ Failed to save conversation.');
      }
    } catch (err) {
      console.error(err);
      alert('❌ Error saving conversation.');
    }
  };

  return (
    <>
      <div className="mb-4">
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          💾 Save This Conversation
        </button>
      </div>

      <div className="space-y-6">
        {/* Session Overview */}
        <div className="bg-background p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-foreground">{conversation.title}</h2>
            <span className={`px-3 py-1 text-sm font-medium rounded-full ${getOutcomeColor(intelligence.outcome.status)}`}>
              {intelligence.outcome.status}
            </span>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{intelligence.stats.totalMessages}</div>
              <div className="text-sm text-muted-foreground">Messages</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{intelligence.stats.directionChanges}</div>
              <div className="text-sm text-muted-foreground">Direction Changes</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{intelligence.stats.problemsEncountered}</div>
              <div className="text-sm text-muted-foreground">Problems</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{intelligence.stats.filesModified}</div>
              <div className="text-sm text-muted-foreground">Files Modified</div>
            </div>
          </div>
          
          <p className="text-muted-foreground text-sm bg-muted/50 p-3 rounded">
            {intelligence.summary}
          </p>
        </div>

        {/* Key Decisions */}
        {intelligence.extractedData.keyDecisions.length > 0 && (
          <div className="bg-background p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center">
              🎯 Direction Changes & Decisions
            </h3>
            <div className="space-y-3">
              {intelligence.extractedData.keyDecisions.map((decision: any, index: number) => (
                <div key={index} className="border-l-4 border-blue-500 pl-4 bg-blue-50 p-3 rounded-r">
                  <p className="text-foreground">{decision.decision}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(decision.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Files Modified */}
        {intelligence.extractedData.filesModified.length > 0 && (
          <div className="bg-background p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center">
              📁 Files Worked On
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {intelligence.extractedData.filesModified.map((file: any, index: number) => (
                <div key={index} className="bg-muted/50 p-4 rounded-lg border-l-4 border-green-500">
                  <div className="font-medium text-foreground">{file.file}</div>
                  <div className="text-sm text-muted-foreground">{file.purpose}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Problems & Solutions */}
        {intelligence.extractedData.problems.length > 0 && (
          <div className="bg-background p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center">
              🚨 Issues Encountered
            </h3>
            <div className="space-y-3">
              {intelligence.extractedData.problems.map((problem: any, index: number) => {
                const solution = intelligence.extractedData.solutions[index]
                return (
                  <div key={index} className="border rounded-lg p-4 bg-red-50">
                    <div className="mb-2">
                      <span className="text-red-600 font-medium">Issue #{problem.attemptNumber}:</span>
                      <p className="text-foreground mt-1">{problem.issue}</p>
                    </div>
                    {solution && (
                      <div className="mt-3 p-3 bg-green-50 rounded border-l-4 border-green-500">
                        <span className="text-green-600 font-medium">Solution:</span>
                        <p className="text-foreground/80 mt-1 text-sm">{solution.solution}</p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Code Changes */}
        {intelligence.extractedData.codeChanges.length > 0 && (
          <div className="bg-background p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center">
              💻 Code Changes Made
            </h3>
            <div className="space-y-2">
              {intelligence.extractedData.codeChanges.map((change: any, index: number) => (
                <div key={index} className="flex items-start space-x-3 p-3 bg-muted/50 rounded-lg">
                  <span className={`px-2 py-1 text-xs font-medium rounded ${
                    change.action === 'add' ? 'bg-green-100 text-green-800' :
                    change.action === 'update' ? 'bg-blue-100 text-blue-800' :
                    'bg-muted text-foreground'
                  }`}>
                    {change.action}
                  </span>
                  <div className="flex-1">
                    <p className="text-foreground text-sm">{change.details}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Final Outcome */}
        <div className="bg-background p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-foreground mb-4">📋 Session Outcome</h3>
          <div className={`p-4 rounded-lg ${getOutcomeColor(intelligence.outcome.status)}`}>
            <div className="font-medium">Status: {intelligence.outcome.status}</div>
            <div className="text-sm mt-1">{intelligence.outcome.reason}</div>
          </div>
        </div>
      </div>
    </>
  )
}

export default SmartConversationView