import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProgressiveQuestion } from '../ProgressiveQuestion';
import { ProgressiveQuestion as ProgressiveQuestionType } from '@/lib/persona/types';

// Mock forgeSignals
jest.mock('@/lib/signals', () => ({
  forgeSignals: {
    track: jest.fn(),
  },
}));

import { forgeSignals } from '@/lib/signals';

describe('ProgressiveQuestion', () => {
  const mockOnAnswer = jest.fn();
  const mockOnSkip = jest.fn();
  const mockOnDismiss = jest.fn();

  const textQuestion: ProgressiveQuestionType = {
    id: 'pq-1',
    trigger: 'first_complex_task',
    questionText: "What's the context for this project?",
    inputType: 'text',
    skippable: true,
  };

  const ratingQuestion: ProgressiveQuestionType = {
    id: 'pq-2',
    trigger: 'day_7_checkin',
    questionText: "How's Forge working for you?",
    inputType: 'rating',
    options: ['1', '2', '3', '4', '5'],
    skippable: true,
  };

  const selectQuestion: ProgressiveQuestionType = {
    id: 'pq-3',
    trigger: 'first_success',
    questionText: 'What made this work?',
    inputType: 'select',
    options: ['Clear requirements', 'Good templates', 'Helpful feedback'],
    skippable: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders question text', () => {
    render(
      <ProgressiveQuestion
        question={textQuestion}
        onAnswer={mockOnAnswer}
        onSkip={mockOnSkip}
        onDismiss={mockOnDismiss}
      />
    );

    expect(screen.getByText("What's the context for this project?")).toBeInTheDocument();
  });

  it('renders header', () => {
    render(
      <ProgressiveQuestion
        question={textQuestion}
        onAnswer={mockOnAnswer}
        onSkip={mockOnSkip}
        onDismiss={mockOnDismiss}
      />
    );

    expect(screen.getByText('Quick Question')).toBeInTheDocument();
  });

  it('renders text input for text questions', () => {
    render(
      <ProgressiveQuestion
        question={textQuestion}
        onAnswer={mockOnAnswer}
        onSkip={mockOnSkip}
        onDismiss={mockOnDismiss}
      />
    );

    expect(screen.getByPlaceholderText('Your thoughts...')).toBeInTheDocument();
  });

  it('renders rating buttons for rating questions', () => {
    render(
      <ProgressiveQuestion
        question={ratingQuestion}
        onAnswer={mockOnAnswer}
        onSkip={mockOnSkip}
        onDismiss={mockOnDismiss}
      />
    );

    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('renders select dropdown for select questions', () => {
    render(
      <ProgressiveQuestion
        question={selectQuestion}
        onAnswer={mockOnAnswer}
        onSkip={mockOnSkip}
        onDismiss={mockOnDismiss}
      />
    );

    expect(screen.getByText('Select an option...')).toBeInTheDocument();
  });

  it('disables submit when text is empty', () => {
    render(
      <ProgressiveQuestion
        question={textQuestion}
        onAnswer={mockOnAnswer}
        onSkip={mockOnSkip}
        onDismiss={mockOnDismiss}
      />
    );

    const submitButton = screen.getByText('Submit');
    expect(submitButton).toBeDisabled();
  });

  it('enables submit when text is entered', () => {
    render(
      <ProgressiveQuestion
        question={textQuestion}
        onAnswer={mockOnAnswer}
        onSkip={mockOnSkip}
        onDismiss={mockOnDismiss}
      />
    );

    const textarea = screen.getByPlaceholderText('Your thoughts...');
    fireEvent.change(textarea, { target: { value: 'Some response' } });

    const submitButton = screen.getByText('Submit');
    expect(submitButton).not.toBeDisabled();
  });

  it('calls onAnswer with response when submitted', () => {
    render(
      <ProgressiveQuestion
        question={textQuestion}
        onAnswer={mockOnAnswer}
        onSkip={mockOnSkip}
        onDismiss={mockOnDismiss}
      />
    );

    const textarea = screen.getByPlaceholderText('Your thoughts...');
    fireEvent.change(textarea, { target: { value: 'My response' } });

    fireEvent.click(screen.getByText('Submit'));

    expect(mockOnAnswer).toHaveBeenCalledWith('My response');
  });

  it('tracks answer signal when submitted', () => {
    render(
      <ProgressiveQuestion
        question={textQuestion}
        onAnswer={mockOnAnswer}
        onSkip={mockOnSkip}
        onDismiss={mockOnDismiss}
      />
    );

    const textarea = screen.getByPlaceholderText('Your thoughts...');
    fireEvent.change(textarea, { target: { value: 'My response' } });

    fireEvent.click(screen.getByText('Submit'));

    expect(forgeSignals.track).toHaveBeenCalledWith('progressive_question_answered', {
      questionId: 'pq-1',
      trigger: 'first_complex_task',
      hasResponse: true,
    });
  });

  it('calls onSkip when skip clicked', () => {
    render(
      <ProgressiveQuestion
        question={textQuestion}
        onAnswer={mockOnAnswer}
        onSkip={mockOnSkip}
        onDismiss={mockOnDismiss}
      />
    );

    fireEvent.click(screen.getByText('Skip for now'));

    expect(mockOnSkip).toHaveBeenCalled();
  });

  it('tracks skip signal when skipped', () => {
    render(
      <ProgressiveQuestion
        question={textQuestion}
        onAnswer={mockOnAnswer}
        onSkip={mockOnSkip}
        onDismiss={mockOnDismiss}
      />
    );

    fireEvent.click(screen.getByText('Skip for now'));

    expect(forgeSignals.track).toHaveBeenCalledWith('progressive_question_skipped', {
      questionId: 'pq-1',
      trigger: 'first_complex_task',
    });
  });

  it('calls onDismiss when X clicked', () => {
    render(
      <ProgressiveQuestion
        question={textQuestion}
        onAnswer={mockOnAnswer}
        onSkip={mockOnSkip}
        onDismiss={mockOnDismiss}
      />
    );

    fireEvent.click(screen.getByLabelText('Dismiss'));

    expect(mockOnDismiss).toHaveBeenCalled();
  });

  it('handles rating selection', () => {
    render(
      <ProgressiveQuestion
        question={ratingQuestion}
        onAnswer={mockOnAnswer}
        onSkip={mockOnSkip}
        onDismiss={mockOnDismiss}
      />
    );

    fireEvent.click(screen.getByText('4'));
    fireEvent.click(screen.getByText('Submit'));

    expect(mockOnAnswer).toHaveBeenCalledWith('4');
  });

  it('does not show skip button when not skippable', () => {
    const nonSkippable: ProgressiveQuestionType = {
      ...textQuestion,
      skippable: false,
    };

    render(
      <ProgressiveQuestion
        question={nonSkippable}
        onAnswer={mockOnAnswer}
        onSkip={mockOnSkip}
        onDismiss={mockOnDismiss}
      />
    );

    expect(screen.queryByText('Skip for now')).not.toBeInTheDocument();
  });
});
