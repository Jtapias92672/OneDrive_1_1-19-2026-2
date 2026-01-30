import React from 'react';
import { render, screen } from '@testing-library/react';
import { Group12 } from './Group12';

describe('Group12', () => {
  it('renders without crashing', () => {
    render(<Group12 />);
    expect(screen.getByText('Group12')).toBeInTheDocument();
  });
});
