'use client';

import React, { memo } from 'react';

/**
 * Base skeleton pulse animation
 */
const Skeleton = memo(function Skeleton({
  className = '',
}: {
  className?: string;
}) {
  return (
    <div
      className={`animate-pulse bg-slate-200 rounded ${className}`}
      aria-hidden="true"
    />
  );
});

/**
 * Skeleton for card headers
 */
export const CardHeaderSkeleton = memo(function CardHeaderSkeleton() {
  return (
    <div className="flex items-center justify-between px-4 py-3.5">
      <div className="flex items-center gap-2">
        <Skeleton className="w-4 h-4 rounded" />
        <Skeleton className="w-24 h-4" />
      </div>
      <Skeleton className="w-16 h-5 rounded" />
    </div>
  );
});

/**
 * Skeleton for Evidence Packs card
 */
export const EvidencePacksSkeleton = memo(function EvidencePacksSkeleton() {
  return (
    <div className="mb-5 bg-white rounded-xl border border-gray-200 overflow-hidden">
      <CardHeaderSkeleton />
      <div className="p-4">
        <div className="flex gap-2 mb-4">
          <Skeleton className="flex-1 h-16 rounded-lg" />
          <Skeleton className="flex-1 h-16 rounded-lg" />
        </div>
        <div className="flex justify-between mb-3 py-2">
          <Skeleton className="w-20 h-10" />
          <Skeleton className="w-24 h-10" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-14 rounded-md" />
          <Skeleton className="h-14 rounded-md" />
          <Skeleton className="h-14 rounded-md" />
        </div>
      </div>
    </div>
  );
});

/**
 * Skeleton for CARS Framework card
 */
export const CarsFrameworkSkeleton = memo(function CarsFrameworkSkeleton() {
  return (
    <div className="mb-5 bg-white rounded-xl border border-gray-200 overflow-hidden">
      <CardHeaderSkeleton />
      <div className="p-4">
        <div className="flex justify-between items-center mb-4">
          <Skeleton className="w-28 h-4" />
          <Skeleton className="w-20 h-4" />
        </div>
        <Skeleton className="w-full h-10 rounded-lg mb-3" />
        <div className="space-y-2">
          <Skeleton className="h-8 rounded" />
          <Skeleton className="h-8 rounded" />
          <Skeleton className="h-8 rounded" />
          <Skeleton className="h-8 rounded" />
        </div>
      </div>
    </div>
  );
});

/**
 * Skeleton for Supply Chain card
 */
export const SupplyChainSkeleton = memo(function SupplyChainSkeleton() {
  return (
    <div className="mb-5 bg-white rounded-xl border border-gray-200 overflow-hidden">
      <CardHeaderSkeleton />
      <div className="p-4">
        <div className="grid grid-cols-2 gap-2 mb-3">
          <Skeleton className="h-20 rounded-lg" />
          <Skeleton className="h-20 rounded-lg" />
        </div>
        <div className="space-y-1.5">
          <Skeleton className="h-10 rounded-md" />
          <Skeleton className="h-10 rounded-md" />
          <Skeleton className="h-10 rounded-md" />
        </div>
      </div>
    </div>
  );
});

/**
 * Skeleton for Agent Memory card
 */
export const AgentMemorySkeleton = memo(function AgentMemorySkeleton() {
  return (
    <div className="mb-5 bg-white rounded-xl border border-gray-200 overflow-hidden">
      <CardHeaderSkeleton />
      <div className="p-4">
        <Skeleton className="w-full h-12 rounded-lg mb-4" />
        <div className="mb-4">
          <div className="flex justify-between mb-2">
            <Skeleton className="w-24 h-4" />
            <Skeleton className="w-16 h-6" />
          </div>
          <Skeleton className="w-full h-2 rounded" />
        </div>
        <div className="space-y-1.5">
          <Skeleton className="h-14 rounded-lg" />
          <Skeleton className="h-14 rounded-lg" />
        </div>
      </div>
    </div>
  );
});

/**
 * Skeleton for Verification card
 */
export const VerificationSkeleton = memo(function VerificationSkeleton() {
  return (
    <div className="mb-5 bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-2">
          <Skeleton className="w-4 h-4 rounded" />
          <Skeleton className="w-20 h-4" />
        </div>
        <Skeleton className="w-16 h-7 rounded-md" />
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-20 rounded-xl" />
      </div>
    </div>
  );
});

/**
 * Skeleton for main content area
 */
export const MainContentSkeleton = memo(function MainContentSkeleton() {
  return (
    <div className="w-full max-w-[900px]">
      <div className="flex justify-end mb-5">
        <Skeleton className="w-[60%] h-12 rounded-2xl" />
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200">
          <Skeleton className="w-40 h-5" />
        </div>
        <div className="p-5">
          <div className="grid grid-cols-3 gap-3 mb-5">
            <Skeleton className="h-16 rounded-xl" />
            <Skeleton className="h-16 rounded-xl" />
            <Skeleton className="h-16 rounded-xl" />
          </div>
          <Skeleton className="w-full h-24 rounded-xl mb-5" />
          <Skeleton className="w-full h-16 rounded-xl" />
        </div>
      </div>
    </div>
  );
});

/**
 * Full right panel skeleton
 */
export const RightPanelSkeleton = memo(function RightPanelSkeleton() {
  return (
    <div className="p-4">
      <EvidencePacksSkeleton />
      <CarsFrameworkSkeleton />
      <SupplyChainSkeleton />
      <AgentMemorySkeleton />
      <VerificationSkeleton />
    </div>
  );
});

export { Skeleton };
