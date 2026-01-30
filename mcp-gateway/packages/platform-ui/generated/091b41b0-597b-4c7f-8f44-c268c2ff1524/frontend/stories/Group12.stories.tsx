import type { Meta, StoryObj } from '@storybook/react';
import { Group12 } from './Group12';

const meta: Meta<typeof Group12> = {
  title: 'Components/Group12',
  component: Group12,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Group12>;

export const Default: Story = {
  args: {},
};
