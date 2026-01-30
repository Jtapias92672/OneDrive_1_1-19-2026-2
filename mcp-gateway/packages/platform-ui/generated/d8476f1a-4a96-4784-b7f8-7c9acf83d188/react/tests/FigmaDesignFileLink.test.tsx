import React from 'react';
import { render, screen } from '@testing-library/react';
import { FigmaDesignFileLink } from './FigmaDesignFileLink';

describe('FigmaDesignFileLink', () => {
  it('renders without crashing', () => {
    render(<FigmaDesignFileLink />);
    expect(screen.getByText('FigmaDesignFileLink')).toBeInTheDocument();
  });
});
