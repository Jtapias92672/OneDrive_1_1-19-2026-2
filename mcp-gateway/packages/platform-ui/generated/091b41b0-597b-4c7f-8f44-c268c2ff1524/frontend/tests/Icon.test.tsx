import React from 'react';
import { render, screen } from '@testing-library/react';
import { Icon } from './Icon';

describe('Icon', () => {
  it('renders without crashing', () => {
    render(<Icon />);
    expect(screen.getByText('Icon')).toBeInTheDocument();
  });
});
