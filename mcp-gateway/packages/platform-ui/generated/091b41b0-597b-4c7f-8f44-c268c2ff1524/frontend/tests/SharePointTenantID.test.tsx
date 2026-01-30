import React from 'react';
import { render, screen } from '@testing-library/react';
import { SharePointTenantID } from './SharePointTenantID';

describe('SharePointTenantID', () => {
  it('renders without crashing', () => {
    render(<SharePointTenantID />);
    expect(screen.getByText('SharePointTenantID')).toBeInTheDocument();
  });
});
