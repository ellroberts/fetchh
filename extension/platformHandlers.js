// ThreadCub Platform Handlers - Modular configuration for different AI platforms
// This file centralizes platform-specific logic for easy maintenance and expansion

/**
 * Platform Configuration Object
 * Each platform needs:
 * - name: Display name
 * - selectors: CSS selectors for finding page elements
 * - newChatUrl: URL to start new conversation
 * - continueUrl: Default target URL for "Continue with Summary"
 * - extractMessage: Custom function to extract message content (optional)
 * - injectPrompt: Custom function to inject prompt (optional)
 */

const PLATFORM_HANDLERS = {
    'claude.ai': {
        name: 'Claude',
        icon: '🤖',
        color: '#ff6b35',
        
        selectors: {
            messages: '[data-testid*="conversation-turn"], .font-claude-message',
            userMessages: '[data-testid="user-message"], .human',
            assistantMessages: '[data-testid="assistant-message"], .assistant',
            inputField: 'textarea[data-testid="chat-input"]',
            sendButton: 'button[data-testid="send-button"]'
        },
        
        urls: {
            newChat: 'https://claude.ai/chat/new',
            continue: 'https://chat.openai.com/' // Default target for continuation
        },
        
        // Custom message extraction for Claude
        extractMessage(element) {
            // Remove any UI elements we don't want
            const clone = element.cloneNode(true);
            
            // Remove copy buttons, timestamps, etc.
            const unwantedElements = clone.querySelectorAll(
                'button, .copy-button, [data-testid*="copy"], .timestamp, .message-actions'
            );
            unwantedElements.forEach(el => el.remove());
            
            return clone.textContent?.trim() || '';
        },
        
        // Custom prompt injection for Claude
        async injectPrompt(prompt) {
            const inputField = document.querySelector(this.selectors.inputField);
            if (!inputField) return false;
            
            inputField.focus();
            inputField.value = prompt;
            
            // Trigger events to ensure Claude recognizes the input
            inputField.dispatchEvent(new Event('input', { bubbles: true }));
            inputField.dispatchEvent(new Event('change', { bubbles: true }));
            
            return true;
        }
    },
    
    'chat.openai.com': {
        name: 'ChatGPT',
        icon: '💬',
        color: '#10a37f',
        
        selectors: {
            messages: '[data-message-author-role]',
            userMessages: '[data-message-author-role="user"]',
            assistantMessages: '[data-message-author-role="assistant"]',
            inputField: 'textarea[data-testid="prompt-textarea"], #prompt-textarea',
            sendButton: '[data-testid="send-button"]'
        },
        
        urls: {
            newChat: 'https://chat.openai.com/',
            continue: 'https://claude.ai/chat/new'
        },
        
        extractMessage(element) {
            const clone = element.cloneNode(true);
            
            // Remove ChatGPT-specific UI elements
            const unwantedElements = clone.querySelectorAll(
                'button, .copy-code-button, .regenerate-button, .edit-button, .message-actions'
            );
            unwantedElements.forEach(el => el.remove());
            
            return clone.textContent?.trim() || '';
        },
        
        async injectPrompt(prompt) {
            // ChatGPT sometimes uses a more complex input system
            const inputField = document.querySelector(this.selectors.inputField);
            if (!inputField) return false;
            
            inputField.focus();
            
            // Clear existing content
            inputField.value = '';
            
            // Type character by character for better compatibility
            for (let i = 0; i < prompt.length; i++) {
                inputField.value += prompt[i];
                inputField.dispatchEvent(new Event('input', { bubbles: true }));
                await new Promise(resolve => setTimeout(resolve, 10));
            }
            
            return true;
        }
    },
    
    'chatgpt.com': {
        name: 'ChatGPT',
        icon: '💬',
        color: '#10a37f',
        
        // Same configuration as chat.openai.com
        selectors: {
            messages: '[data-message-author-role]',
            userMessages: '[data-message-author-role="user"]',
            assistantMessages: '[data-message-author-role="assistant"]',
            inputField: 'textarea[data-testid="prompt-textarea"], #prompt-textarea',
            sendButton: '[data-testid="send-button"]'
        },
        
        urls: {
            newChat: 'https://chatgpt.com/',
            continue: 'https://claude.ai/chat/new'
        },
        
        extractMessage(element) {
            return PLATFORM_HANDLERS['chat.openai.com'].extractMessage(element);
        },
        
        async injectPrompt(prompt) {
            return PLATFORM_HANDLERS['chat.openai.com'].injectPrompt.call(this, prompt);
        }
    },
    
    'gemini.google.com': {
        name: 'Gemini',
        icon: '✨',
        color: '#4285f4',
        
        selectors: {
            messages: '.conversation-container .model-response-text, .conversation-container .user-input',
            userMessages: '.user-input',
            assistantMessages: '.model-response-text',
            inputField: 'rich-textarea[data-test-id="input-field"] div[contenteditable="true"]',
            sendButton: '[data-test-id="send-button"]'
        },
        
        urls: {
            newChat: 'https://gemini.google.com/app',
            continue: 'https://chat.openai.com/'
        },
        
        extractMessage(element) {
            const clone = element.cloneNode(true);
            
            // Remove Gemini-specific UI elements
            const unwantedElements = clone.querySelectorAll(
                'button, .action-button, .feedback-buttons'
            );
            unwantedElements.forEach(el => el.remove());
            
            return clone.textContent?.trim() || '';
        },
        
        async injectPrompt(prompt) {
            // Gemini uses contenteditable div
            const inputField = document.querySelector(this.selectors.inputField);
            if (!inputField) return false;
            
            inputField.focus();
            inputField.textContent = prompt;
            
            // Trigger input events for contenteditable
            inputField.dispatchEvent(new Event('input', { bubbles: true }));
            inputField.dispatchEvent(new Event('change', { bubbles: true }));
            
            return true;
        }
    },
    
    'copilot.microsoft.com': {
        name: 'Copilot',
        icon: '🚁',
        color: '#0078d4',

        selectors: {
            messages: '.ac-container .ac-textBlock',
            userMessages: '[data-author="user"]',
            assistantMessages: '[data-author="bot"]',
            inputField: 'textarea[data-testid="chat-input"]',
            sendButton: 'button[type="submit"]'
        },

        urls: {
            newChat: 'https://copilot.microsoft.com/',
            continue: 'https://chat.openai.com/'
        },

        extractMessage(element) {
            const clone = element.cloneNode(true);

            // Remove Copilot-specific UI elements
            const unwantedElements = clone.querySelectorAll(
                'button, .action-buttons, .feedback-container'
            );
            unwantedElements.forEach(el => el.remove());

            return clone.textContent?.trim() || '';
        },

        async injectPrompt(prompt) {
            const inputField = document.querySelector(this.selectors.inputField);
            if (!inputField) return false;

            inputField.focus();
            inputField.value = prompt;

            inputField.dispatchEvent(new Event('input', { bubbles: true }));
            inputField.dispatchEvent(new Event('change', { bubbles: true }));

            return true;
        }
    },

    // Grok - uses aria-label="Grok" for assistant messages
    'x.com': {
        name: 'Grok',
        icon: '🤖',
        color: '#1da1f2',

        selectors: {
            // Grok uses aria-label for role detection and css-1jxf684 spans for text
            messages: 'span[class*="css-1jxf684"]',
            userMessages: 'span[class*="css-1jxf684"]',
            assistantMessages: 'div[aria-label="Grok"] span[class*="css-1jxf684"]',
            inputField: 'textarea[placeholder="Ask anything"], textarea[placeholder*="Ask"], textarea',
            sendButton: 'button[type="submit"], button[aria-label="Send"]'
        },

        urls: {
            newChat: 'https://x.com/i/grok',
            continue: 'https://claude.ai/chat/new'
        },

        extractMessage(element) {
            const clone = element.cloneNode(true);

            // Remove UI elements
            const unwantedElements = clone.querySelectorAll(
                'button, .copy-button, [data-testid*="copy"], .timestamp, .message-actions'
            );
            unwantedElements.forEach(el => el.remove());

            return clone.textContent?.trim() || '';
        },

        async injectPrompt(prompt) {
            const inputField = document.querySelector(this.selectors.inputField);
            if (!inputField) return false;

            inputField.focus();
            inputField.value = prompt;

            inputField.dispatchEvent(new Event('input', { bubbles: true }));
            inputField.dispatchEvent(new Event('change', { bubbles: true }));

            return true;
        }
    },

    // Grok alternate domain
    'grok.x.ai': {
        name: 'Grok',
        icon: '🤖',
        color: '#1da1f2',

        selectors: {
            messages: 'span[class*="css-1jxf684"]',
            userMessages: 'span[class*="css-1jxf684"]',
            assistantMessages: 'div[aria-label="Grok"] span[class*="css-1jxf684"]',
            inputField: 'textarea[placeholder="Ask anything"], textarea[placeholder*="Ask"], textarea',
            sendButton: 'button[type="submit"], button[aria-label="Send"]'
        },

        urls: {
            newChat: 'https://grok.x.ai/',
            continue: 'https://claude.ai/chat/new'
        },

        extractMessage(element) {
            return PLATFORM_HANDLERS['x.com'].extractMessage(element);
        },

        async injectPrompt(prompt) {
            return PLATFORM_HANDLERS['x.com'].injectPrompt.call(this, prompt);
        }
    },

    // Grok primary domain (grok.com)
    'grok.com': {
        name: 'Grok',
        icon: '🤖',
        color: '#1da1f2',

        selectors: {
            messages: 'span[class*="css-1jxf684"]',
            userMessages: 'span[class*="css-1jxf684"]',
            assistantMessages: 'div[aria-label="Grok"] span[class*="css-1jxf684"]',
            inputField: 'textarea[placeholder="Ask anything"], textarea[placeholder*="Ask"], textarea',
            sendButton: 'button[type="submit"], button[aria-label="Send"]'
        },

        urls: {
            newChat: 'https://grok.com/',
            continue: 'https://claude.ai/chat/new'
        },

        extractMessage(element) {
            return PLATFORM_HANDLERS['x.com'].extractMessage(element);
        },

        async injectPrompt(prompt) {
            return PLATFORM_HANDLERS['x.com'].injectPrompt.call(this, prompt);
        }
    },

    // Perplexity - uses h1 for user queries and markdown-content for responses
    'www.perplexity.ai': {
        name: 'Perplexity',
        icon: '🔮',
        color: '#20808d',

        selectors: {
            messages: 'h1[class*="group/query"], div[id^="markdown-content"]',
            userMessages: 'h1[class*="group/query"]',
            assistantMessages: 'div[id^="markdown-content"]',
            inputField: 'textarea[placeholder*="Ask"], textarea',
            sendButton: 'button[aria-label="Submit"]'
        },

        urls: {
            newChat: 'https://www.perplexity.ai/',
            continue: 'https://claude.ai/chat/new'
        },

        extractMessage(element) {
            const clone = element.cloneNode(true);

            // Remove UI elements
            const unwantedElements = clone.querySelectorAll(
                'button, .copy-button, [data-testid*="copy"], .sources, .related'
            );
            unwantedElements.forEach(el => el.remove());

            return clone.textContent?.trim() || '';
        },

        async injectPrompt(prompt) {
            const inputField = document.querySelector(this.selectors.inputField);
            if (!inputField) return false;

            inputField.focus();
            inputField.value = prompt;

            inputField.dispatchEvent(new Event('input', { bubbles: true }));
            inputField.dispatchEvent(new Event('change', { bubbles: true }));

            return true;
        }
    }
};

