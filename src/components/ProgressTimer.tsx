import React, { useState, useEffect } from "react";
import { motion } from "motion/react";

export const ProgressTimer = ({
  message,
  estimatedSeconds = 15,
}: {
  message: string;
  estimatedSeconds?: number;
}) => {
  const [timeLeft, setTimeLeft] = useState(estimatedSeconds);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Stay at 1 second if it takes longer, or we can just say "almost done"
          return 1;
        }
        return prev - 1;
      });

      setProgress((prev) => {
        const next = prev + 100 / estimatedSeconds;
        return next > 95 ? 95 : next; // Cap at 95% until actually finished
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [estimatedSeconds]);

  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-4 w-full max-w-sm mx-auto">
      <div className="relative">
        <svg
          className="w-16 h-16 animate-spin text-brand-primary/20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
        >
          <circle
            cx="12"
            cy="12"
            r="10"
            strokeWidth="3"
            className="opacity-25"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[10px] font-black text-brand-primary">
            {timeLeft}ث
          </span>
        </div>
      </div>

      <div className="text-center space-y-2 w-full">
        <p className="text-xs text-text-secondary font-bold leading-relaxed">
          {message}
        </p>

        <div className="w-full h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-brand-primary"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 1, ease: "linear" }}
          />
        </div>
        <p className="text-[9px] text-text-muted font-bold">
          الوقت المتبقي تقديراً: {timeLeft} ثواني
        </p>
      </div>
    </div>
  );
};
