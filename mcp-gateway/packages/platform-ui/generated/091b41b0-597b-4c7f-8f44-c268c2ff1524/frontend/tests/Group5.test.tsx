import React from 'react';
import { render, screen } from '@testing-library/react';
import { Group5 } from './Group5';

describe('Group5', () => {
  it('renders without crashing', () => {
    render(<Group5 />);
    expect(screen.getByText('Group5')).toBeInTheDocument();
  });
});
