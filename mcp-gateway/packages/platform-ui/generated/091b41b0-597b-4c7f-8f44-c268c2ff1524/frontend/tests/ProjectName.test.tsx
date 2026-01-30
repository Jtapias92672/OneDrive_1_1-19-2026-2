import React from 'react';
import { render, screen } from '@testing-library/react';
import { ProjectName } from './ProjectName';

describe('ProjectName', () => {
  it('renders without crashing', () => {
    render(<ProjectName />);
    expect(screen.getByText('ProjectName')).toBeInTheDocument();
  });
});
