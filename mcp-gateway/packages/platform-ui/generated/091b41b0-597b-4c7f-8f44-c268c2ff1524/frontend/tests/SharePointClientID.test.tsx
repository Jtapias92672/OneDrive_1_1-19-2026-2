import React from 'react';
import { render, screen } from '@testing-library/react';
import { SharePointClientID } from './SharePointClientID';

describe('SharePointClientID', () => {
  it('renders without crashing', () => {
    render(<SharePointClientID />);
    expect(screen.getByText('SharePointClientID')).toBeInTheDocument();
  });
});
