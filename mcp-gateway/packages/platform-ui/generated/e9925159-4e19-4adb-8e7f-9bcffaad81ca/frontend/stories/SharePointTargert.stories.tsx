import type { Meta, StoryObj } from '@storybook/react';
import { SharePointTargert } from './SharePointTargert';

const meta: Meta<typeof SharePointTargert> = {
  title: 'Components/SharePointTargert',
  component: SharePointTargert,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof SharePointTargert>;

export const Default: Story = {
  args: {},
};
