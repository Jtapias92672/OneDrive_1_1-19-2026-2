import type { Meta, StoryObj } from '@storybook/react';
import { SampleProjectName2 } from './SampleProjectName2';

const meta: Meta<typeof SampleProjectName2> = {
  title: 'Components/SampleProjectName2',
  component: SampleProjectName2,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof SampleProjectName2>;

export const Default: Story = {
  args: {},
};
