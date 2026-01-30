import type { Meta, StoryObj } from '@storybook/react';
import { SampleSharePoint } from './SampleSharePoint';

const meta: Meta<typeof SampleSharePoint> = {
  title: 'Components/SampleSharePoint',
  component: SampleSharePoint,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof SampleSharePoint>;

export const Default: Story = {
  args: {},
};
