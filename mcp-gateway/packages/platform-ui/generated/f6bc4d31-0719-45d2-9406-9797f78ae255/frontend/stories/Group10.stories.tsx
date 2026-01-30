import type { Meta, StoryObj } from '@storybook/react';
import { Group10 } from './Group10';

const meta: Meta<typeof Group10> = {
  title: 'Components/Group10',
  component: Group10,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Group10>;

export const Default: Story = {
  args: {},
};
