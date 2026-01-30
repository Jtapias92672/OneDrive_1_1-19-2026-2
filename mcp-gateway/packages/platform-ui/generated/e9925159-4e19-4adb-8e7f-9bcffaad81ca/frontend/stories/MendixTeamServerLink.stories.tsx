import type { Meta, StoryObj } from '@storybook/react';
import { MendixTeamServerLink } from './MendixTeamServerLink';

const meta: Meta<typeof MendixTeamServerLink> = {
  title: 'Components/MendixTeamServerLink',
  component: MendixTeamServerLink,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof MendixTeamServerLink>;

export const Default: Story = {
  args: {},
};
