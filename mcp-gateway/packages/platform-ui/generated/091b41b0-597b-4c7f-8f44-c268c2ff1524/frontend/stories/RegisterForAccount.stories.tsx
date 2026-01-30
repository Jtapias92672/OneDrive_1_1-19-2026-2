import type { Meta, StoryObj } from '@storybook/react';
import { RegisterForAccount } from './RegisterForAccount';

const meta: Meta<typeof RegisterForAccount> = {
  title: 'Components/RegisterForAccount',
  component: RegisterForAccount,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof RegisterForAccount>;

export const Default: Story = {
  args: {},
};
