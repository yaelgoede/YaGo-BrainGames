import GameCard from "@/components/GameCard";

const games = [
  {
    title: "Memory Match",
    description: "Flip cards and find matching pairs. Test your visual memory!",
    href: "/games/memory-match",
    emoji: "🃏",
    category: "memory" as const,
  },
  {
    title: "Sequence Recall",
    description: "Watch the sequence light up, then repeat it from memory.",
    href: "/games/sequence-recall",
    emoji: "🔴",
    category: "memory" as const,
  },
  {
    title: "Pattern Recognition",
    description: "Spot the odd one out in each pattern. Think fast!",
    href: "/games/pattern-recognition",
    emoji: "🔍",
    category: "memory" as const,
  },
  {
    title: "Mental Math",
    description: "Solve as many arithmetic problems as you can in 60 seconds.",
    href: "/games/mental-math",
    emoji: "🧮",
    category: "math" as const,
  },
  {
    title: "Number Puzzle",
    description: "Find the next number in the sequence. How far can you go?",
    href: "/games/number-puzzle",
    emoji: "🔢",
    category: "math" as const,
  },
  {
    title: "Speed Compare",
    description: "Which number is bigger? Think fast!",
    href: "/games/speed-compare",
    emoji: "⚡",
    category: "math" as const,
  },
  {
    title: "Visual Memory",
    description: "Remember the pattern and recreate it from memory.",
    href: "/games/visual-memory",
    emoji: "🧩",
    category: "memory" as const,
  },
  {
    title: "Chimp Test",
    description: "Numbers flash and hide. Click them in order. How many can you track?",
    href: "/games/chimp-test",
    emoji: "🐵",
    category: "memory" as const,
  },
  {
    title: "Color Memory",
    description: "Memorize the colors, then recreate the pattern from memory.",
    href: "/games/color-memory",
    emoji: "🎨",
    category: "memory" as const,
  },
  {
    title: "Math Chain",
    description: "Chain operations to hit the target number. Think ahead!",
    href: "/games/math-chain",
    emoji: "🔗",
    category: "math" as const,
  },
  {
    title: "Word Scramble",
    description: "Unscramble the letters to reveal the hidden word.",
    href: "/games/word-scramble",
    emoji: "🔤",
    category: "words" as const,
  },
  {
    title: "Word Memory",
    description: "Remember which words you've seen. New or seen before?",
    href: "/games/word-memory",
    emoji: "📝",
    category: "words" as const,
  },
  {
    title: "Gate School",
    description: "Learn logic gates by solving truth table challenges. Start simple, master them all!",
    href: "/games/gate-school",
    emoji: "🚪",
    category: "logic" as const,
  },
  {
    title: "Binary Decode",
    description: "Convert between binary and decimal with visual power-of-2 aids.",
    href: "/games/binary-decode",
    emoji: "💡",
    category: "logic" as const,
  },
  {
    title: "Bit Manipulator",
    description: "Apply bitwise operations to transform bit patterns. Think like a CPU!",
    href: "/games/bit-manipulator",
    emoji: "🔧",
    category: "logic" as const,
  },
  {
    title: "De Morgan's Duel",
    description: "Are these boolean expressions equivalent? Master De Morgan's Laws!",
    href: "/games/de-morgans-duel",
    emoji: "⚖️",
    category: "logic" as const,
  },
];

const categories = [
  { key: "memory" as const, label: "Memory", emoji: "🧠", color: "text-blue-600" },
  { key: "math" as const, label: "Math", emoji: "➕", color: "text-green-600" },
  { key: "words" as const, label: "Words", emoji: "📖", color: "text-purple-600" },
  { key: "logic" as const, label: "Logic", emoji: "💻", color: "text-orange-600" },
];

export default function Home() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Train Your Brain</h1>
        <p className="mt-2 text-gray-500">Pick a game and challenge yourself. High scores are saved locally.</p>
      </div>
      <div className="space-y-10">
        {categories.map((cat) => {
          const categoryGames = games.filter((g) => g.category === cat.key);
          if (categoryGames.length === 0) return null;
          return (
            <section key={cat.key}>
              <h2 className={`mb-4 text-xl font-bold ${cat.color}`}>
                {cat.emoji} {cat.label}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {categoryGames.map((game) => (
                  <GameCard key={game.href} {...game} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
