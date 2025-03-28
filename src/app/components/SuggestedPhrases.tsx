import { useCallback } from 'react';

type Phrase = {
  text: string;
  description: string;
};

type CharacterPhrases = {
  [key: string]: Phrase[];
};

const characterPhrases: CharacterPhrases = {
  jerry: [
    {
      text: "Did you ever return that jacket with the candy-stripe lining?",
      description: "About the suede jacket episode and how the lining got ruined in the snow."
    },
    {
      text: "So… how's your new puffy shirt going?",
      description: "About wearing that ridiculous pirate shirt on national TV."
    },
    {
      text: "Was that toothbrush ever really dirty?",
      description: "About the girlfriend's toothbrush falling in the toilet."
    },
    {
      text: "Did Babu ever forgive you for the restaurant thing?",
      description: "About Babu Bhatt and the deportation guilt."
    }
  ],
  elaine: [
    {
      text: "How did you not know he was a 'bad breaker-upper'?",
      description: "About dating disasters and guys who called her 'big head'."
    },
    {
      text: "So, did you ever get more sponges?",
      description: "About who's 'spongeworthy' and who isn't."
    },
    {
      text: "Did Mr. Peterman actually write that catalog entry?",
      description: "About ghostwriting wild travel stories for the J. Peterman catalog."
    },
    {
      text: "How's the Urban Sombrero business going?",
      description: "About briefly running the Peterman company into the ground."
    }
  ],
  kramer: [
    {
      text: "How's the coffee table book about coffee tables coming?",
      description: "About the book with pop-out legs."
    },
    {
      text: "Did you ever sell those Japanese businessmen your drawers?",
      description: "About housing them in oversized dresser drawers."
    },
    {
      text: "How's H.E. Pennypacker doing these days?",
      description: "About his fake persona selling catalogs or real estate in Burma."
    },
    {
      text: "Did the Merv Griffin Show ever get another episode?",
      description: "About his stint as a talk show host."
    }
  ],
  george: [
    {
      text: "So, how was it working for the Yankees?",
      description: "About Steinbrenner and pretending to be busy."
    },
    {
      text: "Did you ever get your marine biologist moment back?",
      description: "About the whale-saving story and the golf ball."
    },
    {
      text: "Still pretending to be Art Vandelay?",
      description: "About his various fake identities."
    },
    {
      text: "How's your opposite life going?",
      description: "About doing the opposite of his instincts."
    }
  ]
};

interface SuggestedPhrasesProps {
  character: string;
  onPhraseSelect: (phrase: string) => void;
}

export default function SuggestedPhrases({ character, onPhraseSelect }: SuggestedPhrasesProps) {
  const handlePhraseClick = useCallback((phrase: string) => {
    onPhraseSelect(phrase);
  }, [onPhraseSelect]);

  const phrases = characterPhrases[character] || [];

  return (
    <div className="w-full overflow-x-auto pb-2">
      <div className="flex gap-2 min-w-max px-4">
        {phrases.map((phrase, index) => (
          <button
            key={index}
            onClick={() => handlePhraseClick(phrase.text)}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-full text-sm text-white transition-colors whitespace-nowrap"
            title={phrase.description}
          >
            {phrase.text}
          </button>
        ))}
      </div>
    </div>
  );
} 