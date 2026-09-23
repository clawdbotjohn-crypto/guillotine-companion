import { byeProximityClass, getByeProximity } from '../logic/byeProximity';

export function ByeWeekText({
  byeWeek,
  currentWeek,
  unavailableText = 'Bye unavailable',
}: {
  byeWeek: number | null | undefined;
  currentWeek: number | null | undefined;
  unavailableText?: string;
}) {
  const supported = Number.isInteger(byeWeek) && byeWeek! > 0;
  const text = supported ? `Bye Wk ${byeWeek}` : unavailableText;
  return (
    <span
      className={supported ? byeProximityClass(getByeProximity(byeWeek, currentWeek)) : 'text-[#6b6e99]'}
      aria-label={supported ? `Bye week ${byeWeek}` : unavailableText}
    >
      {text}
    </span>
  );
}
