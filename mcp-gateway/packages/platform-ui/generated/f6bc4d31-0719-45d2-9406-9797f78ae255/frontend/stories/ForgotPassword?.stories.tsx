import type { Meta, StoryObj } from '@storybook/react';
import { ForgotPassword? } from './ForgotPassword?';

const meta: Meta<typeof ForgotPassword?> = {
  title: 'Components/ForgotPassword?',
  component: ForgotPassword?,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof ForgotPassword?>;

export const Default: Story = {
  args: {},
};
