import type { Meta, StoryObj } from '@storybook/react';
import { UserEmail } from './UserEmail';

const meta: Meta<typeof UserEmail> = {
  title: 'Components/UserEmail',
  component: UserEmail,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof UserEmail>;

export const Default: Story = {
  args: {},
};
