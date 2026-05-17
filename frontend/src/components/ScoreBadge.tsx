interface ScoreBadgeProps {
  score: number;
}

export function ScoreBadge({ score }: ScoreBadgeProps) {
  const tone =
    score >= 85 ? "score-badge--excellent" : score >= 70 ? "score-badge--strong" : "score-badge--soft";

  return <span className={`score-badge ${tone}`}>{score}</span>;
}
