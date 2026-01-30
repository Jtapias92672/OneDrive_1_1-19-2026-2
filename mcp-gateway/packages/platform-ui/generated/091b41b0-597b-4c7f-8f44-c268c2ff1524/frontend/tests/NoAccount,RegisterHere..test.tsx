import React from 'react';
import { render, screen } from '@testing-library/react';
import { NoAccount,RegisterHere. } from './NoAccount,RegisterHere.';

describe('NoAccount,RegisterHere.', () => {
  it('renders without crashing', () => {
    render(<NoAccount,RegisterHere. />);
    expect(screen.getByText('NoAccount,RegisterHere.')).toBeInTheDocument();
  });
});
