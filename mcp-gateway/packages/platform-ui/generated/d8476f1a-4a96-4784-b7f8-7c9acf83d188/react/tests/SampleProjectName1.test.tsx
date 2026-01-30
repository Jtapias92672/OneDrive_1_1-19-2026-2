import React from 'react';
import { render, screen } from '@testing-library/react';
import { SampleProjectName1 } from './SampleProjectName1';

describe('SampleProjectName1', () => {
  it('renders without crashing', () => {
    render(<SampleProjectName1 />);
    expect(screen.getByText('SampleProjectName1')).toBeInTheDocument();
  });
});
