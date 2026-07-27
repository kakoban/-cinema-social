"use client";

import { useState, useEffect } from "react";
import { Sparkles, Bot, Check, Loader2, Gamepad2, Trophy, Flame, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface QuizQuestion {
  question: string;
  options: string[];
  correct: number;
}

const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    question: "کارگردان شاهکار «Interstellar» و «Inception» کیست؟",
    options: ["کریستوفر نولان", "کوئنتین تارانتینو", "استیون اسپیلبرگ", "مارتین اسکورسیزی"],
    correct: 0,
  },
  {
    question: "کدام انیمیشن اولین فیلم بلند پویانمایی تاریخ است؟",
    options: ["پینوکیو", "سفیدبرفی و هفت کوتوله", "سیندرلا", "فانتزیا"],
    correct: 1,
  },
  {
    question: "شهر خیالی بتمن و جوکر چه نام دارد؟",
    options: ["متروپلیس", "گاتهام سیتی", "استار سیتی", "ارکام"],
    correct: 1,
  },
  {
    question: "کدام بازیگر نقش مرد آهنی (Iron Man) را ایفا کرد؟",
    options: ["کریس ایوانز", "رابرت داونی جونیور", "تام هالند", "کریس همسورث"],
    correct: 1,
  },
  {
    question: "فیلم «پدرخوانده» (The Godfather) توسط چه کسی کارگردانی شد؟",
    options: ["فرانسیس فورد کاپولا", "استنلی کوبریک", "آلفرد هیچکاک", "رایدلی اسکات"],
    correct: 0,
  },
];

interface AiLoadingOverlayProps {
  recommendation?: string | null;
  onCancel?: () => void;
}

