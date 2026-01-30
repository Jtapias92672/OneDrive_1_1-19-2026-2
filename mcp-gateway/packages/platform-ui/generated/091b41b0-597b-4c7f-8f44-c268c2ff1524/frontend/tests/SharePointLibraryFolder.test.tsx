import React from 'react';
import { render, screen } from '@testing-library/react';
import { SharePointLibraryFolder } from './SharePointLibraryFolder';

describe('SharePointLibraryFolder', () => {
  it('renders without crashing', () => {
    render(<SharePointLibraryFolder />);
    expect(screen.getByText('SharePointLibraryFolder')).toBeInTheDocument();
  });
});
