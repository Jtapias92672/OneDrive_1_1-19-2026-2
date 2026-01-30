import type { Meta, StoryObj } from '@storybook/react';
import { Frame4 } from './Frame4';

const meta: Meta<typeof Frame4> = {
  title: 'Components/Frame4',
  component: Frame4,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Frame4>;

export const Default: Story = {
  args: {},
};
