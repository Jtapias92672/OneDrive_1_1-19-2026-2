import type { Meta, StoryObj } from '@storybook/react';
import { PRELIMINARYTESTFORPOC } from './PRELIMINARYTESTFORPOC';

const meta: Meta<typeof PRELIMINARYTESTFORPOC> = {
  title: 'Components/PRELIMINARYTESTFORPOC',
  component: PRELIMINARYTESTFORPOC,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof PRELIMINARYTESTFORPOC>;

export const Default: Story = {
  args: {},
};
