import type { Meta, StoryObj } from '@storybook/react';
import { Group8 } from './Group8';

const meta: Meta<typeof Group8> = {
  title: 'Components/Group8',
  component: Group8,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Group8>;

export const Default: Story = {
  args: {},
};
