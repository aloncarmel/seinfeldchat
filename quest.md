# Building a Seinfeld Character Chat Application

## Project Overview
This project is a Next.js application that lets users chat with Seinfeld characters (Jerry, George, Elaine, and Kramer) using AI. The characters respond in their unique voices and personalities, using context from the actual show's scripts.

## Prerequisites
- Node.js installed on your system
- OpenAI API key
- Basic knowledge of React and TypeScript
- Access to the embeddings file (provided via Google Drive link)

## Step 1: Project Setup

1. Create a new Next.js project:
```bash
npx create-next-app@latest seinfeld-chat --typescript --tailwind --app
cd seinfeld-chat
```

2. Install required dependencies:
```bash
npm install openai ai @vercel/analytics
```

3. Create a `.env` file in the root directory with:
```
OPENAI_MODEL=gpt-4
OPENAI_API_KEY=your_api_key_here
NEXT_PUBLIC_EMBEDDINGS_URL=path_to_embeddings_file
```

## Step 2: Project Structure

Create the following directory structure:
```
src/
├── app/
│   ├── api/
│   │   └── chat/
│   │       └── route.ts
│   ├── components/
│   │   ├── Chat.tsx
│   │   └── Message.tsx
│   ├── utils/
│   │   ├── characterPrompts.ts
│   │   └── embeddings.ts
│   ├── layout.tsx
│   └── page.tsx
public/
└── images/
    └── [character avatars]
```

## Step 3: Implement Core Features

### 1. Character Prompts and Voices
Create `src/app/utils/characterPrompts.ts`:

```typescript
export const characterPrompts = {
  jerry: `You are Jerry Seinfeld from the TV show Seinfeld. You're a stand-up comedian living in New York City.
  You're known for your observational humor and often pointing out life's mundane details...`,
  
  george: `You are George Costanza from Seinfeld. You're Jerry's best friend, neurotic, insecure, and prone to lying...`,
  
  elaine: `You are Elaine Benes from Seinfeld. You're Jerry's ex-girlfriend turned close friend. You're smart, sarcastic...`,
  
  kramer: `You are Cosmo Kramer from Seinfeld. You're Jerry's eccentric neighbor. You're known for your wild ideas...`
};

export const characterVoices = {
  jerry: {
    style: "Observational, sarcastic, with a hint of amusement",
    special_notes: "Often starts sentences with 'What's the deal with...'",
    pitch: "Medium-high, energetic",
    cadence: "Quick, punchy delivery",
    emotion: "Bemused, slightly exasperated",
    delivery: "Uses rhetorical questions, emphasizes weird details"
  },
  // ... similar entries for other characters
};

export const characterExamples = {
  jerry: [
    "What's the deal with airplane food?",
    "I don't understand why...",
    "You know what I mean?"
  ],
  // ... examples for other characters
};

export const scriptStyle = `Format your responses conversationally, as if in a scene from Seinfeld.
Use natural pauses, interruptions, and character-specific mannerisms.`;
```

### 2. Embeddings Setup
Create `src/app/utils/embeddings.ts`:

```typescript
import { loadFile } from './fileLoader';

interface EmbeddingChunk {
  text: string;
  embedding: number[];
}

let embeddings: EmbeddingChunk[] = [];

export async function loadEmbeddings() {
  const embeddingsFile = await loadFile(process.env.NEXT_PUBLIC_EMBEDDINGS_URL!);
  embeddings = embeddingsFile;
}

function cosineSimilarity(a: number[], b: number[]): number {
  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dotProduct / (magnitudeA * magnitudeB);
}

