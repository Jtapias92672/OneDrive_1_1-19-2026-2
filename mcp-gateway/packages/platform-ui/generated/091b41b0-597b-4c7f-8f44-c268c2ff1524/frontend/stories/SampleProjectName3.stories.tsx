import type { Meta, StoryObj } from '@storybook/react';
import { SampleProjectName3 } from './SampleProjectName3';

const meta: Meta<typeof SampleProjectName3> = {
  title: 'Components/SampleProjectName3',
  component: SampleProjectName3,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof SampleProjectName3>;

export const Default: Story = {
  args: {},
};
