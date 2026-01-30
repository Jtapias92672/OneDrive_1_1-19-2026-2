import React from 'react';
import { render, screen } from '@testing-library/react';
import { Password } from './Password';

describe('Password', () => {
  it('renders without crashing', () => {
    render(<Password />);
    expect(screen.getByText('Password')).toBeInTheDocument();
  });
});
