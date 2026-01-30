import type { Meta, StoryObj } from '@storybook/react';
import { Frame1 } from './Frame1';

const meta: Meta<typeof Frame1> = {
  title: 'Components/Frame1',
  component: Frame1,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Frame1>;

export const Default: Story = {
  args: {},
};
