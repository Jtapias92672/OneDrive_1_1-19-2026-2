import type { Meta, StoryObj } from '@storybook/react';
import Frame3 from './Frame3';

const meta: Meta<typeof Frame3> = {
  title: 'Components/Frame3',
  component: Frame3,
  tags: ['autodocs'],
  argTypes: {
    className: { control: 'text' }
  },
};

export default meta;
type Story = StoryObj<typeof Frame3>;

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