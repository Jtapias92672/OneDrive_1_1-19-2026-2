import type { Meta, StoryObj } from '@storybook/react';
import { SampleProjectName1 } from './SampleProjectName1';

const meta: Meta<typeof SampleProjectName1> = {
  title: 'Components/SampleProjectName1',
  component: SampleProjectName1,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof SampleProjectName1>;

export const Default: Story = {
  args: {},
};
