import type { Meta, StoryObj } from '@storybook/react';
import { SharePointSite } from './SharePointSite';

const meta: Meta<typeof SharePointSite> = {
  title: 'Components/SharePointSite',
  component: SharePointSite,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof SharePointSite>;

export const Default: Story = {
  args: {},
};
