import type { Meta, StoryObj } from '@storybook/react';
import { PasswordConfirmation } from './PasswordConfirmation';

const meta: Meta<typeof PasswordConfirmation> = {
  title: 'Components/PasswordConfirmation',
  component: PasswordConfirmation,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof PasswordConfirmation>;

export const Default: Story = {
  args: {},
};
