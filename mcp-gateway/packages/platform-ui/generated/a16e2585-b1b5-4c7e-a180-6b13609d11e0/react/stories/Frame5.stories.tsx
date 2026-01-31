import type { Meta, StoryObj } from '@storybook/react';
import Frame5 from './Frame5';

const meta: Meta<typeof Frame5> = {
  title: 'Components/Frame5',
  component: Frame5,
  tags: ['autodocs'],
  argTypes: {
    className: { control: 'text' }
  },
};

export default meta;
type Story = StoryObj<typeof Frame5>;

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