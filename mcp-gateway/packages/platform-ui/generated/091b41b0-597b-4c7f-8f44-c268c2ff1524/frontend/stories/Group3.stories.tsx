import type { Meta, StoryObj } from '@storybook/react';
import { Group3 } from './Group3';

const meta: Meta<typeof Group3> = {
  title: 'Components/Group3',
  component: Group3,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Group3>;

export const Default: Story = {
  args: {},
};
