import React from 'react';
import { render, screen } from '@testing-library/react';
import { Name } from './Name';

describe('Name', () => {
  it('renders without crashing', () => {
    render(<Name />);
    expect(screen.getByText('Name')).toBeInTheDocument();
  });
});
