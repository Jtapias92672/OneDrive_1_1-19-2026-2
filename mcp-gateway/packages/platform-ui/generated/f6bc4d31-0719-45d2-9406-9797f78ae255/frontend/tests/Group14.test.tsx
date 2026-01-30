import React from 'react';
import { render, screen } from '@testing-library/react';
import { Group14 } from './Group14';

describe('Group14', () => {
  it('renders without crashing', () => {
    render(<Group14 />);
    expect(screen.getByText('Group14')).toBeInTheDocument();
  });
});
