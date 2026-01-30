import type { Meta, StoryObj } from '@storybook/react';
import { Group5 } from './Group5';

const meta: Meta<typeof Group5> = {
  title: 'Components/Group5',
  component: Group5,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Group5>;

export const Default: Story = {
  args: {},
};
