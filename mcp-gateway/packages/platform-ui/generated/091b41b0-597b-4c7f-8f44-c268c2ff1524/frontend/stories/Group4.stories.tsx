import type { Meta, StoryObj } from '@storybook/react';
import { Group4 } from './Group4';

const meta: Meta<typeof Group4> = {
  title: 'Components/Group4',
  component: Group4,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Group4>;

export const Default: Story = {
  args: {},
};
