import React from 'react';
import { render, screen } from '@testing-library/react';
import { Username } from './Username';

describe('Username', () => {
  it('renders without crashing', () => {
    render(<Username />);
    expect(screen.getByText('Username')).toBeInTheDocument();
  });
});
