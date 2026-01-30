import React from 'react';
import { render, screen } from '@testing-library/react';
import { SampleFigmaLink } from './SampleFigmaLink';

describe('SampleFigmaLink', () => {
  it('renders without crashing', () => {
    render(<SampleFigmaLink />);
    expect(screen.getByText('SampleFigmaLink')).toBeInTheDocument();
  });
});
