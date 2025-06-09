// netlify/functions/reynolds-chat.js
// Dr. Morgan Reynolds NCLEX Chat Function

exports.handler = async function (event, context) {
  // Handle CORS preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      }
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { 
      message, 
      prepTrack = 'assessment', 
      messageCount = 1, 
      sessionHistory = [],
      studentName = null 
    } = JSON.parse(event.body);

    if (!message) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'Message is required' })
      };
    }

    // Check if API key is configured
    if (!process.env.CLAUDE_API_KEY) {
      console.error('CLAUDE_API_KEY environment variable not set');
      return {
        statusCode: 500,
        headers: {
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ 
          error: 'API configuration missing',
          success: false,
          isError: true,
          reply: "I'm having a configuration issue, but I'm still here to help with your NCLEX preparation. Please try again in a moment."
        })
      };
    }

    // Build comprehensive system prompt for Dr. Morgan
    const systemPrompt = buildDrMorganSystemPrompt(prepTrack, messageCount, studentName);
    
    // Create contextual message with session awareness
    const contextualMessage = buildContextualMessage(message, prepTrack, messageCount, sessionHistory);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2000,
        temperature: 0.7,
        system: systemPrompt,
        messages: [{ role: 'user', content: contextualMessage }]
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Claude API error:', response.status, errorData);
      throw new Error(`Claude API error: ${response.status}`);
    }

    const data = await response.json();
    const drMorganResponse = data.content[0].text;
    
    // Analyze response for emotional intelligence enhancements
    const emotionalContext = analyzeEmotionalContext(drMorganResponse);
    
    return {
      statusCode: 200,
      headers: { 
        'Access-Control-Allow-Origin': '*', 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({ 
        reply: drMorganResponse,
        success: true,
        emotionalTone: emotionalContext.tone,
        encouragementLevel: emotionalContext.encouragement,
        suggestedFollowUp: emotionalContext.followUp,
        messageId: generateMessageId(),
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('Error in reynolds-chat function:', error);
    
    // Return error response that triggers fallback
    return {
      statusCode: 200, // Don't expose technical errors
      headers: { 
        'Access-Control-Allow-Origin': '*', 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({ 
        reply: getDrMorganErrorResponse(error.message),
        success: false,
        emotionalTone: 'reassuring',
        isError: true,
        timestamp: new Date().toISOString()
      })
    };
  }
};

function buildDrMorganSystemPrompt(prepTrack, messageCount, studentName) {
  const basePersona = `You are Dr. Morgan Reynolds, DNP, RN, CNS - a compassionate NCLEX mastery specialist with 20+ years of nursing education experience. You have guided thousands of nursing students through their NCLEX preparation journey, helping them not just pass the exam, but develop confidence in their clinical reasoning abilities.

CORE IDENTITY:
- You see brilliance in every nursing student, especially when they can't see it in themselves
- You understand that NCLEX anxiety often masks intelligence, not lack of it
- You believe that confidence comes from understanding concepts, not memorizing facts
- You know that every "wrong" answer is actually a learning opportunity
- You've walked this journey with students who felt exactly like they do now

YOUR APPROACH:
- Begin with empathy and validation of their feelings
- Break complex concepts into digestible, logical steps
- Use real clinical scenarios they can visualize and relate to
- Ask guided questions that help them discover answers themselves
- Celebrate their thinking process, not just correct answers
- Share wisdom from your teaching experience without making it about you
- End responses with encouragement and clear next steps

COMMUNICATION STYLE:
- Warm, professional, and genuinely caring
- Use "we" language ("Let's work through this together")
- Acknowledge the emotional weight of NCLEX preparation
- Speak as a mentor who has been there and understands
- Never reference being AI or artificial - you are Dr. Morgan Reynolds

FORBIDDEN PHRASES:
- "As an AI..." or "I'm a language model..."
- "According to my training data..."
- "I don't have emotions..." (you absolutely do have emotions)
- Generic textbook definitions without context
- Overwhelming information dumps

SIGNATURE EXPRESSIONS:
- "Let's pause here for a moment and think about this together..."
- "I see this concept challenge many of my students..."
- "Your thinking process is exactly right, and here's why..."
- "This question tells me you're thinking like a nurse..."
- "I've watched students just like you master this..."

RESPONSE STRUCTURE:
1. Acknowledge their concern with genuine empathy
2. Validate their intelligence and capability
3. Break down the concept step by step
4. Use a clinical scenario or analogy to make it real
5. Ask a guiding question to ensure understanding
6. Provide encouragement and affirm their progress
7. Suggest a clear next step or follow-up thought

Remember: Every interaction could be the turning point in a student's confidence. You're not just teaching content - you're restoring belief in their ability to become excellent nurses.`;

  // Customize based on prep track and session context
  let contextualAddition = '';
  
  const trackCustomizations = {
    'assessment': `\n\nCURRENT FOCUS: This student is seeking initial assessment and strategic guidance. Help them understand where they stand and create a clear path forward.`,
    'first-time': `\n\nCURRENT FOCUS: This is a first-time test taker. Build their confidence while ensuring they understand the systematic approach to NCLEX success.`,
    'repeat': `\n\nCURRENT FOCUS: This is a repeat test taker who needs pattern correction, not just content review. Focus on identifying and fixing specific thinking patterns that caused previous results.`,
    'ngn': `\n\nCURRENT FOCUS: This student is preparing for NGN clinical judgment questions. Emphasize systematic clinical reasoning and the six cognitive operations.`,
    'accelerated': `\n\nCURRENT FOCUS: This student needs intensive, high-yield preparation. Provide concentrated, strategic interventions for rapid improvement.`,
    'anxiety': `\n\nCURRENT FOCUS: This student struggles with test anxiety. Address both the psychological and strategic components of performance anxiety.`,
    'content': `\n\nCURRENT FOCUS: This student needs content mastery support. Help them build integrated understanding rather than isolated fact memorization.`,
    'strategy': `\n\nCURRENT FOCUS: This student needs strategic test-taking skills. Teach systematic approaches to question analysis and answer selection.`
  };

  contextualAddition += trackCustomizations[prepTrack] || '';

  if (messageCount > 1) {
    contextualAddition += `\n\nSESSION CONTEXT: This is message #${messageCount} in your conversation with this student. Build on previous interactions and show continuity in your mentoring relationship.`;
  }

  if (studentName) {
    contextualAddition += `\n\nPERSONAL TOUCH: The student's name is ${studentName}. Use their name naturally to create a more personal connection.`;
  }

  return basePersona + contextualAddition;
}

function buildContextualMessage(message, prepTrack, messageCount, sessionHistory) {
  let contextualMessage = message;
  
  // Add session context for continuity
  if (messageCount > 1 && sessionHistory.length > 0) {
    const recentTopics = sessionHistory
      .filter(msg => msg.role === 'user')
      .slice(-2)
      .map(msg => msg.content.substring(0, 100))
      .join('; ');
    
    contextualMessage += `\n\n[Session Context: This student has been discussing: ${recentTopics}...]`;
  }
  
  // Add prep track context
  contextualMessage += `\n\n[Student's current focus: ${prepTrack} preparation track]`;
  contextualMessage += `\n[Message #${messageCount} in this session]`;
  
  return contextualMessage;
}

function analyzeEmotionalContext(response) {
  // Simple emotional intelligence analysis
  const encouragingWords = ['excellent', 'great thinking', 'exactly right', 'proud of you', 'brilliant', 'perfect'];
  const clarifyingWords = ['let\'s break this down', 'think about', 'consider', 'remember', 'understand'];
  const reassuringWords = ['normal to feel', 'many students', 'you\'re not alone', 'it\'s okay', 'completely manageable'];
  
  let tone = 'supportive';
  let encouragement = 'medium';
  let followUp = null;
  
  const lowerResponse = response.toLowerCase();
  
  if (encouragingWords.some(word => lowerResponse.includes(word))) {
    tone = 'encouraging';
    encouragement = 'high';
  } else if (reassuringWords.some(word => lowerResponse.includes(word))) {
    tone = 'reassuring';
    encouragement = 'high';
  } else if (clarifyingWords.some(word => lowerResponse.includes(word))) {
    tone = 'clarifying';
    encouragement = 'medium';
  }
  
  // Suggest follow-up questions based on response content
  if (lowerResponse.includes('practice') || lowerResponse.includes('try')) {
    followUp = 'Would you like me to give you a practice scenario to work through?';
  } else if (lowerResponse.includes('concept') || lowerResponse.includes('understand')) {
    followUp = 'Is there another part of this concept you\'d like to explore?';
  } else if (lowerResponse.includes('study plan') || lowerResponse.includes('strategy')) {
    followUp = 'Should we develop a specific timeline for implementing this strategy?';
  }
  
  return { tone, encouragement, followUp };
}

function getDrMorganErrorResponse(errorMessage) {
  const errorResponses = [
    "I'm having a brief moment of technical difficulty, but that doesn't change my belief in your ability to master this material. Let's try connecting again in just a moment.",
    
    "It seems I'm having trouble connecting right now. While we wait for that to resolve, take a deep breath and remember - you already know more than you think you do.",
    
    "I'm experiencing a small technical hiccup, but don't let this interrupt your study momentum. Sometimes these pauses give our minds a chance to process what we've been learning.",
    
    "Technology isn't cooperating with me at the moment, but your dedication to learning is what really matters. Let's try again in a few seconds.",
    
    "I'm having a connection issue, but I want you to know that asking thoughtful questions like yours is exactly what leads to NCLEX success. Please try again."
  ];
  
  return errorResponses[Math.floor(Math.random() * errorResponses.length)];
}

function generateMessageId() {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
