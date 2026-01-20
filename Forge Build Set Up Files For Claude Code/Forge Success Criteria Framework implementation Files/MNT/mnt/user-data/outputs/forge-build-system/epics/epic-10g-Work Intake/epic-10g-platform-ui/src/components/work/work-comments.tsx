/**
 * FORGE Platform UI - Work Comments
 * @epic 10g - Work Intake
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  MessageSquare, 
  Play, 
  CheckCircle, 
  ArrowRight,
  Send,
  RefreshCw
} from 'lucide-react';
import type { WorkComment, WorkStatus } from '@/lib/types/work';

interface WorkCommentsProps {
  comments: WorkComment[];
  workId: string;
}

export function WorkComments({ comments, workId }: WorkCommentsProps) {
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    
    setIsSubmitting(true);
    await new Promise(r => setTimeout(r, 500));
    setNewComment('');
    setIsSubmitting(false);
  };

  const formatTime = (iso: string) => {
    const date = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const statusLabels: Record<WorkStatus, string> = {
    draft: 'Draft',
    pending: 'Pending',
    running: 'Running',
    completed: 'Completed',
    failed: 'Failed',
    cancelled: 'Cancelled',
  };

  const renderComment = (comment: WorkComment) => {
    switch (comment.type) {
      case 'status_change':
        return (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ArrowRight className="h-4 w-4" />
            <span>
              Status changed from{' '}
              <span className="font-medium">{statusLabels[comment.previousStatus!]}</span>
              {' to '}
              <span className="font-medium">{statusLabels[comment.newStatus!]}</span>
            </span>
          </div>
        );
      
      case 'run_started':
        return (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Play className="h-4 w-4 text-blue-500" />
            <span>
              Started run{' '}
              <Link href={`/runs/${comment.runId}`} className="text-primary hover:underline">
                {comment.runId}
              </Link>
            </span>
          </div>
        );
      
      case 'run_completed':
        return (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span>
              Run{' '}
              <Link href={`/runs/${comment.runId}`} className="text-primary hover:underline">
                {comment.runId}
              </Link>
              {' '}completed
            </span>
          </div>
        );
      
      case 'ticket_sync':
        return (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <RefreshCw className="h-4 w-4" />
            <span>Synced with external ticket</span>
          </div>
        );
      
      default:
        return (
          <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Comment Form */}
      <form onSubmit={handleSubmit} className="forge-card">
        <div className="flex gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary shrink-0">
            U
          </div>
          <div className="flex-1">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              rows={2}
              className="forge-input resize-none"
            />
            <div className="flex justify-end mt-2">
              <button
                type="submit"
                disabled={isSubmitting || !newComment.trim()}
                className="forge-button px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                <Send className="h-4 w-4 mr-2" />
                {isSubmitting ? 'Posting...' : 'Post'}
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* Comments List */}
      <div className="space-y-4">
        {comments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No activity yet</p>
          </div>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="flex gap-3">
              {/* Avatar */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium shrink-0 ${
                comment.authorId === 'system' 
                  ? 'bg-muted text-muted-foreground' 
                  : 'bg-primary/10 text-primary'
              }`}>
                {comment.authorId === 'system' 
                  ? '⚡' 
                  : comment.authorName.split(' ').map(n => n[0]).join('')
                }
              </div>
              
              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{comment.authorName}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatTime(comment.createdAt)}
                  </span>
                  {comment.isEdited && (
                    <span className="text-xs text-muted-foreground">(edited)</span>
                  )}
                </div>
                <div className="mt-1">
                  {renderComment(comment)}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default WorkComments;
