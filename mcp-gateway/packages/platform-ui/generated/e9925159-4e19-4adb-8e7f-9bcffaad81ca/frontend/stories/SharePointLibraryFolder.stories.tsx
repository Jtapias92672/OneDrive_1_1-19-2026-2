import type { Meta, StoryObj } from '@storybook/react';
import { SharePointLibraryFolder } from './SharePointLibraryFolder';

const meta: Meta<typeof SharePointLibraryFolder> = {
  title: 'Components/SharePointLibraryFolder',
  component: SharePointLibraryFolder,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof SharePointLibraryFolder>;

export const Default: Story = {
  args: {},
};
