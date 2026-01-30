import type { Meta, StoryObj } from '@storybook/react';
import { Group17 } from './Group17';

const meta: Meta<typeof Group17> = {
  title: 'Components/Group17',
  component: Group17,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Group17>;

export const Default: Story = {
  args: {},
};
