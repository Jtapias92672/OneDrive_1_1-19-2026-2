import type { Meta, StoryObj } from '@storybook/react';
import { Group13 } from './Group13';

const meta: Meta<typeof Group13> = {
  title: 'Components/Group13',
  component: Group13,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Group13>;

export const Default: Story = {
  args: {},
};
