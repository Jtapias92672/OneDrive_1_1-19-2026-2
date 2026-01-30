import type { Meta, StoryObj } from '@storybook/react';
import { Vector } from './Vector';

const meta: Meta<typeof Vector> = {
  title: 'Components/Vector',
  component: Vector,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Vector>;

export const Default: Story = {
  args: {},
};
