import type { Meta, StoryObj } from '@storybook/react';
import { Group15 } from './Group15';

const meta: Meta<typeof Group15> = {
  title: 'Components/Group15',
  component: Group15,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Group15>;

export const Default: Story = {
  args: {},
};
