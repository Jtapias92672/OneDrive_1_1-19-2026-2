import type { Meta, StoryObj } from '@storybook/react';
import { Group2 } from './Group2';

const meta: Meta<typeof Group2> = {
  title: 'Components/Group2',
  component: Group2,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Group2>;

export const Default: Story = {
  args: {},
};
