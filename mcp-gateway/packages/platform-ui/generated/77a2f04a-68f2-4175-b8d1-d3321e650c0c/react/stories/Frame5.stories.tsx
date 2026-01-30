import type { Meta, StoryObj } from '@storybook/react';
import { Frame5 } from './Frame5';

const meta: Meta<typeof Frame5> = {
  title: 'Components/Frame5',
  component: Frame5,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Frame5>;

export const Default: Story = {
  args: {},
};
