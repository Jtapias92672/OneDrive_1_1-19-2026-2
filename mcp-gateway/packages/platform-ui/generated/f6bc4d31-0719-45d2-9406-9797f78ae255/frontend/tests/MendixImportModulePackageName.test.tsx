import React from 'react';
import { render, screen } from '@testing-library/react';
import { MendixImportModulePackageName } from './MendixImportModulePackageName';

describe('MendixImportModulePackageName', () => {
  it('renders without crashing', () => {
    render(<MendixImportModulePackageName />);
    expect(screen.getByText('MendixImportModulePackageName')).toBeInTheDocument();
  });
});
