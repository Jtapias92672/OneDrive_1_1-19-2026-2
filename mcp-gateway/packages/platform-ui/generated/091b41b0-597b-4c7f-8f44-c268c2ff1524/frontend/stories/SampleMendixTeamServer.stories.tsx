import type { Meta, StoryObj } from '@storybook/react';
import { SampleMendixTeamServer } from './SampleMendixTeamServer';

const meta: Meta<typeof SampleMendixTeamServer> = {
  title: 'Components/SampleMendixTeamServer',
  component: SampleMendixTeamServer,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof SampleMendixTeamServer>;

export const Default: Story = {
  args: {},
};
