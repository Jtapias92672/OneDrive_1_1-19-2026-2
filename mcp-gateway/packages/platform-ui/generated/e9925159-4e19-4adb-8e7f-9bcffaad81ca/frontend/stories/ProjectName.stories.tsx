import type { Meta, StoryObj } from '@storybook/react';
import { ProjectName } from './ProjectName';

const meta: Meta<typeof ProjectName> = {
  title: 'Components/ProjectName',
  component: ProjectName,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof ProjectName>;

export const Default: Story = {
  args: {},
};
