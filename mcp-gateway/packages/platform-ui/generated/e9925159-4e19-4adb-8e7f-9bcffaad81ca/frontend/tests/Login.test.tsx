import React from 'react';
import { render, screen } from '@testing-library/react';
import { Login } from './Login';

describe('Login', () => {
  it('renders without crashing', () => {
    render(<Login />);
    expect(screen.getByText('Login')).toBeInTheDocument();
  });
});
