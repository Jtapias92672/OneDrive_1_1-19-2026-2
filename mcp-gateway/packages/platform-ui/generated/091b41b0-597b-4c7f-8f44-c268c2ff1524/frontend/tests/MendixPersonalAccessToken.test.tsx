import React from 'react';
import { render, screen } from '@testing-library/react';
import { MendixPersonalAccessToken } from './MendixPersonalAccessToken';

describe('MendixPersonalAccessToken', () => {
  it('renders without crashing', () => {
    render(<MendixPersonalAccessToken />);
    expect(screen.getByText('MendixPersonalAccessToken')).toBeInTheDocument();
  });
});
