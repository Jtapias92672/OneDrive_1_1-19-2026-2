import React from 'react';
import { render, screen } from '@testing-library/react';
import { Group10 } from './Group10';

describe('Group10', () => {
  it('renders without crashing', () => {
    render(<Group10 />);
    expect(screen.getByText('Group10')).toBeInTheDocument();
  });
});
