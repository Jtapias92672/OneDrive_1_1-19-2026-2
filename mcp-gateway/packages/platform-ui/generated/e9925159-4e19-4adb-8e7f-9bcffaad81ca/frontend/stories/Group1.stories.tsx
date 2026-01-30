import type { Meta, StoryObj } from '@storybook/react';
import { Group1 } from './Group1';

const meta: Meta<typeof Group1> = {
  title: 'Components/Group1',
  component: Group1,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Group1>;

export const Default: Story = {
  args: {},
};
