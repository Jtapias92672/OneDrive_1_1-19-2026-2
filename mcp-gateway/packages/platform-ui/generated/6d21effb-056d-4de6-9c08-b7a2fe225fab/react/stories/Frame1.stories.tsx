import type { Meta, StoryObj } from '@storybook/react';
import Frame1 from './Frame1';

const meta: Meta<typeof Frame1> = {
  title: 'Components/Frame1',
  component: Frame1,
  tags: ['autodocs'],
  argTypes: {
    className: { control: 'text' }
  },
};

export default meta;
type Story = StoryObj<typeof Frame1>;

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