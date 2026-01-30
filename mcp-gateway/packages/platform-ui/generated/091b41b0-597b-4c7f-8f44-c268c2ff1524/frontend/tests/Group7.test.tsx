import React from 'react';
import { render, screen } from '@testing-library/react';
import { Group7 } from './Group7';

describe('Group7', () => {
  it('renders without crashing', () => {
    render(<Group7 />);
    expect(screen.getByText('Group7')).toBeInTheDocument();
  });
});
