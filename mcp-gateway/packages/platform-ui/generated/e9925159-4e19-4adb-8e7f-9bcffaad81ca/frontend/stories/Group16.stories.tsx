import type { Meta, StoryObj } from '@storybook/react';
import { Group16 } from './Group16';

const meta: Meta<typeof Group16> = {
  title: 'Components/Group16',
  component: Group16,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Group16>;

export const Default: Story = {
  args: {},
};