export function AiLoadingOverlay({ recommendation }: AiLoadingOverlayProps) {
  const [activeTab, setActiveTab] = useState<"quiz" | "popcorn">("quiz");
  const [score, setScore] = useState(0);
  const [quizIdx, setQuizIdx] = useState(0);
  const [selectedOpt, setSelectedOpt] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [popcorns, setPopcorns] = useState<{ id: number; x: number; y: number }[]>([]);

  // Randomize initial quiz
  useEffect(() => {
    setQuizIdx(Math.floor(Math.random() * QUIZ_QUESTIONS.length));
  }, []);

  // Popcorn generator
  useEffect(() => {
    if (activeTab !== "popcorn") return;
    const interval = setInterval(() => {
      if (popcorns.length < 8) {
        setPopcorns((prev) => [
          ...prev,
          {
            id: Date.now() + Math.random(),
            x: Math.floor(Math.random() * 80) + 10,
            y: Math.floor(Math.random() * 70) + 15,
          },
        ]);
      }
    }, 600);
    return () => clearInterval(interval);
  }, [activeTab, popcorns.length]);

  const currentQuiz = QUIZ_QUESTIONS[quizIdx % QUIZ_QUESTIONS.length];

  const handleAnswer = (optIdx: number) => {
    if (selectedOpt !== null) return;
    setSelectedOpt(optIdx);

    if (optIdx === currentQuiz.correct) {
      setFeedback("correct");
      setScore((s) => s + 10);
    } else {
      setFeedback("wrong");
    }

    setTimeout(() => {
      setSelectedOpt(null);
      setFeedback(null);
      setQuizIdx((i) => (i + 1) % QUIZ_QUESTIONS.length);
    }, 1200);
  };

  const handlePopcornClick = (id: number) => {
    setPopcorns((prev) => prev.filter((p) => p.id !== id));
    setScore((s) => s + 5);
  };

  return (
    <div className="absolute inset-0 z-40 bg-zinc-950/95 backdrop-blur-2xl flex flex-col items-center justify-center p-4 text-center overflow-hidden font-sans select-none" dir="rtl">
      {/* Ambient background animations */}
      <div className="absolute size-96 rounded-full border border-purple-500/20 animate-ping opacity-20 pointer-events-none" />
      <div className="absolute size-64 rounded-full border border-red-500/30 animate-pulse opacity-30 pointer-events-none" />

      {/* Main Header Visualizer */}
      <div className="relative mb-3 flex items-center gap-3">
        <div className="size-14 rounded-2xl bg-gradient-to-tr from-purple-600 via-red-600 to-amber-500 p-0.5 shadow-xl shadow-purple-500/20 animate-pulse">
          <div className="size-full bg-zinc-950 rounded-[14px] flex items-center justify-center">
            <Sparkles className="size-7 text-purple-400 animate-spin" />
          </div>
        </div>
        <div className="text-right">
          <h3 className="text-sm sm:text-base font-bold text-white tracking-wide flex items-center gap-1.5">
            <Bot className="size-4 text-purple-400" />
            <span>در حال پایش هوشمند سرورها...</span>
          </h3>
          <p className="text-[11px] text-purple-200/70 font-mono dir-ltr">
            AI Mirror Health & Latency Scan
          </p>
        </div>
      </div>

      {/* Animated Progress Bar */}
      <div className="w-56 sm:w-72 h-1 bg-white/10 rounded-full overflow-hidden relative mb-3">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500 via-red-500 to-amber-400 animate-pulse rounded-full" />
      </div>

      {/* Interactive Waiting Arcade Mini-Card */}
      <div className="w-full max-w-sm sm:max-w-md bg-zinc-900/90 border border-white/15 rounded-2xl p-3 sm:p-4 shadow-2xl backdrop-blur-md relative overflow-hidden my-1">
        {/* Arcade Top Navigation / Tabs */}
        <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-3">
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant={activeTab === "quiz" ? "secondary" : "ghost"}
              className={`h-6 text-[10px] px-2 gap-1 rounded-md ${activeTab === "quiz" ? "bg-purple-600 text-white font-bold" : "text-white/70"}`}
              onClick={() => setActiveTab("quiz")}
            >
              <HelpCircle className="size-3" />
              کوییز سینمایی
            </Button>
            <Button
              size="sm"
              variant={activeTab === "popcorn" ? "secondary" : "ghost"}
              className={`h-6 text-[10px] px-2 gap-1 rounded-md ${activeTab === "popcorn" ? "bg-amber-600 text-white font-bold" : "text-white/70"}`}
              onClick={() => setActiveTab("popcorn")}
            >
              🍿 پاپ‌کورن خوار
            </Button>
          </div>

          <Badge variant="outline" className="bg-purple-950/80 border-purple-500/40 text-purple-300 text-[10px] font-mono gap-1">
            <Trophy className="size-3 text-amber-400" /> امتیاز: {score}
          </Badge>
        </div>

        {/* Tab 1: Cinema Quiz Game */}
        {activeTab === "quiz" && (
          <div className="flex flex-col gap-2 animate-in fade-in zoom-in-95 duration-200">
            <p className="text-xs sm:text-sm font-semibold text-zinc-100 text-right leading-snug">
              ❓ {currentQuiz.question}
            </p>
            <div className="grid grid-cols-2 gap-1.5 mt-1">
              {currentQuiz.options.map((opt, idx) => {
                let btnStyle = "bg-zinc-800/80 hover:bg-purple-900/50 border-zinc-700 text-zinc-200";
                if (selectedOpt === idx) {
                  if (idx === currentQuiz.correct) {
                    btnStyle = "bg-emerald-600 text-white border-emerald-400 font-bold";
                  } else {
                    btnStyle = "bg-red-600 text-white border-red-400";
                  }
                } else if (selectedOpt !== null && idx === currentQuiz.correct) {
                  btnStyle = "bg-emerald-600/80 text-white border-emerald-500 font-bold";
                }

                return (
                  <Button
                    key={idx}
                    size="sm"
                    variant="outline"
                    className={`h-8 text-xs justify-start px-2.5 truncate transition-all duration-150 ${btnStyle}`}
                    onClick={() => handleAnswer(idx)}
                    disabled={selectedOpt !== null}
                  >
                    <span className="opacity-60 text-[10px] ml-1">{idx + 1}.</span>
                    <span className="truncate">{opt}</span>
                  </Button>
                );
              })}
            </div>
            {feedback === "correct" && (
              <p className="text-[11px] text-emerald-400 font-bold animate-bounce mt-1 flex items-center justify-center gap-1">
                <Check className="size-3" /> عالی بود! ۱۰ امتیاز گرفتید 👏
              </p>
            )}
            {feedback === "wrong" && (
              <p className="text-[11px] text-red-400 font-bold mt-1">
                پاسخ اشتباه بود! سوال بعدی...
              </p>
            )}
          </div>
        )}

        {/* Tab 2: Popcorn Catcher Mini-Game */}
        {activeTab === "popcorn" && (
          <div className="h-28 relative flex items-center justify-center bg-black/40 rounded-xl border border-white/5 overflow-hidden">
            {popcorns.length === 0 ? (
              <p className="text-xs text-white/50 animate-pulse">در حال پخت پاپ‌کورن... 🍿</p>
            ) : (
              popcorns.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  style={{ top: `${p.y}%`, left: `${p.x}%` }}
                  className="absolute text-2xl hover:scale-125 active:scale-90 transition transform cursor-pointer animate-bounce"
                  onClick={() => handlePopcornClick(p.id)}
                >
                  🍿
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Step Status Badges */}
      <div className="flex items-center gap-2 mt-2 text-[10px] text-white/70">
        <span className="flex items-center gap-1 text-emerald-400"><Check className="size-3" /> Pinging Mirrors</span>
        <span>•</span>
        <span className="flex items-center gap-1 text-purple-300"><Loader2 className="size-3 animate-spin text-purple-400" /> AI Optimization</span>
      </div>
    </div>
  );
}
