'use client';

import { PendingReview } from '@/lib/persona/compliance-types';

interface PendingReviewsProps {
  reviews: PendingReview[];
  onReview?: (review: PendingReview) => void;
  onViewAll?: () => void;
}

export function PendingReviews({ reviews, onReview, onViewAll }: PendingReviewsProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 h-full">
      <div className="p-4 border-b border-gray-100">
        <h3 className="font-semibold text-gray-900">Pending Reviews</h3>
      </div>

      <div className="p-4">
        {reviews.length === 0 ? (
          <div className="text-center py-6">
            <CheckCircleIcon />
            <p className="text-sm text-gray-500 mt-2">No pending reviews</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {reviews.map((review) => (
              <PendingReviewItem
                key={review.id}
                review={review}
                onReview={() => onReview?.(review)}
              />
            ))}
          </ul>
        )}

        <button
          onClick={onViewAll}
          className="w-full mt-4 text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          View All Pending →
        </button>
      </div>
    </div>
  );
}

interface PendingReviewItemProps {
  review: PendingReview;
  onReview?: () => void;
}

function PendingReviewItem({ review, onReview }: PendingReviewItemProps) {
  const priorityColors: Record<string, string> = {
    high: 'bg-red-100 text-red-700',
    medium: 'bg-amber-100 text-amber-700',
    low: 'bg-gray-100 text-gray-700',
  };

  return (
    <div className="p-3 bg-gray-50 rounded-lg">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <LockIcon />
          <span className="font-medium text-gray-900 text-sm">{review.projectName}</span>
        </div>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded ${priorityColors[review.priority]}`}>
          {review.priority}
        </span>
      </div>
      <p className="text-sm text-gray-500 mb-3">{review.reason}</p>
      <button
        onClick={onReview}
        className="text-sm text-blue-600 hover:text-blue-700 font-medium px-3 py-1.5 rounded border border-blue-200 hover:bg-blue-50 transition-colors"
      >
        Review Now
      </button>
    </div>
  );
}

function LockIcon() {
  return (
    <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg className="w-12 h-12 text-green-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
