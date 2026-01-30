import type { Meta, StoryObj } from '@storybook/react';
import { SampleFigmaLink } from './SampleFigmaLink';

const meta: Meta<typeof SampleFigmaLink> = {
  title: 'Components/SampleFigmaLink',
  component: SampleFigmaLink,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof SampleFigmaLink>;

export const Default: Story = {
  args: {},
};
