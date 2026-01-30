import React from 'react';
import { render, screen } from '@testing-library/react';
import { Group11 } from './Group11';

describe('Group11', () => {
  it('renders without crashing', () => {
    render(<Group11 />);
    expect(screen.getByText('Group11')).toBeInTheDocument();
  });
});
