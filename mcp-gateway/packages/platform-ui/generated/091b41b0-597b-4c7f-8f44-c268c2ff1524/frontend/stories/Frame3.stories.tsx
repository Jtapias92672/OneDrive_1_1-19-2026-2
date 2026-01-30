import type { Meta, StoryObj } from '@storybook/react';
import { Frame3 } from './Frame3';

const meta: Meta<typeof Frame3> = {
  title: 'Components/Frame3',
  component: Frame3,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Frame3>;

export const Default: Story = {
  args: {},
};
