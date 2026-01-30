import React from 'react';
import { render, screen } from '@testing-library/react';
import { Group15 } from './Group15';

describe('Group15', () => {
  it('renders without crashing', () => {
    render(<Group15 />);
    expect(screen.getByText('Group15')).toBeInTheDocument();
  });
});
