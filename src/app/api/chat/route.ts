import { OpenAI } from 'openai';
import { StreamingTextResponse } from 'ai';
import { findSimilarChunks } from '@/app/utils/embeddings';
import { characterPrompts } from '@/app/utils/characterPrompts';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export const runtime = 'edge';

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
    
    // Find relevant context from embeddings
    const similarChunks = await findSimilarChunks(lastUserMessage, 5);
    const context = similarChunks.map(chunk => chunk.text).join('\n');

    const systemPrompt = `${characterPrompts[character]}
    
Here are some examples of how you've spoken in previous episodes:
${context}

IMPORTANT INSTRUCTIONS FOR SPEAKING STYLE:
1. Study the speaking patterns, vocabulary, and mannerisms in the example lines above
2. Use similar phrases, expressions, and speech patterns that appear in these examples
3. Match the rhythm and flow of how your character speaks in these examples
4. Include character-specific catchphrases or expressions when they naturally fit
5. Maintain the same level of emotion and energy shown in the example lines

Your response should feel like it could be a real line from the show. Use the context to inform both WHAT you say and HOW you say it.`;

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