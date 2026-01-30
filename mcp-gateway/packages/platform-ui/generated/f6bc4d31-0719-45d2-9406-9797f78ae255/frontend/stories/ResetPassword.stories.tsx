import type { Meta, StoryObj } from '@storybook/react';
import { ResetPassword } from './ResetPassword';

const meta: Meta<typeof ResetPassword> = {
  title: 'Components/ResetPassword',
  component: ResetPassword,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof ResetPassword>;

export const Default: Story = {
  args: {},
};
