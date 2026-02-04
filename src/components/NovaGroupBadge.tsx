import type { NovaGroup } from '@/types';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface NovaGroupBadgeProps {
  group: NovaGroup;
  size?: 'sm' | 'md';
  showLabel?: boolean;
}

const GROUP_INFO: Record<1 | 2 | 3 | 4, { label: string; description: string; color: string; textColor: string }> = {
  1: {
    label: 'Unprocessed',
    description: 'Unprocessed or minimally processed foods (fresh fruits, vegetables, meat, eggs)',
    color: 'bg-green-100 dark:bg-green-900/30',
    textColor: 'text-green-700 dark:text-green-400',
  },
  2: {
    label: 'Processed culinary',
    description: 'Processed culinary ingredients (oils, butter, sugar, salt, flour)',
    color: 'bg-yellow-100 dark:bg-yellow-900/30',
    textColor: 'text-yellow-700 dark:text-yellow-400',
  },
  3: {
    label: 'Processed',
    description: 'Processed foods (canned vegetables, cheese, bread)',
    color: 'bg-orange-100 dark:bg-orange-900/30',
    textColor: 'text-orange-700 dark:text-orange-400',
  },
  4: {
    label: 'Ultra-processed',
    description: 'Ultra-processed foods (soft drinks, chips, candy, instant noodles)',
    color: 'bg-red-100 dark:bg-red-900/30',
    textColor: 'text-red-700 dark:text-red-400',
  },
};

export function NovaGroupBadge({ group, size = 'sm', showLabel = false }: NovaGroupBadgeProps) {
  if (group === null) {
    return null;
  }

  const info = GROUP_INFO[group];
  const sizeClasses = size === 'sm'
    ? 'text-xs px-1.5 py-0.5'
    : 'text-sm px-2 py-1';

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={`inline-flex items-center gap-1 font-medium rounded cursor-help ${info.color} ${info.textColor} ${sizeClasses}`}
        >
          <span className="font-bold">NOVA {group}</span>
          {showLabel && <span className="hidden sm:inline">- {info.label}</span>}
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <div className="space-y-2">
          <p className="font-semibold">NOVA {group}: {info.label}</p>
          <p className="text-muted-foreground">{info.description}</p>
          <div className="flex gap-1 pt-1">
            {([1, 2, 3, 4] as const).map((g) => (
              <span
                key={g}
                className={`w-6 h-5 flex items-center justify-center text-xs font-bold rounded ${GROUP_INFO[g].color} ${GROUP_INFO[g].textColor} ${g === group ? 'ring-2 ring-foreground ring-offset-1' : 'opacity-50'}`}
              >
                {g}
              </span>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">1 = least processed, 4 = most processed</p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
