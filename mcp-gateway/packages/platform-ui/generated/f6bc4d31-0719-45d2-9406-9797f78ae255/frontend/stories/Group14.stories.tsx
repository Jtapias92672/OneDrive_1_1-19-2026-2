import type { Meta, StoryObj } from '@storybook/react';
import { Group14 } from './Group14';

const meta: Meta<typeof Group14> = {
  title: 'Components/Group14',
  component: Group14,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Group14>;

export const Default: Story = {
  args: {},
};
