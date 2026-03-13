interface StarsProps {
  grade: number;
  maxGrade: number;
}

export default function Stars({ grade, maxGrade }: StarsProps) {
  const filled = '★'.repeat(grade);
  const empty = '☆'.repeat(Math.max(0, maxGrade - grade));
  return (
    <span className="stars">
      {filled}
      <span className="star-empty">{empty}</span>
    </span>
  );
}
