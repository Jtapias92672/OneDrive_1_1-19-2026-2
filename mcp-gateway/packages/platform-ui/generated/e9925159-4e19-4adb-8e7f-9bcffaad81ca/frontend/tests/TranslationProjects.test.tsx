import React from 'react';
import { render, screen } from '@testing-library/react';
import { TranslationProjects } from './TranslationProjects';

describe('TranslationProjects', () => {
  it('renders without crashing', () => {
    render(<TranslationProjects />);
    expect(screen.getByText('TranslationProjects')).toBeInTheDocument();
  });
});
