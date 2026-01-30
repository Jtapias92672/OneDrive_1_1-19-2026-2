import React from 'react';
import { render, screen } from '@testing-library/react';
import { SampleSharePoint } from './SampleSharePoint';

describe('SampleSharePoint', () => {
  it('renders without crashing', () => {
    render(<SampleSharePoint />);
    expect(screen.getByText('SampleSharePoint')).toBeInTheDocument();
  });
});
