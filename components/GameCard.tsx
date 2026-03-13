import Link from "next/link";

type Category = "memory" | "math" | "words" | "logic" | "computing" | "binary";

interface GameCardProps {
  title: string;
  description: string;
  href: string;
  emoji: string;
  category: Category;
}

const categoryStyles: Record<Category, { bg: string; badge: string; badgeText: string; border: string }> = {
  memory: {
    bg: "hover:bg-blue-50",
    badge: "bg-blue-100 text-blue-600",
    badgeText: "Memory",
    border: "hover:border-blue-300",
  },
  math: {
    bg: "hover:bg-green-50",
    badge: "bg-green-100 text-green-600",
    badgeText: "Math",
    border: "hover:border-green-300",
  },
  words: {
    bg: "hover:bg-purple-50",
    badge: "bg-purple-100 text-purple-600",
    badgeText: "Words",
    border: "hover:border-purple-300",
  },
  logic: {
    bg: "hover:bg-orange-50",
    badge: "bg-orange-100 text-orange-600",
    badgeText: "Logic",
    border: "hover:border-orange-300",
  },
  computing: {
    bg: "hover:bg-cyan-50",
    badge: "bg-cyan-100 text-cyan-600",
    badgeText: "Computing",
    border: "hover:border-cyan-300",
  },
  binary: {
    bg: "hover:bg-red-50",
    badge: "bg-red-100 text-red-600",
    badgeText: "Binary",
    border: "hover:border-red-300",
  },
};

export default function GameCard({ title, description, href, emoji, category }: GameCardProps) {
  const style = categoryStyles[category];

  return (
    <Link
      href={href}
      className={`group block rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-all ${style.bg} ${style.border}`}
    >
      <div className="mb-3 text-3xl">{emoji}</div>
      <div className="mb-2 flex items-center gap-2">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${style.badge}`}>
          {style.badgeText}
        </span>
      </div>
      <p className="text-sm text-gray-500">{description}</p>
    </Link>
  );
}
