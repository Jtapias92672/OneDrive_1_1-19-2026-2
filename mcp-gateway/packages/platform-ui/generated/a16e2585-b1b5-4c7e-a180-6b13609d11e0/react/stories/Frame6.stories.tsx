import type { Meta, StoryObj } from '@storybook/react';
import Frame6 from './Frame6';

const meta: Meta<typeof Frame6> = {
  title: 'Components/Frame6',
  component: Frame6,
  tags: ['autodocs'],
  argTypes: {
    className: { control: 'text' }
  },
};

export default meta;
type Story = StoryObj<typeof Frame6>;

export const Default: Story = {
  args: {
    children: <div>Child content</div>,
    className: "className value",
  },
};

export const WithProps: Story = {
  args: {
    children: <div>Child content</div>,
    className: "className value",
  },
};

export const WithBackground: Story = {
  args: {
    children: <div>Child content</div>,
    className: "className value",
  },
  parameters: {
    backgrounds: {
      default: 'dark',
      values: [
        { name: 'dark', value: '#333333' },
        { name: 'light', value: '#ffffff' },
      ],
    },
  },
};