import React from 'react';
import { render, screen } from '@testing-library/react';
import { SharePointTargert } from './SharePointTargert';

describe('SharePointTargert', () => {
  it('renders without crashing', () => {
    render(<SharePointTargert />);
    expect(screen.getByText('SharePointTargert')).toBeInTheDocument();
  });
});
