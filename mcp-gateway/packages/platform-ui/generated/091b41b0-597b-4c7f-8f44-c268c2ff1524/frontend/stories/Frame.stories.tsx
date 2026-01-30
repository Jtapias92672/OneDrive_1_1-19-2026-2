import type { Meta, StoryObj } from '@storybook/react';
import { Frame } from './Frame';

const meta: Meta<typeof Frame> = {
  title: 'Components/Frame',
  component: Frame,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Frame>;

export const Default: Story = {
  args: {},
};
