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
    const similarChunks = await findSimilarChunks(lastUserMessage, 3);
    const context = similarChunks
      .map(chunk => {
        const lines = chunk.text.split('\n');
        // Take only the most relevant line if it contains multiple lines
        return lines.length > 1 ? lines[0] : chunk.text;
      })
      .join('\n');

    const systemPrompt = `${characterPrompts[character]}

Relevant context:
${context}

IMPORTANT: Match your speaking style to these examples. Use similar phrases and mannerisms, maintaining your character's unique voice and energy.`;

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL as string,
      stream: true,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages
      ],
      temperature: 0.1,
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