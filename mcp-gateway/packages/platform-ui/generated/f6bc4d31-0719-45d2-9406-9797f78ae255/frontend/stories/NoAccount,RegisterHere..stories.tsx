import type { Meta, StoryObj } from '@storybook/react';
import { NoAccount,RegisterHere. } from './NoAccount,RegisterHere.';

const meta: Meta<typeof NoAccount,RegisterHere.> = {
  title: 'Components/NoAccount,RegisterHere.',
  component: NoAccount,RegisterHere.,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof NoAccount,RegisterHere.>;

export const Default: Story = {
  args: {},
};
