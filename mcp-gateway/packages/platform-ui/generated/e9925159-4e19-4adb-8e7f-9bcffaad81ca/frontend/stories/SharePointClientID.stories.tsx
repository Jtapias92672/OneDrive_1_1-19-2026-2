import type { Meta, StoryObj } from '@storybook/react';
import { SharePointClientID } from './SharePointClientID';

const meta: Meta<typeof SharePointClientID> = {
  title: 'Components/SharePointClientID',
  component: SharePointClientID,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof SharePointClientID>;

export const Default: Story = {
  args: {},
};
