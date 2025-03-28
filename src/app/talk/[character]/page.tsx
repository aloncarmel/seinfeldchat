'use client';

import { useChat } from 'ai/react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useRef } from 'react';

const PaperAirplaneIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
  </svg>
);

const characters = {
  jerry: { name: 'Jerry Seinfeld', image: '/jerry.png' },
  george: { name: 'George Costanza', image: '/george.png' },
  elaine: { name: 'Elaine Benes', image: '/elaine.png' },
  kramer: { name: 'Cosmo Kramer', image: '/kramer.png' },
};

export default function CharacterChat() {
  const params = useParams();
  const character = params.character as string;
  const characterInfo = characters[character as keyof typeof characters];
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const welcomeSentRef = useRef(false);
  const welcomeApiCalledRef = useRef(false);

  const { messages, input, handleInputChange, handleSubmit, setMessages } = useChat({
    body: { character },
    id: character,
  });

  // Add welcome message
  useEffect(() => {
    async function getWelcomeMessage() {
      if (!welcomeSentRef.current && !welcomeApiCalledRef.current && messages.length === 0 && characterInfo) {
        welcomeApiCalledRef.current = true;
        try {
          const response = await fetch('/api/welcome', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ character })
          });
          
          if (response.ok) {
            const content = await response.text();
            const welcomeMessage = {
              id: 'welcome',
              role: 'assistant' as const,
              content,
              createdAt: new Date()
            };
            setMessages([welcomeMessage]);
            welcomeSentRef.current = true;
          }
        } catch (error) {
          console.error('Error getting welcome message:', error);
          welcomeApiCalledRef.current = false; // Reset on error to allow retry
        }
      }
    }

    getWelcomeMessage();
  }, [character, characterInfo, setMessages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]); // Scroll when messages update

  if (!characterInfo) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-4">
        <div className="bg-white/90 p-8 rounded-lg shadow-lg text-center">
          <h1 className="text-2xl font-bold mb-4">Character not found</h1>
          <Link href="/" className="text-blue-500 hover:underline">
            Return to character
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-col h-screen">
      {/* Sticky header */}
      <div className="w-full h-[60px] px-4  fixed top-0 left-0 z-10  backdrop-blur-sm">
        <div className="mx-auto w-full h-full flex items-center justify-between">
          <Link
            href="/"
            className="px-4 py-2 border border-white/50 rounded hover:bg-white/10 transition-colors text-white"
          >
            ← Characters
          </Link>
          
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold text-white">{characterInfo.name}</h1>
            <div className="w-10 h-10 relative rounded-full overflow-hidden">
              <Image
                src={characterInfo.image}
                alt={characterInfo.name}
                fill
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Messages Container - Scrollable area */}
      <div className="flex-1 overflow-y-auto pt-[60px] pb-[80px]">
        <div className="max-w-3xl mx-auto p-4">
          <div className="space-y-4">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${
                  m.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {m.role !== 'user' && (
                  <div className="w-12 h-12 relative rounded-full overflow-hidden mr-2 flex-shrink-0">
                    <Image
                      src={characterInfo.image}
                      alt={characterInfo.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
                <div
                  className={`${
                    m.role === 'user'
                      ? 'bg-[#cd431b] text-white shadow-xl backdrop-blur-sm'
                      : 'bg-white/90 backdrop-blur-sm shadow-xl text-gray-800'
                  } rounded-xl px-4 py-2 max-w-[80%]`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>

      {/* Fixed Input Form */}
      <div className="fixed bottom-0 left-0 w-full backdrop-blur-sm">
        <div className="max-w-3xl mx-auto p-4">
          <form onSubmit={handleSubmit} className="relative">
            <input
              value={input}
              onChange={handleInputChange}
              placeholder={`Say something to ${characterInfo.name}...`}
              className="w-full h-12 pl-4 pr-12 border backdrop-blur-sm shadow-xl rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 flex items-center justify-center bg-[#cd431b] text-white rounded-full hover:bg-blue-600 transition-colors"
            >
              <PaperAirplaneIcon />
            </button>
          </form>
        </div>
      </div>
    </main>
  );
} 