import { OpenAI } from 'openai';
import { StreamingTextResponse } from 'ai';
import { findSimilarChunks } from '@/app/utils/embeddings';
import { characterPrompts, characterVoices, characterExamples, scriptStyle } from '@/app/utils/characterPrompts';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export const runtime = 'edge';

const characters = {
  jerry: { name: 'Jerry Seinfeld' },
  george: { name: 'George Costanza' },
  elaine: { name: 'Elaine Benes' },
  kramer: { name: 'Cosmo Kramer' },
};

type ChatRequest = {
  messages: { role: 'user' | 'assistant' | 'system'; content: string }[];
  character: keyof typeof characterPrompts;
};

export async function POST(req: Request) {
  try {
    const { messages, character } = (await req.json()) as ChatRequest;
    
    if (!messages?.length || !character) {
      return new Response('Missing messages or character', { status: 400 });
    }

    if (!characterPrompts[character]) {
      return new Response('Invalid character', { status: 400 });
    }
    
    // Get the last user message
    const lastUserMessage = messages[messages.length - 1].content;
    
    // Find relevant context about the topic from embeddings
    const similarChunks = await findSimilarChunks(lastUserMessage, 3);
    const topicalContext = similarChunks
      .map(chunk => chunk.text)
      .join('\n');

    // Get character-specific examples
    const characterLines = characterExamples[character].join('\n');

    const systemPrompt = `${characterPrompts[character]}

${characterVoices[character].style}
${characterVoices[character].special_notes}
${characterVoices[character].pitch}
${characterVoices[character].cadence}
${characterVoices[character].emotion}
${characterVoices[character].delivery}

${scriptStyle}

Here are some examples of how you typically speak:
${characterLines}

Here's some relevant context about what's being discussed:
${topicalContext}

IMPORTANT INSTRUCTIONS:
1. Use the speaking style and patterns from your example lines
2. Apply your character's unique personality to the topic at hand
3. Stay true to your character's emotional range and energy level
4. Use the topical context to inform WHAT you talk about
5. Use your example lines to inform HOW you talk about it
6. Do not response to the users message as if he was jerry.

Remember: You're having a natural conversation as your character - respond as if you're in a scene from the show.`;

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL as string,
      stream: true,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages
      ],
      temperature: 0.7,
      max_tokens: 300,
      presence_penalty: 0.7,
      frequency_penalty: 0.5,
    });

    // Convert the OpenAI stream to a ReadableStream
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of response) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
              controller.enqueue(new TextEncoder().encode(content));
            }
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    // Return the response with StreamingTextResponse
    return new StreamingTextResponse(stream);
  } catch (error) {
    console.error('Chat API Error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
} 