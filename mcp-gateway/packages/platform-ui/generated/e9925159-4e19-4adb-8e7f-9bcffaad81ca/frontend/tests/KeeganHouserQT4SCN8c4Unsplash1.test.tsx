import React from 'react';
import { render, screen } from '@testing-library/react';
import { KeeganHouserQT4SCN8c4Unsplash1 } from './KeeganHouserQT4SCN8c4Unsplash1';

describe('KeeganHouserQT4SCN8c4Unsplash1', () => {
  it('renders without crashing', () => {
    render(<KeeganHouserQT4SCN8c4Unsplash1 />);
    expect(screen.getByText('KeeganHouserQT4SCN8c4Unsplash1')).toBeInTheDocument();
  });
});
