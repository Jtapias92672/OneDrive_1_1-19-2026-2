import type { Meta, StoryObj } from '@storybook/react';
import { Group7 } from './Group7';

const meta: Meta<typeof Group7> = {
  title: 'Components/Group7',
  component: Group7,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Group7>;

export const Default: Story = {
  args: {},
};
