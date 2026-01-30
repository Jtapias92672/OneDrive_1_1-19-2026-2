import type { Meta, StoryObj } from '@storybook/react';
import { Group11 } from './Group11';

const meta: Meta<typeof Group11> = {
  title: 'Components/Group11',
  component: Group11,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Group11>;

export const Default: Story = {
  args: {},
};
