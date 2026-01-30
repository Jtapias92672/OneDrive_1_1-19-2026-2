import type { Meta, StoryObj } from '@storybook/react';
import { Frame2 } from './Frame2';

const meta: Meta<typeof Frame2> = {
  title: 'Components/Frame2',
  component: Frame2,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Frame2>;

export const Default: Story = {
  args: {},
};
