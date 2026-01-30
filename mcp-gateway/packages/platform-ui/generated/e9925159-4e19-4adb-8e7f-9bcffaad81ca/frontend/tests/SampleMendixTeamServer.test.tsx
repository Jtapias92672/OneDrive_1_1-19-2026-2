import React from 'react';
import { render, screen } from '@testing-library/react';
import { SampleMendixTeamServer } from './SampleMendixTeamServer';

describe('SampleMendixTeamServer', () => {
  it('renders without crashing', () => {
    render(<SampleMendixTeamServer />);
    expect(screen.getByText('SampleMendixTeamServer')).toBeInTheDocument();
  });
});
