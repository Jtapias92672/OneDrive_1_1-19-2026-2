import React from 'react';
import { render, screen } from '@testing-library/react';
import { MendixRepositoryName } from './MendixRepositoryName';

describe('MendixRepositoryName', () => {
  it('renders without crashing', () => {
    render(<MendixRepositoryName />);
    expect(screen.getByText('MendixRepositoryName')).toBeInTheDocument();
  });
});
