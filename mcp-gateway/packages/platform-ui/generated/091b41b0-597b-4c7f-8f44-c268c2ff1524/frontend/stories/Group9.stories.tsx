import type { Meta, StoryObj } from '@storybook/react';
import { Group9 } from './Group9';

const meta: Meta<typeof Group9> = {
  title: 'Components/Group9',
  component: Group9,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Group9>;

export const Default: Story = {
  args: {},
};
