import React from 'react';
import { render, screen } from '@testing-library/react';
import { SharePointSite } from './SharePointSite';

describe('SharePointSite', () => {
  it('renders without crashing', () => {
    render(<SharePointSite />);
    expect(screen.getByText('SharePointSite')).toBeInTheDocument();
  });
});
