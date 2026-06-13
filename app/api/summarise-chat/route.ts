import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Simple in-memory cache for development (use Redis/DB in production)
const summaryCache = new Map<string, any>();

// Generate cache key from chat content
function generateCacheKey(chat: string[], structured: boolean): string {
  const content = chat.join('').slice(0, 100); // First 100 chars
  const hash = content.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  return `${Math.abs(hash)}_${structured ? 'struct' : 'summary'}`;
}

interface SectionItem {
  heading: string;
  description: string;
  items: string[];
  priority: string | null;
}

export async function POST(request: NextRequest) {
  try {
    const { chat, structured } = await request.json();

    if (!chat || !Array.isArray(chat)) {
      return NextResponse.json({ error: 'Invalid chat data' }, { status: 400 });
    }

    // Check cache first
    const cacheKey = generateCacheKey(chat, structured);
    if (summaryCache.has(cacheKey)) {
      console.log('Returning cached summary');
      return NextResponse.json(summaryCache.get(cacheKey));
    }

    const chatContent = chat.join('\n\n');

    if (structured) {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini', // 🎯 Switched to cheaper model (20x cost reduction!)
        messages: [
          {
            role: 'system',
            content: `You are an expert project analyst who creates comprehensive, actionable structured summaries from conversation data.

            CRITICAL INSTRUCTIONS:
            - Respond with ONLY a valid JSON array
            - No markdown, explanations, or text outside the JSON
            - Each section must be relevant and contain specific, actionable information
            - Focus on extracting concrete actions, decisions, and outcomes
            
            JSON structure (array of objects):
            {
              "heading": "Section Title",
              "description": "Why this section matters",
              "items": ["Specific action or outcome 1", "Specific action or outcome 2"],
              "priority": "High|Medium|Low"
            }

            CONTENT QUALITY RULES:
            - Extract only concrete, specific information (not vague statements)
            - Distinguish between completed actions vs. planned actions
            - Include technical details when relevant
            - Use clear, professional language
            - Every item should be actionable or measurable`
          },
          {
            role: 'user',
            content: `Analyze this conversation and create a structured summary following these guidelines:

            REQUIRED SECTIONS (adapt titles to fit the actual content):
            1. **Project Context** - What was the goal? Who was involved? What was the scope?
            2. **Technical Implementation** - What was built, modified, or configured? Include specific technologies/files.
            3. **Completed Work** - What was successfully delivered or accomplished?
            4. **Current Challenges** - What issues exist? What's not working? What needs fixing?
            5. **Immediate Next Steps** - What needs to happen next? Who should do what?
            6. **Future Considerations** - Longer-term items, improvements, or dependencies.

            CONTENT EXTRACTION RULES:
            - Be specific about file names, technologies, and technical details
            - Distinguish between "User requested X" vs "Assistant delivered X"
            - Include exact quotes for important decisions or requirements
            - Note any unresolved questions or ambiguities
            - Priority should reflect urgency and business impact

            Conversation to analyze:
            ${chatContent}`
          }
        ],
        temperature: 0.2, // Lower temperature for more consistent output
        max_tokens: 2500, // Increased for more detailed summaries
      });

      const content = completion.choices[0]?.message?.content?.trim();
      if (!content) {
        return NextResponse.json({ error: 'No response from OpenAI' }, { status: 500 });
      }

      console.log('Raw AI response:', content);

      try {
        // Clean the response - remove any potential markdown code blocks
        let cleanedContent = content;
        if (content.includes('```json')) {
          cleanedContent = content.replace(/```json\s*/, '').replace(/```\s*$/, '');
        } else if (content.includes('```')) {
          cleanedContent = content.replace(/```\s*/, '').replace(/```\s*$/, '');
        }
        
        const structured_summary = JSON.parse(cleanedContent);
        
        // Validate the structure
        if (!Array.isArray(structured_summary)) {
          console.log('AI returned non-array structured summary, creating fallback...');
          const fallbackStructure: SectionItem[] = [
            {
              heading: "Summary",
              description: "AI-generated summary of the conversation",
              items: [typeof structured_summary === 'string' ? structured_summary : JSON.stringify(structured_summary)],
              priority: null
            }
          ];
          const result = { structured_summary: fallbackStructure };
          summaryCache.set(cacheKey, result);
          return NextResponse.json(result);
        }
        
        // Ensure each item has the expected structure
        const validatedStructure: SectionItem[] = structured_summary.map((item: any) => ({
          heading: item.heading || item.title || 'Section',
          description: item.description || '',
          items: Array.isArray(item.items) ? item.items : (Array.isArray(item.bullets) ? item.bullets : [item.content || 'No content']),
          priority: item.priority || null
        }));
        
        console.log('Validated structure:', JSON.stringify(validatedStructure, null, 2));
        const result = { structured_summary: validatedStructure };
        
        // Cache the result
        summaryCache.set(cacheKey, result);
        
        return NextResponse.json(result);
        
      } catch (parseError) {
        console.log('Failed to parse as JSON, error:', parseError);
        console.log('Content that failed to parse:', content);
        
        // Create a more intelligent fallback by trying to extract sections
        const lines = content.split('\n').filter(line => line.trim());
        const sections: SectionItem[] = [];
        let currentSection: SectionItem | null = null;
        
        for (const line of lines) {
          if (line.includes(':') && (line.includes('Overview') || line.includes('Implementation') || line.includes('Status') || line.includes('Steps'))) {
            if (currentSection) {
              sections.push(currentSection);
            }
            currentSection = {
              heading: line.replace(/[{}":]/g, '').trim(),
              description: '',
              items: [],
              priority: null
            };
          } else if (currentSection && line.trim()) {
            currentSection.items.push(line.trim());
          }
        }
        
        if (currentSection) {
          sections.push(currentSection);
        }
        
        const structured_summary = sections.length > 0 ? sections : [
          {
            heading: "Summary",
            description: "Generated summary content",
            items: lines.slice(0, 10),
            priority: null
          }
        ];
        
        const result = { structured_summary };
        summaryCache.set(cacheKey, result);
        return NextResponse.json(result);
      }
    } else {
      // High-level summary with improved content quality
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini', // 🎯 Switched to cheaper model here too!
        messages: [
          {
            role: 'system',
            content: `You are an expert technical writer who creates clear, actionable project summaries.

            FORMATTING REQUIREMENTS:
            - Use **Bold headers** for sections: **Objective:**, **What Worked:**, **What's Outstanding:**, **Next Steps:**
            - Use bullet points (•) for detailed items under each section
            - Write in professional, clear language
            - Be specific about technical details, file names, and outcomes
            - Distinguish between completed work vs. outstanding work
            
            CONTENT QUALITY STANDARDS:
            - Extract concrete, specific information only
            - Include exact technical details (file names, technologies, configurations)
            - Distinguish between user requests vs. delivered outcomes
            - Every bullet point should be actionable or measurable
            - Use precise language (avoid vague terms like "some", "various", "several")
            - Include any important quotes or specific requirements mentioned`
          },
          {
            role: 'user',
            content: `Create a comprehensive, well-formatted summary of this technical conversation.

            STRUCTURE WITH SPECIFIC CONTENT:

            **Objective:** 
            [Extract the main goal/requirement. Be specific about what the user wanted to accomplish, including technical details]

            **What Worked:** 
            [List only completed actions, delivered features, and successful implementations. Include specific file names, configurations, and technical details. Each bullet should describe something that was actually accomplished.]

            **What's Outstanding:** 
            [List unresolved issues, incomplete tasks, known problems, or areas needing attention. Be specific about what's not working or what's missing.]

            **Next Steps:** 
            [Provide specific, actionable recommendations. Include who should do what, which files need attention, and any dependencies or prerequisites.]

            EXTRACTION GUIDELINES:
            - When the conversation mentions specific files (e.g., "LeftPanel.jsx"), include exact names
            - When technical solutions are discussed, include the implementation details
            - Distinguish between "User requested X" vs "Assistant delivered X" vs "Still needs to be done"
            - Include any important decisions, constraints, or requirements mentioned
            - Note any unresolved questions or areas of uncertainty

            Technical conversation to analyze:
            ${chatContent}`
          }
        ],
        temperature: 0.2, // Lower temperature for consistency
        max_tokens: 1200, // Slightly increased for more detailed summaries
      });

      const summary = completion.choices[0]?.message?.content;
      if (!summary) {
        return NextResponse.json({ error: 'No response from OpenAI' }, { status: 500 });
      }

      const result = { summary };
      
      // Cache the result
      summaryCache.set(cacheKey, result);
      
      return NextResponse.json(result);
    }
  } catch (error) {
    console.error('Error in summarise-chat:', error);
    return NextResponse.json({ 
      error: 'Failed to generate summary',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}