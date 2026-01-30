import React from 'react';
import { render, screen } from '@testing-library/react';
import { TranslationProjectDetails } from './TranslationProjectDetails';

describe('TranslationProjectDetails', () => {
  it('renders without crashing', () => {
    render(<TranslationProjectDetails />);
    expect(screen.getByText('TranslationProjectDetails')).toBeInTheDocument();
  });
});
