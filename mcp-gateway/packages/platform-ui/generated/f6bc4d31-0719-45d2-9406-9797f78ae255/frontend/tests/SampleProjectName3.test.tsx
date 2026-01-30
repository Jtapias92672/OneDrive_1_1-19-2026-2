import React from 'react';
import { render, screen } from '@testing-library/react';
import { SampleProjectName3 } from './SampleProjectName3';

describe('SampleProjectName3', () => {
  it('renders without crashing', () => {
    render(<SampleProjectName3 />);
    expect(screen.getByText('SampleProjectName3')).toBeInTheDocument();
  });
});
