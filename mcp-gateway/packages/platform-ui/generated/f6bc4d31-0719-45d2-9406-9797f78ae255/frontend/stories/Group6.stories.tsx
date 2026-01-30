import type { Meta, StoryObj } from '@storybook/react';
import { Group6 } from './Group6';

const meta: Meta<typeof Group6> = {
  title: 'Components/Group6',
  component: Group6,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Group6>;

export const Default: Story = {
  args: {},
};
