import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import Frame4 from '../components/Frame4';

describe('Frame4', () => {
  it('renders without crashing', () => {
    const { container } = render(<Frame4 />);
    expect(container).toBeInTheDocument();
  });

  it('accepts optional props', () => {
    const optionalProps = { children: <div>Child content</div>, className: "className value" };
    const { container } = render(<Frame4 {...optionalProps} />);
    expect(container).toBeInTheDocument();
  });

  it('has correct background color', () => {
    const { container } = render(<Frame4 />);
    const element = container.firstChild as HTMLElement;
    expect(element).toHaveStyle({ backgroundColor: 'rgba(255, 255, 255, 1)' });
  });
});