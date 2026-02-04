import type { NutriScoreGrade } from '@/types';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface NutriScoreBadgeProps {
  grade: NutriScoreGrade;
  size?: 'sm' | 'md';
}

const GRADE_COLORS: Record<NutriScoreGrade, { bg: string; text: string }> = {
  a: { bg: 'bg-green-500', text: 'text-white' },
  b: { bg: 'bg-lime-400', text: 'text-gray-900' },
  c: { bg: 'bg-yellow-400', text: 'text-gray-900' },
  d: { bg: 'bg-orange-400', text: 'text-white' },
  e: { bg: 'bg-red-500', text: 'text-white' },
  unknown: { bg: 'bg-gray-300', text: 'text-gray-600' },
};

const GRADE_DESCRIPTIONS: Record<Exclude<NutriScoreGrade, 'unknown'>, string> = {
  a: 'Excellent nutritional quality',
  b: 'Good nutritional quality',
  c: 'Average nutritional quality',
  d: 'Poor nutritional quality',
  e: 'Bad nutritional quality',
};

export function NutriScoreBadge({ grade, size = 'sm' }: NutriScoreBadgeProps) {
  if (grade === 'unknown') {
    return null;
  }

  const colors = GRADE_COLORS[grade];
  const sizeClasses = size === 'sm'
    ? 'text-xs px-1.5 py-0.5'
    : 'text-sm px-2 py-1';

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={`inline-flex items-center font-bold rounded cursor-help ${colors.bg} ${colors.text} ${sizeClasses}`}
        >
          {grade.toUpperCase()}
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <div className="space-y-2">
          <p className="font-semibold">Nutri-Score {grade.toUpperCase()}</p>
          <p className="text-muted-foreground">{GRADE_DESCRIPTIONS[grade]}</p>
          <div className="flex gap-1 pt-1">
            {(['a', 'b', 'c', 'd', 'e'] as const).map((g) => (
              <span
                key={g}
                className={`w-5 h-5 flex items-center justify-center text-xs font-bold rounded ${GRADE_COLORS[g].bg} ${GRADE_COLORS[g].text} ${g === grade ? 'ring-2 ring-foreground ring-offset-1' : 'opacity-50'}`}
              >
                {g.toUpperCase()}
              </span>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">A = best, E = worst</p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
