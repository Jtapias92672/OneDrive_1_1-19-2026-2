import React from 'react';
import { render, screen } from '@testing-library/react';
import { Rectangle } from './Rectangle';

describe('Rectangle', () => {
  it('renders without crashing', () => {
    render(<Rectangle />);
    expect(screen.getByText('Rectangle')).toBeInTheDocument();
  });
});
