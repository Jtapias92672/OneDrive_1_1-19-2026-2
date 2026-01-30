import type { Meta, StoryObj } from '@storybook/react';
import { Username } from './Username';

const meta: Meta<typeof Username> = {
  title: 'Components/Username',
  component: Username,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Username>;

export const Default: Story = {
  args: {},
};
