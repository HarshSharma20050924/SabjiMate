
import React, { useState } from 'react';

interface StarRatingProps {
  rating: number; // For display, can be float. For input, it's the current selection.
  onRatingChange?: (newRating: number) => void; // If provided, enables input mode
  count?: number | null;
  size?: 'sm' | 'md' | 'lg';
}

const StarIcon: React.FC<{
  isFilled: boolean;
  onClick?: () => void;
  onMouseEnter?: () => void;
  sizeClass: string;
}> = ({ isFilled, onClick, onMouseEnter, sizeClass }) => {
  const color = isFilled ? "text-yellow-400" : "text-gray-300";

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={`${sizeClass} ${color} ${onClick ? 'cursor-pointer' : ''}`}
      fill="currentColor"
      viewBox="0 0 24 24"
      stroke="currentColor"
      onClick={onClick}
      onMouseEnter={onMouseEnter}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={0}
        d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-3.356a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
      />
    </svg>
  );
};


const StarRating: React.FC<StarRatingProps> = ({ rating, onRatingChange, count, size = 'md' }) => {
  const [hoverRating, setHoverRating] = useState(0);

  const sizeClasses = { sm: 'w-3 h-3', md: 'w-5 h-5', lg: 'w-8 h-8' };
  const sizeClass = sizeClasses[size];

  return (
    <div className="flex items-center">
      <div
        className="flex"
        onMouseLeave={onRatingChange ? () => setHoverRating(0) : undefined}
      >
        {[1, 2, 3, 4, 5].map((star) => {
          const currentRatingForDisplay = onRatingChange ? (hoverRating > 0 ? hoverRating : rating) : rating;
          return (
            <StarIcon
              key={star}
              isFilled={star <= Math.round(currentRatingForDisplay)}
              onClick={onRatingChange ? () => onRatingChange(star) : undefined}
              onMouseEnter={onRatingChange ? () => setHoverRating(star) : undefined}
              sizeClass={sizeClass}
            />
          );
        })}
      </div>
      {count != null && <span className="text-gray-400 text-[10px] ml-1">({count})</span>}
      {!onRatingChange && rating > 0 && <span className="text-gray-600 font-bold text-[10px] ml-1">{rating.toFixed(1)}</span>}
    </div>
  );
};

export default StarRating;
