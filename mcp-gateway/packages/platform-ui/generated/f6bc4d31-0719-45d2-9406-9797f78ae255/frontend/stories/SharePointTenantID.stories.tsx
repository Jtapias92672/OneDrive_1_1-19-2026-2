import type { Meta, StoryObj } from '@storybook/react';
import { SharePointTenantID } from './SharePointTenantID';

const meta: Meta<typeof SharePointTenantID> = {
  title: 'Components/SharePointTenantID',
  component: SharePointTenantID,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof SharePointTenantID>;

export const Default: Story = {
  args: {},
};
