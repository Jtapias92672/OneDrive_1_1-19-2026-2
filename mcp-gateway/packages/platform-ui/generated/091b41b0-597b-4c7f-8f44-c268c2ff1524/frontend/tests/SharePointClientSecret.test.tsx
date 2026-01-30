import React from 'react';
import { render, screen } from '@testing-library/react';
import { SharePointClientSecret } from './SharePointClientSecret';

describe('SharePointClientSecret', () => {
  it('renders without crashing', () => {
    render(<SharePointClientSecret />);
    expect(screen.getByText('SharePointClientSecret')).toBeInTheDocument();
  });
});
