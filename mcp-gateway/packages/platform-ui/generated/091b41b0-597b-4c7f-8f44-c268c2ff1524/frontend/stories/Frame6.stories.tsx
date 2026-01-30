import type { Meta, StoryObj } from '@storybook/react';
import { Frame6 } from './Frame6';

const meta: Meta<typeof Frame6> = {
  title: 'Components/Frame6',
  component: Frame6,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Frame6>;

export const Default: Story = {
  args: {},
};
