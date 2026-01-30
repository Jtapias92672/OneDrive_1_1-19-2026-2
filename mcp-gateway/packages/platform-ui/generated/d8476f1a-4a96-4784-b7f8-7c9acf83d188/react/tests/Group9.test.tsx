import React from 'react';
import { render, screen } from '@testing-library/react';
import { Group9 } from './Group9';

describe('Group9', () => {
  it('renders without crashing', () => {
    render(<Group9 />);
    expect(screen.getByText('Group9')).toBeInTheDocument();
  });
});
