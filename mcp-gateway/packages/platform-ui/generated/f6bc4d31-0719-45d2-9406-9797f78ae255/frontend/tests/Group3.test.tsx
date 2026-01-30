import React from 'react';
import { render, screen } from '@testing-library/react';
import { Group3 } from './Group3';

describe('Group3', () => {
  it('renders without crashing', () => {
    render(<Group3 />);
    expect(screen.getByText('Group3')).toBeInTheDocument();
  });
});