/**
 * Utility functions for platform handling
 */

// Get platform handler for current domain
function getCurrentPlatformHandler() {
    const hostname = window.location.hostname;
    return PLATFORM_HANDLERS[hostname] || null;
}

// Get platform handler by hostname
function getPlatformHandler(hostname) {
    return PLATFORM_HANDLERS[hostname] || null;
}

// Get all supported platforms
function getAllPlatforms() {
    return Object.keys(PLATFORM_HANDLERS);
}

// Check if current site is supported
function isCurrentSiteSupported() {
    return getCurrentPlatformHandler() !== null;
}

// Get platform name from URL
function getPlatformNameFromUrl(url) {
    try {
        const hostname = new URL(url).hostname;
        const handler = PLATFORM_HANDLERS[hostname];
        return handler ? handler.name : null;
    } catch (error) {
        return null;
    }
}

// Create continuation prompt template
function createContinuationPrompt(summary, customInstructions = '') {
    let prompt = `${summary}\n\n`;
    
    if (customInstructions) {
        prompt += `${customInstructions}\n\n`;
    }
    
    prompt += `Please continue our conversation from this point. I'd like to keep building on what we've discussed.`;
    
    return prompt;
}

// Enhanced summary generation with platform-specific optimizations
function generateEnhancedSummary(messages, platformName) {
    if (!messages || messages.length === 0) {
        return 'No conversation to summarize.';
    }
    
    const userMessages = messages.filter(m => m.role === 'user');
    const assistantMessages = messages.filter(m => m.role === 'assistant');
    
    let summary = `Summary of our ${platformName} conversation:\n\n`;
    
    // Key topics from user queries
    if (userMessages.length > 0) {
        summary += `Main topics we discussed:\n`;
        userMessages.slice(0, 5).forEach((msg, index) => {
            const preview = msg.content.substring(0, 120);
            summary += `${index + 1}. ${preview}${msg.content.length > 120 ? '...' : ''}\n`;
        });
        summary += '\n';
    }
    
    // Recent context for continuity
    const recentMessages = messages.slice(-8); // Last 4 exchanges
    if (recentMessages.length > 0) {
        summary += `Recent context:\n`;
        recentMessages.forEach(msg => {
            const role = msg.role === 'user' ? 'You' : 'Assistant';
            const preview = msg.content.substring(0, 200);
            summary += `${role}: ${preview}${msg.content.length > 200 ? '...' : ''}\n\n`;
        });
    }
    
    // Add platform-specific context
    summary += `(Continued from ${platformName})`;
    
    return summary;
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    // Node.js environment
    module.exports = {
        PLATFORM_HANDLERS,
        getCurrentPlatformHandler,
        getPlatformHandler,
        getAllPlatforms,
        isCurrentSiteSupported,
        getPlatformNameFromUrl,
        createContinuationPrompt,
        generateEnhancedSummary
    };
} else {
    // Browser environment
    window.ThreadCubPlatforms = {
        PLATFORM_HANDLERS,
        getCurrentPlatformHandler,
        getPlatformHandler,
        getAllPlatforms,
        isCurrentSiteSupported,
        getPlatformNameFromUrl,
        createContinuationPrompt,
        generateEnhancedSummary
    };
}