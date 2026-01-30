import React from 'react';
import { render, screen } from '@testing-library/react';
import { SampleProjectName2 } from './SampleProjectName2';

describe('SampleProjectName2', () => {
  it('renders without crashing', () => {
    render(<SampleProjectName2 />);
    expect(screen.getByText('SampleProjectName2')).toBeInTheDocument();
  });
});
