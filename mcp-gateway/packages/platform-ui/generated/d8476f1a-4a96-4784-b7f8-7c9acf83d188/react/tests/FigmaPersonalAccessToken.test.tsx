import React from 'react';
import { render, screen } from '@testing-library/react';
import { FigmaPersonalAccessToken } from './FigmaPersonalAccessToken';

describe('FigmaPersonalAccessToken', () => {
  it('renders without crashing', () => {
    render(<FigmaPersonalAccessToken />);
    expect(screen.getByText('FigmaPersonalAccessToken')).toBeInTheDocument();
  });
});
