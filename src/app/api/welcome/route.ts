import { OpenAI } from 'openai';
import { characterPrompts } from '@/app/utils/characterPrompts';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export const runtime = 'edge';

type WelcomeRequest = {
  character: keyof typeof characterPrompts;
};

export async function POST(req: Request) {
  try {
    const { character } = await req.json() as WelcomeRequest;
    
    if (!character || !characterPrompts[character]) {
      return new Response('Invalid character', { status: 400 });
    }

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL as string,
      messages: [
        { 
          role: 'system', 
          content: `${characterPrompts[character]}
You are greeting someone for the first time in a chat. Keep it brief, casual, and true to your character's personality. Include a short introduction of who you are.`
        }
      ],
      temperature: 0.7,
      max_tokens: 150,
    });

    return new Response(response.choices[0].message.content);
  } catch (error) {
    console.error('Welcome API Error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
} 