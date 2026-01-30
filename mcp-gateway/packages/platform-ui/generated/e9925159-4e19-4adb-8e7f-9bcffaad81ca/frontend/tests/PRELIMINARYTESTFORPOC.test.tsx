import React from 'react';
import { render, screen } from '@testing-library/react';
import { PRELIMINARYTESTFORPOC } from './PRELIMINARYTESTFORPOC';

describe('PRELIMINARYTESTFORPOC', () => {
  it('renders without crashing', () => {
    render(<PRELIMINARYTESTFORPOC />);
    expect(screen.getByText('PRELIMINARYTESTFORPOC')).toBeInTheDocument();
  });
});
