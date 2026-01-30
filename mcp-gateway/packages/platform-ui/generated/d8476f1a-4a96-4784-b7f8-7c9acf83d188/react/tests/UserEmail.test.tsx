import React from 'react';
import { render, screen } from '@testing-library/react';
import { UserEmail } from './UserEmail';

describe('UserEmail', () => {
  it('renders without crashing', () => {
    render(<UserEmail />);
    expect(screen.getByText('UserEmail')).toBeInTheDocument();
  });
});
