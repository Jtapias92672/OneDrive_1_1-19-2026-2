import type { Meta, StoryObj } from '@storybook/react';
import { Name } from './Name';

const meta: Meta<typeof Name> = {
  title: 'Components/Name',
  component: Name,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Name>;

export const Default: Story = {
  args: {},
};
