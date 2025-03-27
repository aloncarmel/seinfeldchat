'use client';

import Image from 'next/image';
import Link from 'next/link';

const characters = [
  { id: 'jerry', name: 'Jerry Seinfeld', image: '/jerry.png' },
  { id: 'george', name: 'George Costanza', image: '/george.png' },
  { id: 'elaine', name: 'Elaine Benes', image: '/elaine.png' },
  { id: 'kramer', name: 'Cosmo Kramer', image: '/kramer.png' },
];

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-5 max-w-4xl mx-auto">
      <Image src="/seinfeldlogo.png" alt="Seinfeld Logo" className="mt-10" width={300} height={300} />
      <h1 className="text-3xl font-bold mb-8 text-white text-center">Chat with your favorite Seinfeld<br /> characters using the power of AI!</h1>
      
      <div className="grid grid-cols-2 gap-4">
        {characters.map((char) => (
          <Link
            key={char.id}
            href={`/talk/${char.id}`}
            className="flex flex-col items-center p-4 bg-white/90 rounded-lg shadow-lg hover:shadow-xl transition-all hover:scale-105"
          >
            <div className="w-48 h-48 relative mb-4 rounded-lg overflow-hidden">
              <Image
                src={char.image}
                alt={char.name}
                fill
                className="object-cover"
              />
            </div>
            <span className="text-xl text-black font-semibold">{char.name}</span>
          </Link>
        ))}
      </div>

      <div className="bg-white/10 p-6 rounded-lg mt-8 text-white text-center">
        <h2 className="text-xl font-semibold mb-4">Training Data Stats</h2>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-2xl font-bold">180</p>
            <p className="text-sm opacity-80">Episodes</p>
          </div>
          <div>
            <p className="text-2xl font-bold">~500K</p>
            <p className="text-sm opacity-80">Words</p>
          </div>
          <div>
            <p className="text-2xl font-bold">58</p>
            <p className="text-sm opacity-80">Characters</p>
          </div>
        </div>
      </div>

      
    </main>
  );
}
