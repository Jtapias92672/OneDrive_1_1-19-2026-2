import type { Meta, StoryObj } from '@storybook/react';
import Frame2 from './Frame2';

const meta: Meta<typeof Frame2> = {
  title: 'Components/Frame2',
  component: Frame2,
  tags: ['autodocs'],
  argTypes: {
    className: { control: 'text' }
  },
};

export default meta;
type Story = StoryObj<typeof Frame2>;

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