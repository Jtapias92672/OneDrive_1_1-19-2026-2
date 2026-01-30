import React from 'react';
import { render, screen } from '@testing-library/react';
import { ProvideRegisteredEmailAddress.IfFoundTheAResetEmailWillBeSendToThatAddress. } from './ProvideRegisteredEmailAddress.IfFoundTheAResetEmailWillBeSendToThatAddress.';

describe('ProvideRegisteredEmailAddress.IfFoundTheAResetEmailWillBeSendToThatAddress.', () => {
  it('renders without crashing', () => {
    render(<ProvideRegisteredEmailAddress.IfFoundTheAResetEmailWillBeSendToThatAddress. />);
    expect(screen.getByText('ProvideRegisteredEmailAddress.IfFoundTheAResetEmailWillBeSendToThatAddress.')).toBeInTheDocument();
  });
});
