import React from 'react';
import { render, screen } from '@testing-library/react';
import { MendixTeamServerLink } from './MendixTeamServerLink';

describe('MendixTeamServerLink', () => {
  it('renders without crashing', () => {
    render(<MendixTeamServerLink />);
    expect(screen.getByText('MendixTeamServerLink')).toBeInTheDocument();
  });
});
