import type { Meta, StoryObj } from '@storybook/react';
import { SharePointClientSecret } from './SharePointClientSecret';

const meta: Meta<typeof SharePointClientSecret> = {
  title: 'Components/SharePointClientSecret',
  component: SharePointClientSecret,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof SharePointClientSecret>;

export const Default: Story = {
  args: {},
};
