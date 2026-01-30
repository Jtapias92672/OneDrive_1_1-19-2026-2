import type { Meta, StoryObj } from '@storybook/react';
import { SharePointPath } from './SharePointPath';

const meta: Meta<typeof SharePointPath> = {
  title: 'Components/SharePointPath',
  component: SharePointPath,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof SharePointPath>;

export const Default: Story = {
  args: {},
};
