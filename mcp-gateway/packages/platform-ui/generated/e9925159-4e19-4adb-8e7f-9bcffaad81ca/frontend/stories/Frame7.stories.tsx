import type { Meta, StoryObj } from '@storybook/react';
import { Frame7 } from './Frame7';

const meta: Meta<typeof Frame7> = {
  title: 'Components/Frame7',
  component: Frame7,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Frame7>;

export const Default: Story = {
  args: {},
};