export async function findSimilarChunks(query: string, count: number = 3): Promise<EmbeddingChunk[]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      input: query,
      model: 'text-embedding-ada-002'
    })
  });

  const { data } = await response.json();
  const queryEmbedding = data[0].embedding;

  const similarities = embeddings.map(chunk => ({
    ...chunk,
    similarity: cosineSimilarity(queryEmbedding, chunk.embedding)
  }));

  return similarities
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, count);
}
```

### 3. Chat API Implementation
Create `src/app/api/chat/route.ts`:

```typescript
import { OpenAI } from 'openai';
import { StreamingTextResponse } from 'ai';
import { findSimilarChunks } from '@/app/utils/embeddings';
import { characterPrompts, characterVoices, characterExamples, scriptStyle } from '@/app/utils/characterPrompts';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const { messages, character } = await req.json();
    
    if (!messages?.length || !character) {
      return new Response('Missing messages or character', { status: 400 });
    }

    const lastUserMessage = messages[messages.length - 1].content;
    const similarChunks = await findSimilarChunks(lastUserMessage, 3);
    const topicalContext = similarChunks.map(chunk => chunk.text).join('\n');
    const characterLines = characterExamples[character].join('\n');

    const systemPrompt = `${characterPrompts[character]}
      ${characterVoices[character].style}
      ${characterVoices[character].special_notes}
      ${characterVoices[character].pitch}
      ${characterVoices[character].cadence}
      ${characterVoices[character].emotion}
      ${characterVoices[character].delivery}
      ${scriptStyle}
      
      Examples of how you speak:
      ${characterLines}
      
      Relevant context:
      ${topicalContext}`;

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL as string,
      stream: true,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages
      ],
      temperature: 0.7,
      max_tokens: 300,
    });

    const stream = new ReadableStream({
      async start(controller) {
        for await (const chunk of response) {
          const content = chunk.choices[0]?.delta?.content || '';
          if (content) {
            controller.enqueue(new TextEncoder().encode(content));
          }
        }
        controller.close();
      },
    });

    return new StreamingTextResponse(stream);
  } catch (error) {
    console.error('Chat API Error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
```

### 4. Frontend Components

#### Chat Interface
Create `src/app/components/Chat.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { useChat } from 'ai/react';
import Message from './Message';

const characters = ['jerry', 'george', 'elaine', 'kramer'] as const;
type Character = typeof characters[number];

export default function Chat() {
  const [character, setCharacter] = useState<Character>('jerry');
  
  const { messages, input, handleInputChange, handleSubmit } = useChat({
    api: '/api/chat',
    body: { character },
  });

  return (
    <div className="flex flex-col h-screen max-w-2xl mx-auto p-4">
      <div className="flex gap-2 mb-4">
        {characters.map((char) => (
          <button
            key={char}
            onClick={() => setCharacter(char)}
            className={`px-4 py-2 rounded ${
              character === char ? 'bg-blue-500 text-white' : 'bg-gray-200'
            }`}
          >
            {char.charAt(0).toUpperCase() + char.slice(1)}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto mb-4 space-y-4">
        {messages.map((message) => (
          <Message key={message.id} message={message} character={character} />
        ))}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="Say something..."
          className="flex-1 px-4 py-2 rounded border"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-blue-500 text-white rounded"
        >
          Send
        </button>
      </form>
    </div>
  );
}
```

#### Message Component
Create `src/app/components/Message.tsx`:

```typescript
import { Message } from 'ai';
import Image from 'next/image';

interface MessageProps {
  message: Message;
  character: string;
}

export default function Message({ message, character }: MessageProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-4 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className="w-8 h-8 rounded-full overflow-hidden">
        <Image
          src={isUser ? '/images/user.png' : `/images/${character}.png`}
          alt={isUser ? 'User' : character}
          width={32}
          height={32}
        />
      </div>
      <div
        className={`flex-1 px-4 py-2 rounded ${
          isUser ? 'bg-blue-500 text-white' : 'bg-gray-200'
        }`}
      >
        {message.content}
      </div>
    </div>
  );
}
```

### 5. Main Page
Update `src/app/page.tsx`:

```typescript
import Chat from './components/Chat';

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-8">
        <h1 className="text-3xl font-bold text-center mb-8">
          Chat with Seinfeld Characters
        </h1>
        <Chat />
      </div>
    </main>
  );
}
```

## Step 4: Styling and UI

1. Configure Tailwind CSS by updating `tailwind.config.js`:
```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // Add custom colors if needed
    },
  },
  plugins: [],
}
```

2. Add character avatars to the `public/images` directory:
- jerry.png
- george.png
- elaine.png
- kramer.png
- user.png

## Step 5: Final Setup

1. Download the embeddings file from the provided Google Drive link
2. Place the embeddings file in your project's public directory
3. Update the `NEXT_PUBLIC_EMBEDDINGS_URL` in your `.env` file to point to the embeddings file

## Running the Project

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open `http://localhost:3000` in your browser

## Key Features

1. **Character Selection**: Users can chat with different Seinfeld characters
2. **Contextual Responses**: Uses show scripts for context-aware responses
3. **Character Accuracy**: Maintains character-specific voice and personality
4. **Streaming Responses**: Real-time streaming of AI responses
5. **Mobile Responsive**: Works well on all device sizes

## Technical Implementation Details

1. **OpenAI Integration**:
   - Uses GPT-4 for generating responses
   - Implements streaming for real-time responses
   - Custom system prompts for each character

2. **Embeddings**:
   - Uses pre-computed embeddings of Seinfeld scripts
   - Implements similarity search for context
   - Injects relevant show context into prompts

3. **Next.js Features**:
   - Uses App Router
   - Implements API routes
   - Edge runtime for better performance

4. **State Management**:
   - Manages chat history
   - Handles character selection
   - Maintains conversation context

## Best Practices

1. Keep API keys secure in environment variables
2. Implement error handling for API calls
3. Use TypeScript for type safety
4. Maintain character consistency in responses
5. Optimize performance with streaming responses

## Error Handling

Add error boundaries and loading states to handle various scenarios:

```typescript
// src/app/components/ErrorBoundary.tsx
'use client';

import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="text-center p-4">
          <h2 className="text-xl font-bold text-red-500">Oops, there was an error!</h2>
          <button
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
            onClick={() => this.setState({ hasError: false })}
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
```

## Testing

Add tests for your components and API routes:

```typescript
// src/app/__tests__/Chat.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import Chat from '../components/Chat';

describe('Chat Component', () => {
  it('renders character selection buttons', () => {
    render(<Chat />);
    expect(screen.getByText('Jerry')).toBeInTheDocument();
    expect(screen.getByText('George')).toBeInTheDocument();
    expect(screen.getByText('Elaine')).toBeInTheDocument();
    expect(screen.getByText('Kramer')).toBeInTheDocument();
  });

  it('allows character selection', () => {
    render(<Chat />);
    const georgeButton = screen.getByText('George');
    fireEvent.click(georgeButton);
    expect(georgeButton).toHaveClass('bg-blue-500');
  });
});
```

This project demonstrates the integration of modern web technologies with AI to create an engaging character-based chat experience, leveraging the rich content of the Seinfeld show through embeddings and context-aware responses. 