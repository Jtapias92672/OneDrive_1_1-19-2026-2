import type { Meta, StoryObj } from '@storybook/react';
import { Rectangle } from './Rectangle';

const meta: Meta<typeof Rectangle> = {
  title: 'Components/Rectangle',
  component: Rectangle,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Rectangle>;

export const Default: Story = {
  args: {},
};
