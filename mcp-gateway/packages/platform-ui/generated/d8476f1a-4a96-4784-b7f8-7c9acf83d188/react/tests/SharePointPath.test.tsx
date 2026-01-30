import React from 'react';
import { render, screen } from '@testing-library/react';
import { SharePointPath } from './SharePointPath';

describe('SharePointPath', () => {
  it('renders without crashing', () => {
    render(<SharePointPath />);
    expect(screen.getByText('SharePointPath')).toBeInTheDocument();
  });
});
